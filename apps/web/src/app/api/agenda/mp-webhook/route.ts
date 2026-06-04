/**
 * POST /api/agenda/mp-webhook
 * Receives Mercado Pago payment notifications.
 * On approved payment: confirms appointment + creates Google Calendar event + notifies via WhatsApp.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )
}

async function createGCalEvent(businessId: string, appt: Record<string, unknown>) {
  const adminClient = getAdminClient()
  const { data: calConn } = await adminClient
    .from('channel_connections')
    .select('metadata')
    .eq('business_id', businessId)
    .eq('channel', 'calendar_google')
    .eq('status', 'active')
    .single()

  if (!calConn?.metadata) return null

  const meta = calConn.metadata as Record<string, string>
  let token = meta.access_token

  // Refresh if expired
  if (meta.expires_at && new Date(meta.expires_at) < new Date() && meta.refresh_token) {
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: meta.refresh_token,
        grant_type: 'refresh_token',
      }),
    })
    const rd = await r.json()
    if (rd.access_token) {
      token = rd.access_token
      await adminClient.from('channel_connections').update({
        metadata: { ...meta, access_token: token, expires_at: new Date(Date.now() + 3600000).toISOString() },
      }).eq('business_id', businessId).eq('channel', 'calendar_google')
    }
  }

  const customerName = appt.customer_name as string ?? 'Cliente'
  const serviceName  = appt.service_name as string
  const depositAmt   = appt.deposit_amount as number

  const event = {
    summary: `${serviceName} — ${customerName}`,
    description: [
      `Turno confirmado con seña vía Responbot`,
      appt.customer_phone ? `Tel: ${appt.customer_phone}` : '',
      depositAmt ? `Seña abonada: $${Number(depositAmt).toLocaleString('es-AR')}` : '',
      appt.notes ? `Nota: ${appt.notes}` : '',
    ].filter(Boolean).join('\n'),
    start: { dateTime: appt.start_at as string, timeZone: 'America/Argentina/Buenos_Aires' },
    end:   { dateTime: appt.end_at as string,   timeZone: 'America/Argentina/Buenos_Aires' },
    colorId: '5', // banana yellow
  }

  const res = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=none',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    }
  )
  const created = await res.json()
  return created.id ?? null
}

export async function POST(req: NextRequest) {
  // Verify MP signature if secret is set
  const secret = process.env.MP_WEBHOOK_SECRET
  if (secret) {
    const xSignature = req.headers.get('x-signature') ?? ''
    const xRequestId = req.headers.get('x-request-id') ?? ''
    const dataId = req.nextUrl.searchParams.get('data.id') ?? ''
    const manifest = `id:${dataId};request-id:${xRequestId};`
    const hmac = crypto.createHmac('sha256', secret).update(manifest).digest('hex')
    const [, ts, , v1] = xSignature.split(',').flatMap(p => p.split('='))
    const toSign = `ts:${ts};v1:${v1};`
    if (toSign !== `ts:${ts};v1:${hmac};`) {
      console.error('[agenda-webhook] HMAC signature mismatch — request rejected')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  const body = await req.json().catch(() => ({}))
  const type = body.type ?? body.action
  const dataId = body.data?.id ?? body.id

  if (!dataId || (type !== 'payment' && !String(type).includes('payment'))) {
    return NextResponse.json({ ok: true }) // ignore non-payment events
  }

  // Fetch payment details from MP
  const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
    headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
  })
  const payment = await mpRes.json()

  if (payment.status !== 'approved') {
    return NextResponse.json({ ok: true }) // not approved yet
  }

  const preferenceId = payment.order?.id ?? payment.preference_id

  // Find appointment by preference_id
  const adminClient = getAdminClient()
  const { data: appt } = await adminClient
    .from('appointments')
    .select('*')
    .eq('mp_preference_id', preferenceId)
    .single()

  if (!appt) {
    console.warn('MP webhook: no appointment found for preference', preferenceId)
    return NextResponse.json({ ok: true })
  }

  if (appt.status === 'confirmed') {
    return NextResponse.json({ ok: true }) // already confirmed
  }

  // Create Google Calendar event
  const gcalEventId = await createGCalEvent(appt.business_id, appt)

  // Confirm appointment
  await adminClient
    .from('appointments')
    .update({
      status: 'confirmed',
      mp_payment_id: String(dataId),
      mp_status: payment.status,
      gcal_event_id: gcalEventId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', appt.id)

  // Notify bot server to send WhatsApp message
  if (process.env.BOT_SERVER_URL && appt.customer_phone) {
    try {
      await fetch(`${process.env.BOT_SERVER_URL}/notify-appointment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-bot-secret': process.env.BOT_SECRET ?? '',
        },
        body: JSON.stringify({
          business_id: appt.business_id,
          phone: appt.customer_phone,
          service_name: appt.service_name,
          start_at: appt.start_at,
          deposit_amount: appt.deposit_amount,
        }),
      })
    } catch (e) {
      console.error('Bot notify error:', e)
    }
  }

  return NextResponse.json({ ok: true })
}
