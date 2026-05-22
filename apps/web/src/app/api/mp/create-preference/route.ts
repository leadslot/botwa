import { createServerClient } from '@supabase/ssr'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
  const { data: business } = await admin
    .from('businesses').select('id, name').eq('user_id', user.id).single()
  if (!business) return NextResponse.json({ error: 'Sin negocio' }, { status: 400 })

  const preference = {
    items: [{
      title: 'Responbot - Primer mes',
      quantity: 1,
      unit_price: 49000,
      currency_id: 'ARS',
    }],
    payer: { email: user.email },
    external_reference: business.id,
    back_urls: {
      success: 'https://responbot.vercel.app/dashboard/billing?pago=ok',
      failure: 'https://responbot.vercel.app/dashboard/billing?pago=error',
      pending: 'https://responbot.vercel.app/dashboard/billing?pago=pendiente',
    },
    auto_return: 'approved',
    notification_url: 'https://responbot.vercel.app/api/mp/webhook',
  }

  const res = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(preference),
  })

  const data = await res.json()
  return NextResponse.json({ init_point: data.init_point })
}
