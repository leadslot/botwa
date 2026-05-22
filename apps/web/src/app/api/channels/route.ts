import { NextResponse } from 'next/server'
import { getVerifiedUser } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

async function getAuth() {
  const user = await getVerifiedUser()
  if (!user) return null
  const adminClient = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
  const { data: business } = await adminClient
    .from('businesses')
    .select('id, enabled_channels, plan_tier')
    .eq('user_id', user.id)
    .single()
  return business ? { adminClient, business } : null
}

export async function GET() {
  const auth = await getAuth()
  if (!auth) return NextResponse.json({ channels: [] })

  const { data } = await auth.adminClient
    .from('channel_connections')
    .select('id, channel, status, display_name, external_id, metadata, updated_at')
    .eq('business_id', auth.business.id)
    .order('channel')

  const safeChannels = (data ?? []).map((channel) => {
    const metadata = { ...(channel.metadata ?? {}) }
    delete metadata.bot_token
    delete metadata.webhook_secret
    delete metadata.access_token
    delete metadata.refresh_token
    delete metadata.permanent_token
    delete metadata.expires_at
    delete metadata.app_password
    delete metadata.smtp_password
    delete metadata.imap_password
    return { ...channel, metadata }
  })

  return NextResponse.json({
    enabledChannels: auth.business.enabled_channels ?? ['whatsapp'],
    planTier: auth.business.plan_tier ?? 'whatsapp',
    channels: safeChannels,
  })
}

export async function POST(req: Request) {
  const auth = await getAuth()
  if (!auth) return NextResponse.json({ error: 'sin sesion' }, { status: 401 })

  const body = await req.json() as { channel?: string; status?: string; displayName?: string; externalId?: string }
  if (!body.channel) return NextResponse.json({ error: 'channel requerido' }, { status: 400 })

  const { error } = await auth.adminClient
    .from('channel_connections')
    .upsert({
      business_id: auth.business.id,
      channel: body.channel,
      status: body.status ?? 'active',
      display_name: body.displayName ?? null,
      external_id: body.externalId ?? 'default',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'business_id,channel,external_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
