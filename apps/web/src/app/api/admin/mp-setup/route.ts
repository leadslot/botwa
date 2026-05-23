import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/supabase/server'
import { PLANS, PLAN_ORDER } from '@/lib/plans'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'maxijrodriguez09@gmail.com'
const BASE_URL = 'https://responbot.com.ar'

export async function POST() {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'No auth' }, { status: 401 })
  if (ctx.user.email !== ADMIN_EMAIL) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { adminClient } = ctx
  const results: Record<string, { ok: boolean; plan_id?: string; url?: string; error?: string }> = {}

  for (const tier of PLAN_ORDER) {
    const plan = PLANS[tier]

    // Check if already exists
    const { data: existing } = await adminClient
      .from('mp_plans')
      .select('mp_plan_id')
      .eq('plan_tier', tier)
      .maybeSingle()

    if (existing?.mp_plan_id) {
      results[tier] = { ok: true, plan_id: existing.mp_plan_id, error: 'ya existía' }
      continue
    }

    const body = {
      reason: `Responbot — ${plan.name}`,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: plan.monthlyPrice,
        currency_id: 'ARS',
      },
      payment_methods_allowed: {
        payment_types: [{ id: 'credit_card' }, { id: 'debit_card' }],
      },
      back_url: `${BASE_URL}/dashboard/billing`,
    }

    const res = await fetch('https://api.mercadopago.com/preapproval_plan', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await res.json()

    if (data.id) {
      await adminClient.from('mp_plans').upsert({
        plan_tier: tier,
        mp_plan_id: data.id,
        mp_plan_url: data.init_point ?? null,
      }, { onConflict: 'plan_tier' })

      results[tier] = { ok: true, plan_id: data.id, url: data.init_point }
    } else {
      results[tier] = { ok: false, error: JSON.stringify(data) }
    }
  }

  return NextResponse.json({ results })
}

export async function GET() {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'No auth' }, { status: 401 })
  if (ctx.user.email !== ADMIN_EMAIL) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { adminClient } = ctx
  const { data } = await adminClient.from('mp_plans').select('*').order('created_at')
  return NextResponse.json({ plans: data })
}
