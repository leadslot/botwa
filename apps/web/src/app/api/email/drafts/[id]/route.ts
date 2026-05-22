import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import type { ConnectionMetadata } from '@/lib/email/types'
import { refreshGmailToken, sendGmailDraft } from '@/lib/email/gmail'
import { refreshOutlookToken, sendOutlookDraft } from '@/lib/email/outlook'
import { sendICloudDraft } from '@/lib/email/icloud'
import { sendImapSmtp } from '@/lib/email/imap'
import type { ImapConfig } from '@/lib/email/imap'

async function getAuth() {
  const cookieStore = await cookies()
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return null
  const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
  const { data: business } = await adminClient.from('businesses').select('id').eq('user_id', user.id).single()
  return business ? { adminClient, businessId: business.id } : null
}

// PATCH /api/email/drafts/[id] — action: 'send' | 'discard'
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth()
  if (!auth) return NextResponse.json({ error: 'sin sesion' }, { status: 401 })

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const action = body.action as 'send' | 'discard'
  if (!action) return NextResponse.json({ error: 'action requerido' }, { status: 400 })

  const { data: draft } = await auth.adminClient
    .from('email_drafts')
    .select('id, business_id, connection_id, provider, from_email, subject, draft_body, draft_provider_id, status')
    .eq('id', id)
    .eq('business_id', auth.businessId)
    .single()

  if (!draft) return NextResponse.json({ error: 'no encontrado' }, { status: 404 })
  if (draft.status === 'sent' || draft.status === 'auto_sent') {
    return NextResponse.json({ error: 'ya fue enviado' }, { status: 400 })
  }

  if (action === 'discard') {
    await auth.adminClient.from('email_drafts').update({ status: 'discarded', updated_at: new Date().toISOString() }).eq('id', id)
    return NextResponse.json({ ok: true })
  }

  if (action === 'send') {
    // Get connection metadata for tokens
    const { data: conn } = await auth.adminClient
      .from('channel_connections')
      .select('metadata')
      .eq('id', draft.connection_id)
      .single()

    const meta = conn?.metadata as ConnectionMetadata | undefined

    try {
      if (draft.provider === 'gmail' && meta?.access_token) {
        let token = meta.access_token
        // Refresh if needed
        if (meta.refresh_token) {
          try {
            const refreshed = await refreshGmailToken(meta.refresh_token)
            token = refreshed.access_token
          } catch {}
        }
        if (draft.draft_provider_id) {
          await sendGmailDraft(token, draft.draft_provider_id)
        } else {
          // Draft wasn't saved in Gmail — create and send directly
          const { createGmailDraft } = await import('@/lib/email/gmail')
          const draftId = await createGmailDraft(token, draft.from_email, draft.subject, draft.draft_body)
          await sendGmailDraft(token, draftId)
        }
      } else if (draft.provider === 'outlook' && meta?.access_token) {
        let token = meta.access_token
        if (meta.refresh_token) {
          try {
            const refreshed = await refreshOutlookToken(meta.refresh_token)
            token = refreshed.access_token
          } catch {}
        }
        if (draft.draft_provider_id) {
          await sendOutlookDraft(token, draft.draft_provider_id)
        } else {
          const { createOutlookDraft } = await import('@/lib/email/outlook')
          const draftId = await createOutlookDraft(token, draft.from_email, draft.subject, draft.draft_body)
          await sendOutlookDraft(token, draftId)
        }
      } else if (draft.provider === 'icloud' && meta?.email && meta?.app_password) {
        await sendICloudDraft(meta.email, meta.app_password, draft.from_email, draft.subject, draft.draft_body)
      } else if (draft.provider === 'imap' && meta?.email && meta?.app_password && meta?.imap_host && meta?.smtp_host) {
        const cfg: ImapConfig = {
          email: meta.email,
          password: meta.app_password,
          imap_host: meta.imap_host,
          imap_port: meta.imap_port ?? 993,
          smtp_host: meta.smtp_host,
          smtp_port: meta.smtp_port ?? 587,
        }
        await sendImapSmtp(cfg, draft.from_email, draft.subject, draft.draft_body)
      } else {
        return NextResponse.json({ error: 'No hay conexion activa para enviar' }, { status: 400 })
      }

      await auth.adminClient.from('email_drafts').update({
        status: 'sent',
        updated_at: new Date().toISOString(),
      }).eq('id', id)

      return NextResponse.json({ ok: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al enviar'
      return NextResponse.json({ error: message }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'action invalido' }, { status: 400 })
}
