import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/supabase/server'
import { ADDON_CATALOG } from '@/lib/plans'

const BASE_URL = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '') || 'https://responbot.com.ar'

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { user, businessId, adminClient } = ctx

  const { addon_type } = await req.json()
  const addon = ADDON_CATALOG.find(a => a.type === addon_type)
  if (!addon) return NextResponse.json({ error: 'Pack inválido' }, { status: 400 })

  const { data: business } = await adminClient
    .from('businesses')
    .select('id, name')
    .eq('id', businessId)
    .single()
  if (!business) return NextResponse.json({ error: 'Sin negocio' }, { status: 400 })

  // Guardar solicitud pendiente antes de redirigir
  await adminClient.from('addon_requests').insert({
    business_id: business.id,
    addon_type: addon.type,
    addon_label: addon.label,
    responses_added: addon.responsesAdded,
    emails_added: addon.emailsAdded,
    price: addon.price,
    status: 'pendiente',
  })

  const preference = {
    items: [{
      title: `Responbot — ${addon.label}`,
      quantity: 1,
      unit_price: addon.price,
      currency_id: 'ARS',
    }],
    payer: { email: user.email },
    // external_reference = "businessId:pack:addon_type" para diferenciarlo de suscripciones
    external_reference: `${business.id}:pack:${addon.type}`,
    back_urls: {
      success: `${BASE_URL}/dashboard/billing?pack=ok&addon=${addon.type}`,
      failure: `${BASE_URL}/dashboard/billing?pack=error`,
      pending: `${BASE_URL}/dashboard/billing?pack=pendiente`,
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
    console.error('MP pack preference error:', data)
    return NextResponse.json({ error: 'Error al crear preferencia en MP', detail: data }, { status: 500 })
  }

  return NextResponse.json({ init_point: data.init_point })
}
