import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { ChannelConnection, ConnectionMetadata } from '@/lib/email/types'
import { refreshGmailToken, getUnreadGmailMessages, createGmailDraft, sendGmailDraft, markGmailRead } from '@/lib/email/gmail'
import { refreshOutlookToken, getUnreadOutlookMessages, createOutlookDraft, sendOutlookDraft, markOutlookRead } from '@/lib/email/outlook'
import { getUnreadICloudMessages, createICloudDraft, sendICloudDraft, markICloudRead } from '@/lib/email/icloud'
import { getUnreadImapMessages, createImapDraft, sendImapSmtp, markImapRead } from '@/lib/email/imap'
import type { ImapConfig } from '@/lib/email/imap'
import { generateChannelResponse } from '@/lib/ai-response'

async function getAuth() {
  const cookieStore = await cookies()
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )
  const { data: { session } } = await authClient.auth.getSession()
  if (!session?.user) return null
  const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
  const { data: business } = await adminClient
    .from('businesses')
    .select('id, name, ai_prompt, price_list')
    .eq('user_id', session.user.id)
    .single()
  return business ? { adminClient, business } : null
}

// Ensure access token is fresh, return valid token
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureFreshToken(
  adminClient: any,
  conn: ChannelConnection,
  meta: ConnectionMetadata
): Promise<string> {
  const now = new Date()
  const expiresAt = meta.expires_at ? new Date(meta.expires_at) : new Date(0)
  const isExpired = expiresAt.getTime() - now.getTime() < 5 * 60 * 1000 // refresh 5 min before expiry

  if (!isExpired && meta.access_token) return meta.access_token

  if (!meta.refresh_token) throw new Error('No hay refresh_token para renovar acceso')

  let refreshed: { access_token: string; expires_at: string }
  if (meta.provider === 'gmail') {
    refreshed = await refreshGmailToken(meta.refresh_token)
  } else if (meta.provider === 'outlook') {
    refreshed = await refreshOutlookToken(meta.refresh_token)
  } else {
    throw new Error('Provider no soporta token refresh')
  }

  // Save refreshed token back
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminClient as any).from('channel_connections').update({
    metadata: { ...meta, access_token: refreshed.access_token, expires_at: refreshed.expires_at },
    updated_at: new Date().toISOString(),
  }).eq('id', conn.id)

  return refreshed.access_token
}

export async function POST() {
  const auth = await getAuth()
  if (!auth) return NextResponse.json({ error: 'sin sesion' }, { status: 401 })

  const { adminClient, business } = auth

  // Get all active email connections
  const { data: connections } = await adminClient
    .from('channel_connections')
    .select('id, channel, status, external_id, display_name, metadata')
    .eq('business_id', business.id)
    .eq('channel', 'email')
    .eq('status', 'active')

  if (!connections?.length) return NextResponse.json({ processed: 0, drafts: 0 })

  let totalDrafts = 0
  const errors: string[] = []

  for (const conn of connections as ChannelConnection[]) {
    const meta = conn.metadata as ConnectionMetadata
    if (!meta?.provider) continue

    try {
      const autoSend = Boolean(meta.auto_send_enabled)

      if (meta.provider === 'gmail') {
        const token = await ensureFreshToken(adminClient, conn, meta)
        const messages = await getUnreadGmailMessages(token, 5)

        for (const msg of messages) {
          // Skip if already processed
          const { data: existing } = await adminClient
            .from('email_drafts')
            .select('id')
            .eq('business_id', business.id)
            .eq('provider', 'gmail')
            .eq('message_id', msg.messageId)
            .single()
          if (existing) continue

          const draftBody = await generateChannelResponse(
            `De: ${msg.fromName} <${msg.fromEmail}>\nAsunto: ${msg.subject}\n\n${msg.bodyText || msg.snippet}`,
            business,
            'email'
          )

          let draftProviderId: string | null = null
          let status = 'pending'

          if (autoSend) {
            await sendGmailDraft(token, await createGmailDraft(token, msg.fromEmail, msg.subject, draftBody, msg.threadId))
            status = 'auto_sent'
          } else {
            draftProviderId = await createGmailDraft(token, msg.fromEmail, msg.subject, draftBody, msg.threadId)
          }

          await markGmailRead(token, msg.messageId)
          await adminClient.from('email_drafts').insert({
            business_id: business.id,
            connection_id: conn.id,
            provider: 'gmail',
            message_id: msg.messageId,
            thread_id: msg.threadId ?? null,
            subject: msg.subject,
            from_email: msg.fromEmail,
            from_name: msg.fromName,
            original_snippet: msg.snippet,
            draft_body: draftBody,
            draft_provider_id: draftProviderId,
            status,
            auto_sent: autoSend,
          })
          totalDrafts++
        }
      } else if (meta.provider === 'outlook') {
        const token = await ensureFreshToken(adminClient, conn, meta)
        const messages = await getUnreadOutlookMessages(token, 5)

        for (const msg of messages) {
          const { data: existing } = await adminClient
            .from('email_drafts')
            .select('id')
            .eq('business_id', business.id)
            .eq('provider', 'outlook')
            .eq('message_id', msg.messageId)
            .single()
          if (existing) continue

          const draftBody = await generateChannelResponse(
            `De: ${msg.fromName} <${msg.fromEmail}>\nAsunto: ${msg.subject}\n\n${msg.bodyText || msg.snippet}`,
            business,
            'email'
          )

          let draftProviderId: string | null = null
          let status = 'pending'

          if (autoSend) {
            const did = await createOutlookDraft(token, msg.fromEmail, msg.subject, draftBody, msg.threadId)
            await sendOutlookDraft(token, did)
            status = 'auto_sent'
          } else {
            draftProviderId = await createOutlookDraft(token, msg.fromEmail, msg.subject, draftBody, msg.threadId)
          }

          await markOutlookRead(token, msg.messageId)
          await adminClient.from('email_drafts').insert({
            business_id: business.id,
            connection_id: conn.id,
            provider: 'outlook',
            message_id: msg.messageId,
            thread_id: msg.threadId ?? null,
            subject: msg.subject,
            from_email: msg.fromEmail,
            from_name: msg.fromName,
            original_snippet: msg.snippet,
            draft_body: draftBody,
            draft_provider_id: draftProviderId,
            status,
            auto_sent: autoSend,
          })
          totalDrafts++
        }
      } else if (meta.provider === 'icloud' && meta.email && meta.app_password) {
        const messages = await getUnreadICloudMessages(meta.email, meta.app_password, 5)

        for (const msg of messages) {
          const { data: existing } = await adminClient
            .from('email_drafts')
            .select('id')
            .eq('business_id', business.id)
            .eq('provider', 'icloud')
            .eq('message_id', msg.messageId)
            .single()
          if (existing) continue

          const draftBody = await generateChannelResponse(
            `De: ${msg.fromName} <${msg.fromEmail}>\nAsunto: ${msg.subject}\n\n${msg.bodyText || msg.snippet}`,
            business,
            'email'
          )

          let draftProviderId: string | null = null
          let status = 'pending'

          if (autoSend) {
            await sendICloudDraft(meta.email, meta.app_password, msg.fromEmail, msg.subject, draftBody)
            status = 'auto_sent'
          } else {
            draftProviderId = await createICloudDraft(meta.email, meta.app_password, msg.fromEmail, msg.subject, draftBody)
          }

          await markICloudRead(meta.email, meta.app_password, [msg.messageId])
          await adminClient.from('email_drafts').insert({
            business_id: business.id,
            connection_id: conn.id,
            provider: 'icloud',
            message_id: msg.messageId,
            subject: msg.subject,
            from_email: msg.fromEmail,
            from_name: msg.fromName,
            original_snippet: msg.snippet,
            draft_body: draftBody,
            draft_provider_id: draftProviderId,
            status,
            auto_sent: autoSend,
          })
          totalDrafts++
        }
      } else if (meta.provider === 'imap' && meta.email && meta.app_password && meta.imap_host && meta.smtp_host) {
        const cfg: ImapConfig = {
          email: meta.email,
          password: meta.app_password,
          imap_host: meta.imap_host,
          imap_port: meta.imap_port ?? 993,
          smtp_host: meta.smtp_host,
          smtp_port: meta.smtp_port ?? 587,
        }
        const messages = await getUnreadImapMessages(cfg, 5)

        for (const msg of messages) {
          const { data: existing } = await adminClient
            .from('email_drafts')
            .select('id')
            .eq('business_id', business.id)
            .eq('provider', 'imap')
            .eq('message_id', msg.messageId)
            .single()
          if (existing) continue

          const draftBody = await generateChannelResponse(
            `De: ${msg.fromName} <${msg.fromEmail}>\nAsunto: ${msg.subject}\n\n${msg.bodyText || msg.snippet}`,
            business,
            'email'
          )

          let draftProviderId: string | null = null
          let status = 'pending'

          if (autoSend) {
            await sendImapSmtp(cfg, msg.fromEmail, msg.subject, draftBody)
            status = 'auto_sent'
          } else {
            draftProviderId = await createImapDraft(cfg, msg.fromEmail, msg.subject, draftBody)
          }

          await markImapRead(cfg, [msg.messageId])
          await adminClient.from('email_drafts').insert({
            business_id: business.id,
            connection_id: conn.id,
            provider: 'imap',
            message_id: msg.messageId,
            subject: msg.subject,
            from_email: msg.fromEmail,
            from_name: msg.fromName,
            original_snippet: msg.snippet,
            draft_body: draftBody,
            draft_provider_id: draftProviderId,
            status,
            auto_sent: autoSend,
          })
          totalDrafts++
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[email/process] ${conn.external_id}:`, msg)
      errors.push(`${conn.display_name ?? conn.external_id}: ${msg}`)
    }
  }

  return NextResponse.json({ processed: connections.length, drafts: totalDrafts, errors })
}
