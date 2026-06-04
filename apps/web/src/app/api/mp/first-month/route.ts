import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/supabase/server'
import { PLANS, normalizePlan, type PlanTier } from '@/lib/plans'

const BASE_URL = 'https://responbot.com.ar'

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { user, businessId, adminClient } = ctx

  const { plan_tier } = await req.json()
  const tier = normalizePlan(plan_tier) as PlanTier
  const plan = PLANS[tier]
  if (!plan) return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })

  const { data: business } = await adminClient
    .from('businesses')
    .select('id, name, first_month_paid')
    .eq('id', businessId)
    .single()
  if (!business) return NextResponse.json({ error: 'Sin negocio' }, { status: 400 })

  // Si ya pagó el primer mes, ir directo a suscripción normal
  if (business.first_month_paid) {
    const res = await fetch(`${BASE_URL}/api/mp/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Pasar auth — el cliente debe hacer esta llamada directamente
      },
      body: JSON.stringify({ plan_tier: tier }),
    })
    const data = await res.json()
    return NextResponse.json(data)
  }

  // Pago único del primer mes al precio promocional
  const preference = {
    items: [{
      title: `Responbot — ${plan.name} (primer mes)`,
      description: `Luego ${plan.priceLabel} por mes`,
      quantity: 1,
      unit_price: plan.firstMonthPrice,
      currency_id: 'ARS',
    }],
    payer: { email: user.email },
    // external_reference: businessId:firstmonth:planTier — el webhook crea la suscripción
    external_reference: `${business.id}:firstmonth:${tier}`,
    back_urls: {
      success: `${BASE_URL}/dashboard/billing?primer_mes=ok&plan=${tier}`,
      failure: `${BASE_URL}/dashboard/billing?primer_mes=error`,
      pending: `${BASE_URL}/dashboard/billing?primer_mes=pendiente`,
    },
    auto_return: 'approved',
    notification_url: `${BASE_URL}/api/mp/webhook`,
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
  if (!data.init_point) {
    console.error('MP first-month error:', data)
    console.error('MP first-month error:', data)
    return NextResponse.json({ error: 'Error al crear preferencia. Intentá de nuevo.' }, { status: 500 })
  }

  return NextResponse.json({ init_point: data.init_point, first_month_price: plan.firstMonthPrice, monthly_price: plan.monthlyPrice })
}
