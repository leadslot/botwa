/**
 * POST /api/agenda/appointments
 * Creates a pending appointment and returns a Mercado Pago payment link.
 * Called by the bot when customer agrees to a time slot.
 *
 * Body: { business_id, service_id, customer_name, customer_phone, start_at, deposit_amount }
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    business_id,
    service_id,
    service_name,
    customer_name,
    customer_phone,
    customer_email,
    start_at,
    deposit_amount,
    total_amount,
    notes,
  } = body

  if (!business_id || !start_at || !service_name) {
    return NextResponse.json({ error: 'business_id, start_at y service_name requeridos' }, { status: 400 })
  }

  // Get service duration to calculate end_at
  const adminClient = getAdminClient()
  let durationMinutes = 60
  if (service_id) {
    const { data: svc } = await adminClient
      .from('agenda_services')
      .select('duration_minutes')
      .eq('id', service_id)
      .single()
    if (svc) durationMinutes = svc.duration_minutes
  }

  const startDate = new Date(start_at)
  const endDate   = new Date(startDate.getTime() + durationMinutes * 60000)

  // Create Mercado Pago preference
  let mpPreferenceId: string | null = null
  let mpInitPoint: string | null = null

  const depositArs = deposit_amount ?? 0

  // Get business MP token (their own account)
  const { data: mpConn } = await adminClient
    .from('channel_connections')
    .select('metadata')
    .eq('business_id', business_id)
    .eq('channel', 'mercadopago')
    .eq('status', 'active')
    .single()

  const mpToken = (mpConn?.metadata as Record<string,string>)?.access_token ?? process.env.MP_ACCESS_TOKEN

  if (depositArs > 0 && mpToken) {
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://responbot.com.ar'
      const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${mpToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: [{
            title: `Seña: ${service_name}${customer_name ? ` - ${customer_name}` : ''}`,
            quantity: 1,
            unit_price: Number(depositArs),
            currency_id: 'ARS',
          }],
          payer: customer_email ? { email: customer_email } : undefined,
          back_urls: {
            success: `${appUrl}/agenda/confirmado`,
            failure: `${appUrl}/agenda/cancelado`,
            pending: `${appUrl}/agenda/pendiente`,
          },
          auto_return: 'approved',
          notification_url: `${appUrl}/api/agenda/mp-webhook`,
          metadata: { appointment_temp: `${business_id}|${service_name}|${start_at}|${customer_phone ?? ''}` },
          expires: true,
          expiration_date_to: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // expira en 30 min
        }),
      })
      const mpData = await mpRes.json()
      mpPreferenceId = mpData.id ?? null
      mpInitPoint = mpData.init_point ?? null
    } catch (e) {
      console.error('MP preference error:', e)
    }
  }

  // Create appointment
  const { data: appt, error } = await adminClient
    .from('appointments')
    .insert({
      business_id,
      service_id: service_id ?? null,
      service_name,
      customer_name: customer_name ?? null,
      customer_phone: customer_phone ?? null,
      customer_email: customer_email ?? null,
      start_at: startDate.toISOString(),
      end_at: endDate.toISOString(),
      status: depositArs > 0 ? 'pending_payment' : 'confirmed',
      deposit_amount: depositArs || null,
      total_amount: total_amount ?? null,
      mp_preference_id: mpPreferenceId,
      notes: notes ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    appointment: appt,
    payment_url: mpInitPoint,
    expires_in_minutes: 30,
  })
}

// GET — list appointments for dashboard
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const businessId = searchParams.get('business_id')
  if (!businessId) return NextResponse.json({ error: 'business_id requerido' }, { status: 400 })

  const { data } = await getAdminClient()
    .from('appointments')
    .select('*, agenda_services(name, color)')
    .eq('business_id', businessId)
    .order('start_at', { ascending: true })
    .gte('start_at', new Date().toISOString())
    .limit(50)

  return NextResponse.json({ appointments: data ?? [] })
}
