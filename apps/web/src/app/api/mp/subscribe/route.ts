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
    .select('id, name')
    .eq('id', businessId)
    .single()
  if (!business) return NextResponse.json({ error: 'Sin negocio' }, { status: 400 })

  const externalRef = `${business.id}:${tier}`

  // Intentar usar plan ID pre-creado en MP
  const { data: mpPlan } = await adminClient
    .from('mp_plans')
    .select('mp_plan_id')
    .eq('plan_tier', tier)
    .maybeSingle()

  let init_point: string | null = null

  if (mpPlan?.mp_plan_id) {
    // Crear suscripción basada en plan existente
    const body = {
      preapproval_plan_id: mpPlan.mp_plan_id,
      reason: `Responbot — ${plan.name}`,
      payer_email: user.email,
      external_reference: externalRef,
      back_url: `${BASE_URL}/dashboard/billing?suscripcion=ok&plan=${tier}`,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: plan.monthlyPrice,
        currency_id: 'ARS',
      },
    }

    const res = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (data.init_point) {
      init_point = data.init_point
      if (data.id) {
        await adminClient.from('businesses').update({ mp_subscription_id: data.id, plan_tier: tier }).eq('id', business.id)
      }
    }
  }

  // Fallback: suscripción sin plan_id previo
  if (!init_point) {
    const body = {
      reason: `Responbot — ${plan.name}`,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: plan.monthlyPrice,
        currency_id: 'ARS',
      },
      payer_email: user.email,
      external_reference: externalRef,
      back_url: `${BASE_URL}/dashboard/billing?suscripcion=ok&plan=${tier}`,
      notification_url: `${BASE_URL}/api/mp/webhook`,
    }

    const res = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (data.init_point) {
      init_point = data.init_point
      if (data.id) {
        await adminClient.from('businesses').update({ mp_subscription_id: data.id, plan_tier: tier }).eq('id', business.id)
      }
    } else {
      console.error('MP subscribe error:', data)
      console.error('MP subscribe error:', data)
    return NextResponse.json({ error: 'Error al crear suscripción. Intentá de nuevo.' }, { status: 500 })
    }
  }

  return NextResponse.json({ init_point })
}
