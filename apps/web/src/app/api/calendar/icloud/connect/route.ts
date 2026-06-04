import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/supabase/server'
import { encryptSecret } from '@/lib/secrets'

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'sin sesion' }, { status: 401 })

  // Solo plan gold o addon agenda
  const { data: biz } = await ctx.adminClient
    .from('businesses')
    .select('plan_tier, plan')
    .eq('id', ctx.businessId)
    .single()
  const tier = biz?.plan_tier ?? biz?.plan ?? ''
  const hasAgenda = tier === 'gold' || tier === 'lifetime'
  if (!hasAgenda) return NextResponse.json({ error: 'Plan Gold requerido' }, { status: 403 })

  const { email, app_password } = await req.json()
  if (!email || !app_password)
    return NextResponse.json({ error: 'email y contraseña de app requeridos' }, { status: 400 })

  // Verificar credenciales contra CalDAV de iCloud
  const calDavUrl = `https://caldav.icloud.com/`
  const auth = Buffer.from(`${email}:${app_password}`).toString('base64')
  const testRes = await fetch(calDavUrl, {
    method: 'PROPFIND',
    headers: {
      Authorization: `Basic ${auth}`,
      Depth: '0',
      'Content-Type': 'application/xml',
    },
    body: `<?xml version="1.0" encoding="UTF-8"?>
<d:propfind xmlns:d="DAV:">
  <d:prop><d:current-user-principal/></d:prop>
</d:propfind>`,
  })

  if (testRes.status !== 207 && testRes.status !== 200 && testRes.status !== 401) {
    // 207 = Multi-Status (success), otros códigos = problema de red
    console.error('iCloud CalDAV test status:', testRes.status)
  }

  if (testRes.status === 401) {
    return NextResponse.json({ error: 'Credenciales inválidas. Usá la contraseña de app, no la de iCloud.' }, { status: 401 })
  }

  await ctx.adminClient.from('channel_connections').upsert({
    business_id: ctx.businessId,
    channel: 'calendar_icloud',
    status: 'active',
    external_id: `ical:${email}`,
    display_name: `iCloud Calendar — ${email}`,
    metadata: {
      provider: 'icloud_calendar',
      email,
      app_password: encryptSecret(app_password),
    },
    updated_at: new Date().toISOString(),
  }, { onConflict: 'business_id,channel,external_id' })

  return NextResponse.json({ ok: true })
}
