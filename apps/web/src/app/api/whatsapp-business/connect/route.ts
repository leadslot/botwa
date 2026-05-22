import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/supabase/server'

type ConnectBody = {
  code?: string
  accessToken?: string
  phoneNumberId?: string
  wabaId?: string
  displayName?: string
}

async function getAuth() {
  const ctx = await getAuthContext()
  if (!ctx) return null
  return { adminClient: ctx.adminClient, businessId: ctx.businessId }
}

export async function GET() {
  const appId = process.env.META_APP_ID
  const configId = process.env.META_WHATSAPP_CONFIG_ID

  if (!appId || !configId) {
    return NextResponse.json({ error: 'Falta configurar META_WHATSAPP_CONFIG_ID en Vercel. El ID actual de Facebook/Instagram no sirve para WhatsApp oficial.' }, { status: 500 })
  }

  const auth = await getAuth()
  if (!auth) return NextResponse.json({ error: 'sin sesion' }, { status: 401 })

  return NextResponse.json({ appId, configId, version: 'v20.0' })
}

export async function POST(req: NextRequest) {
  const auth = await getAuth()
  if (!auth) return NextResponse.json({ error: 'sin sesion' }, { status: 401 })

  const body = await req.json() as ConnectBody
  let accessToken = body.accessToken?.trim()
  let phoneNumberId = body.phoneNumberId?.replace(/\D/g, '')
  let wabaId = body.wabaId?.replace(/\D/g, '')

  if (body.code) {
    const appId = process.env.META_APP_ID
    const appSecret = process.env.META_APP_SECRET
    if (!appId || !appSecret) return NextResponse.json({ error: 'Faltan credenciales Meta en Vercel' }, { status: 500 })

    const tokenUrl = new URL('https://graph.facebook.com/v20.0/oauth/access_token')
    tokenUrl.searchParams.set('client_id', appId)
    tokenUrl.searchParams.set('client_secret', appSecret)
    tokenUrl.searchParams.set('code', body.code)

    const tokenRes = await fetch(tokenUrl)
    const tokenData = await tokenRes.json()
    if (!tokenRes.ok || !tokenData.access_token) {
      return NextResponse.json({ error: tokenData.error?.message || 'Meta no devolvio token del cliente' }, { status: 400 })
    }
    accessToken = tokenData.access_token
  }

  if (!accessToken) {
    return NextResponse.json({ error: 'No se recibio autorizacion de Meta' }, { status: 400 })
  }

  if (!phoneNumberId && wabaId) {
    const phonesRes = await fetch(`https://graph.facebook.com/v20.0/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating&access_token=${encodeURIComponent(accessToken)}`)
    const phones = await phonesRes.json()
    const firstPhone = phones.data?.[0]
    if (firstPhone?.id) phoneNumberId = firstPhone.id
  }

  if (!phoneNumberId) {
    return NextResponse.json({ error: 'Meta no devolvio Phone Number ID. Reintenta el alta oficial de WhatsApp.' }, { status: 400 })
  }

  let displayName = body.displayName?.trim() || 'WhatsApp Business API'
  let displayPhoneNumber: string | null = null
  let qualityRating: string | null = null

  try {
    const verifyRes = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}?fields=display_phone_number,verified_name,quality_rating&access_token=${encodeURIComponent(accessToken)}`)
    const verify = await verifyRes.json()
    if (!verifyRes.ok || verify.error) {
      return NextResponse.json({ error: verify.error?.message || 'Meta no valido el token o phone_number_id' }, { status: 400 })
    }
    displayName = verify.verified_name || displayName
    displayPhoneNumber = verify.display_phone_number || null
    qualityRating = verify.quality_rating || null
  } catch {
    return NextResponse.json({ error: 'no se pudo validar contra Meta' }, { status: 400 })
  }

  const { error } = await auth.adminClient.from('channel_connections').upsert({
    business_id: auth.businessId,
    channel: 'whatsapp_api',
    status: 'active',
    display_name: displayName,
    external_id: phoneNumberId,
    metadata: {
      access_token: accessToken,
      phone_number_id: phoneNumberId,
      waba_id: wabaId || null,
      display_phone_number: displayPhoneNumber,
      quality_rating: qualityRating,
      outbound_templates_enabled: false,
      customer_service_only: true,
      connected_by: 'embedded_signup',
    },
    updated_at: new Date().toISOString(),
  }, { onConflict: 'business_id,channel,external_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (wabaId) await subscribeWaba(wabaId, accessToken)

  return NextResponse.json({ ok: true, displayName, displayPhoneNumber, qualityRating })
}

async function subscribeWaba(wabaId: string, accessToken: string) {
  try {
    await fetch(`https://graph.facebook.com/v20.0/${wabaId}/subscribed_apps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: accessToken }),
    })
  } catch (error) {
    console.error('WhatsApp WABA subscribe error:', error)
  }
}

export async function DELETE() {
  const auth = await getAuth()
  if (!auth) return NextResponse.json({ error: 'sin sesion' }, { status: 401 })

  const { error } = await auth.adminClient
    .from('channel_connections')
    .update({ status: 'disconnected', updated_at: new Date().toISOString() })
    .eq('business_id', auth.businessId)
    .eq('channel', 'whatsapp_api')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
