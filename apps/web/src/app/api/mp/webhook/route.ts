import { createClient } from '@supabase/supabase-js'
import { createHmac } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

function verifySignature(req: NextRequest, rawBody: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET
  if (!secret) return true // sin secret, no verificar
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

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    if (!verifySignature(req, rawBody)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
    const body = JSON.parse(rawBody)
    const { type, data } = body

    // Suscripción recurrente aprobada
    if (type === 'subscription_preapproval') {
      const id = data?.id
      if (!id) return NextResponse.json({ ok: true })

      const res = await fetch(`https://api.mercadopago.com/preapproval/${id}`, {
        headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` }
      })
      const sub = await res.json()

      if (sub.status === 'authorized') {
        const email = sub.payer_email
        // Buscar usuario por email
        const { data: { users } } = await admin.auth.admin.listUsers()
        const user = users.find(u => u.email === email)
        if (user) {
          await admin.from('businesses')
            .update({ is_paid: true, plan: 'monthly' })
            .eq('user_id', user.id)
        }
      }
    }

    // Pago único (primer mes)
    if (type === 'payment') {
      const id = data?.id
      if (!id) return NextResponse.json({ ok: true })

      const res = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
        headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` }
      })
      const payment = await res.json()

      if (payment.status === 'approved') {
        const email = payment.payer?.email
        const externalRef = payment.external_reference // business_id
        if (externalRef) {
          await admin.from('businesses')
            .update({ is_paid: true, plan: 'monthly' })
            .eq('id', externalRef)
        } else if (email) {
          const { data: { users } } = await admin.auth.admin.listUsers()
          const user = users.find(u => u.email === email)
          if (user) {
            await admin.from('businesses')
              .update({ is_paid: true, plan: 'monthly' })
              .eq('user_id', user.id)
          }
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('MP webhook error:', e)
    return NextResponse.json({ ok: true }) // siempre 200 para MP
  }
}
