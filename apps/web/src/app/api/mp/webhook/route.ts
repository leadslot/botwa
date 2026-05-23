import { createClient } from '@supabase/supabase-js'
import { createHmac } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { PLANS, normalizePlan, type PlanTier } from '@/lib/plans'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

function verifySignature(req: NextRequest, rawBody: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET
  if (!secret) return true
  const xSignature = req.headers.get('x-signature')
  const xRequestId = req.headers.get('x-request-id')
  const url = new URL(req.url)
  const dataId = url.searchParams.get('data.id') || url.searchParams.get('id') || ''
  if (!xSignature) return false
  const parts = Object.fromEntries(xSignature.split(',').map(p => p.split('=')))
  const ts = parts['ts']
  const v1 = parts['v1']
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`
  const hash = createHmac('sha256', secret).update(manifest).digest('hex')
  return hash === v1
}

// Parsea external_reference:
// "businessId:plan_tier" → suscripción
// "businessId:pack:addon_type" → pago de pack
// "businessId" (legado) → suscripción sin plan_tier
function parseExternalRef(ref: string): { businessId: string; type: 'subscription' | 'pack' | 'firstmonth'; planTier?: PlanTier; addonType?: string } {
  const parts = ref.split(':')
  if (parts.length >= 3 && parts[1] === 'pack') {
    return { businessId: parts[0], type: 'pack', addonType: parts[2] }
  }
  if (parts.length >= 3 && parts[1] === 'firstmonth') {
    return { businessId: parts[0], type: 'firstmonth', planTier: normalizePlan(parts[2]) as PlanTier }
  }
  if (parts.length === 2) {
    return { businessId: parts[0], type: 'subscription', planTier: normalizePlan(parts[1]) as PlanTier }
  }
  return { businessId: parts[0], type: 'subscription', planTier: 'whatsapp' }
}

async function findBusinessByEmail(email: string): Promise<string | null> {
  const { data: { users } } = await admin.auth.admin.listUsers()
  const user = users.find(u => u.email === email)
  if (!user) return null
  const { data: biz } = await admin.from('businesses').select('id').eq('user_id', user.id).single()
  return biz?.id ?? null
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    if (!verifySignature(req, rawBody)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
    const body = JSON.parse(rawBody)
    const { type, data } = body
    const today = new Date().toISOString().split('T')[0]

    // ─── Suscripción recurrente ───────────────────────────────────────────────
    if (type === 'subscription_preapproval') {
      const id = data?.id
      if (!id) return NextResponse.json({ ok: true })

      const res = await fetch(`https://api.mercadopago.com/preapproval/${id}`, {
        headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` }
      })
      const sub = await res.json()
      const externalRef: string = sub.external_reference || ''

      // Determinar businessId y plan_tier
      let businessId: string | null = null
      let planTier: PlanTier = 'whatsapp'

      if (externalRef) {
        const parsed = parseExternalRef(externalRef)
        businessId = parsed.businessId
        if (parsed.planTier) planTier = parsed.planTier
      }

      // Fallback: buscar por email del pagador
      if (!businessId && sub.payer_email) {
        businessId = await findBusinessByEmail(sub.payer_email)
      }

      if (!businessId) return NextResponse.json({ ok: true })

      if (sub.status === 'authorized') {
        await admin.from('businesses').update({
          is_paid: true,
          plan: 'monthly',
          plan_tier: planTier,
          mp_subscription_id: id,
          cycle_start_date: today,
          monthly_responses_used: 0,
          monthly_emails_used: 0,
        }).eq('id', businessId)
      }

      if (sub.status === 'cancelled' || sub.status === 'paused') {
        await admin.from('businesses').update({
          is_paid: false,
          mp_subscription_id: null,
        }).eq('id', businessId)
      }
    }

    // ─── Pago único (primer mes o pack) ──────────────────────────────────────
    if (type === 'payment') {
      const id = data?.id
      if (!id) return NextResponse.json({ ok: true })

      const res = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
        headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` }
      })
      const payment = await res.json()

      if (payment.status !== 'approved') return NextResponse.json({ ok: true })

      const externalRef: string = payment.external_reference || ''

      if (externalRef) {
        const parsed = parseExternalRef(externalRef)

        // Pack adicional
        if (parsed.type === 'pack' && parsed.addonType) {
          // Marcar la addon_request como activa y acreditar extras
          const { data: addonReq } = await admin
            .from('addon_requests')
            .select('*')
            .eq('business_id', parsed.businessId)
            .eq('addon_type', parsed.addonType)
            .eq('status', 'pendiente')
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          if (addonReq) {
            const { data: biz } = await admin
              .from('businesses')
              .select('extra_responses, extra_emails')
              .eq('id', parsed.businessId)
              .single()

            if (biz) {
              await admin.from('businesses').update({
                extra_responses: (biz.extra_responses || 0) + addonReq.responses_added,
                extra_emails: (biz.extra_emails || 0) + addonReq.emails_added,
              }).eq('id', parsed.businessId)
            }

            await admin.from('addon_requests').update({
              status: 'activo',
              updated_at: new Date().toISOString(),
            }).eq('id', addonReq.id)
          }

          return NextResponse.json({ ok: true })
        }

        // Primer mes con descuento → activar + crear suscripción recurrente automáticamente
        if (parsed.type === 'firstmonth' && parsed.planTier) {
          const plan = PLANS[parsed.planTier]
          await admin.from('businesses').update({
            is_paid: true,
            plan: 'monthly',
            plan_tier: parsed.planTier,
            cycle_start_date: today,
            monthly_responses_used: 0,
            monthly_emails_used: 0,
            first_month_paid: true,
          }).eq('id', parsed.businessId)

          // Crear suscripción recurrente para los meses siguientes
          const { data: biz } = await admin.from('businesses').select('mp_plans(mp_plan_id)').eq('id', parsed.businessId).single() as { data: { mp_plans?: { mp_plan_id: string }[] } | null }
          const { data: mpPlanRow } = await admin.from('mp_plans').select('mp_plan_id').eq('plan_tier', parsed.planTier).maybeSingle()
          const { data: payerBiz } = await admin.from('businesses').select('user_id').eq('id', parsed.businessId).single()
          let payerEmail = payment.payer?.email
          if (!payerEmail && payerBiz?.user_id) {
            const { data: { user } } = await admin.auth.admin.getUserById(payerBiz.user_id)
            payerEmail = user?.email
          }

          if (payerEmail && plan) {
            const subBody: Record<string, unknown> = {
              reason: `Responbot — ${plan.name}`,
              auto_recurring: { frequency: 1, frequency_type: 'months', transaction_amount: plan.monthlyPrice, currency_id: 'ARS' },
              payer_email: payerEmail,
              external_reference: `${parsed.businessId}:${parsed.planTier}`,
              back_url: `https://responbot.com.ar/dashboard/billing`,
              notification_url: `https://responbot.com.ar/api/mp/webhook`,
            }
            if (mpPlanRow?.mp_plan_id) subBody.preapproval_plan_id = mpPlanRow.mp_plan_id

            const subRes = await fetch('https://api.mercadopago.com/preapproval', {
              method: 'POST',
              headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
              body: JSON.stringify(subBody),
            })
            const subData = await subRes.json()
            if (subData.id) {
              await admin.from('businesses').update({ mp_subscription_id: subData.id }).eq('id', parsed.businessId)
            }
          }

          return NextResponse.json({ ok: true })
        }

        // Suscripción directa (sin descuento primer mes)
        await admin.from('businesses').update({
          is_paid: true,
          plan: 'monthly',
          plan_tier: parsed.planTier ?? 'whatsapp',
          cycle_start_date: today,
          monthly_responses_used: 0,
          monthly_emails_used: 0,
        }).eq('id', parsed.businessId)

        return NextResponse.json({ ok: true })
      }

      // Fallback por email (legado)
      const email = payment.payer?.email
      if (email) {
        const businessId = await findBusinessByEmail(email)
        if (businessId) {
          await admin.from('businesses').update({
            is_paid: true,
            plan: 'monthly',
            cycle_start_date: today,
            monthly_responses_used: 0,
            monthly_emails_used: 0,
          }).eq('id', businessId)
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('MP webhook error:', e)
    return NextResponse.json({ ok: true }) // siempre 200 para MP
  }
}
