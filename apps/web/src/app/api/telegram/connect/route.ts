import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/supabase/server'

async function getAuth() {
  const ctx = await getAuthContext()
  if (!ctx) return null
  return { adminClient: ctx.adminClient, businessId: ctx.businessId }
}

export async function POST(req: NextRequest) {
  const auth = await getAuth()
  if (!auth) return NextResponse.json({ error: 'sin sesion' }, { status: 401 })

  const { token } = await req.json() as { token?: string }
  const botToken = token?.trim()
  if (!botToken) return NextResponse.json({ error: 'token requerido' }, { status: 400 })

  const meRes = await fetch(`https://api.telegram.org/bot${botToken}/getMe`)
  const me = await meRes.json()
  if (!me.ok) return NextResponse.json({ error: 'token invalido' }, { status: 400 })

  const webhookSecret = crypto.randomUUID().replaceAll('-', '')
  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://botwa-app.vercel.app'}/api/telegram/webhook?businessId=${auth.businessId}&secret=${webhookSecret}`
  const hookRes = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: webhookUrl, allowed_updates: ['message'] }),
  })
  const hook = await hookRes.json()
  if (!hook.ok) return NextResponse.json({ error: hook.description || 'no se pudo activar webhook' }, { status: 500 })

  const { error } = await auth.adminClient.from('channel_connections').upsert({
    business_id: auth.businessId,
    channel: 'telegram',
    status: 'active',
    external_id: String(me.result.id),
    display_name: me.result.username ? `@${me.result.username}` : me.result.first_name,
    metadata: {
      bot_id: me.result.id,
      username: me.result.username,
      first_name: me.result.first_name,
      bot_token: botToken,
      webhook_secret: webhookSecret,
    },
    updated_at: new Date().toISOString(),
  }, { onConflict: 'business_id,channel,external_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, username: me.result.username, firstName: me.result.first_name })
}

export async function DELETE() {
  const auth = await getAuth()
  if (!auth) return NextResponse.json({ error: 'sin sesion' }, { status: 401 })

  const { data } = await auth.adminClient
    .from('channel_connections')
    .select('id, metadata')
    .eq('business_id', auth.businessId)
    .eq('channel', 'telegram')
    .eq('status', 'active')
    .limit(1)
    .single()

  const token = (data?.metadata as { bot_token?: string } | null)?.bot_token
  if (token) {
    await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`, { method: 'POST' })
  }

  if (data?.id) {
    await auth.adminClient
      .from('channel_connections')
      .update({ status: 'disconnected', updated_at: new Date().toISOString() })
      .eq('id', data.id)
  }

  return NextResponse.json({ ok: true })
}
