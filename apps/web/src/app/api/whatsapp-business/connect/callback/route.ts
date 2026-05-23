import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const appId = process.env.META_APP_ID
  const appSecret = process.env.META_APP_SECRET
  if (!appId || !appSecret) return NextResponse.redirect(new URL('/dashboard/connect?wa=missing_env', req.url))

  const code = req.nextUrl.searchParams.get('code')
  const stateParam = req.nextUrl.searchParams.get('state')
  if (!code || !stateParam) return NextResponse.redirect(new URL('/dashboard/connect?wa=invalid_state', req.url))

  let businessId: string
  try {
    const decoded = JSON.parse(Buffer.from(stateParam, 'base64url').toString())
    businessId = decoded.businessId
    if (!businessId) throw new Error('no businessId')
  } catch {
    return NextResponse.redirect(new URL('/dashboard/connect?wa=invalid_state', req.url))
  }

  const adminClient = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

  const origin = req.nextUrl.origin
  const redirectUri = `${origin}/api/whatsapp-business/connect/callback`

  const tokenUrl = new URL('https://graph.facebook.com/v20.0/oauth/access_token')
  tokenUrl.searchParams.set('client_id', appId)
  tokenUrl.searchParams.set('client_secret', appSecret)
  tokenUrl.searchParams.set('redirect_uri', redirectUri)
  tokenUrl.searchParams.set('code', code)

  const tokenRes = await fetch(tokenUrl)
  const tokenData = await tokenRes.json()
  if (!tokenRes.ok || !tokenData.access_token) {
    console.error('WA token error:', tokenData)
    return NextResponse.redirect(new URL('/dashboard/connect?wa=token_error', req.url))
  }

  const accessToken: string = tokenData.access_token

  // Fetch WhatsApp Business Accounts linked to this user token
  const wabaUrl = new URL('https://graph.facebook.com/v20.0/me/businesses')
  wabaUrl.searchParams.set('fields', 'id,name,whatsapp_business_accounts{id,name,phone_numbers{id,display_phone_number,verified_name,quality_rating}}')
  wabaUrl.searchParams.set('access_token', accessToken)
  const wabaRes = await fetch(wabaUrl)
  const wabaData = await wabaRes.json()
  console.log('WA_BUSINESSES:', JSON.stringify(wabaData))

  // Also try direct whatsapp_business_accounts endpoint
  const directUrl = new URL('https://graph.facebook.com/v20.0/me/whatsapp_business_accounts')
  directUrl.searchParams.set('fields', 'id,name,phone_numbers{id,display_phone_number,verified_name,quality_rating}')
  directUrl.searchParams.set('access_token', accessToken)
  const directRes = await fetch(directUrl)
  const directData = await directRes.json()
  console.log('WA_DIRECT:', JSON.stringify(directData))

  type PhoneNumber = { id: string; display_phone_number?: string; verified_name?: string; quality_rating?: string }
  type WabaAccount = { id: string; name?: string; phone_numbers?: { data: PhoneNumber[] } }

  const accounts: WabaAccount[] = directData.data ?? []

  if (accounts.length === 0) {
    console.error('No WhatsApp Business Accounts found')
    return NextResponse.redirect(new URL('/dashboard/connect?wa=no_accounts', req.url))
  }

  for (const waba of accounts) {
    const phones = waba.phone_numbers?.data ?? []
    for (const phone of phones) {
      await adminClient.from('channel_connections').upsert({
        business_id: businessId,
        channel: 'whatsapp_api',
        status: 'active',
        external_id: phone.id,
        display_name: phone.verified_name || waba.name || 'WhatsApp Business',
        metadata: {
          access_token: accessToken,
          phone_number_id: phone.id,
          waba_id: waba.id,
          display_phone_number: phone.display_phone_number,
          quality_rating: phone.quality_rating,
          connected_by: 'oauth',
        },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'business_id,channel,external_id' })
    }

    // Subscribe WABA to webhooks
    try {
      await fetch(`https://graph.facebook.com/v20.0/${waba.id}/subscribed_apps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: accessToken }),
      })
    } catch (e) {
      console.error('WA subscribe error:', e)
    }
  }

  return NextResponse.redirect(new URL('/dashboard/connect?wa=connected', req.url))
}
