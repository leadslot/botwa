/**
 * GET /api/mp/callback
 * Handles Mercado Pago OAuth callback.
 * Exchanges code for access_token and stores it per business.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin

  if (error || !code || !state) {
    return NextResponse.redirect(`${appUrl}/dashboard/connect?mp=error`)
  }

  const businessId = state.split(':')[0]
  if (!businessId) {
    return NextResponse.redirect(`${appUrl}/dashboard/connect?mp=invalid_state`)
  }

  // Exchange code for tokens
  const tokenRes = await fetch('https://api.mercadopago.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id:     process.env.MP_APP_ID,
      client_secret: process.env.MP_APP_SECRET,
      code,
      grant_type:    'authorization_code',
      redirect_uri:  `${appUrl}/api/mp/callback`,
    }),
  })

  const tokenData = await tokenRes.json()

  if (!tokenRes.ok || !tokenData.access_token) {
    console.error('MP token exchange error:', tokenData)
    return NextResponse.redirect(`${appUrl}/dashboard/connect?mp=token_error`)
  }

  const { access_token, refresh_token, user_id, public_key } = tokenData

  // Get MP user info
  const userRes = await fetch(`https://api.mercadopago.com/users/${user_id}`, {
    headers: { Authorization: `Bearer ${access_token}` },
  })
  const mpUser = await userRes.json()
  const displayName = mpUser.first_name
    ? `${mpUser.first_name} ${mpUser.last_name ?? ''}`.trim()
    : mpUser.email ?? `MP ${user_id}`

  // Upsert into channel_connections
  await getAdminClient().from('channel_connections').upsert({
    business_id:  businessId,
    channel:      'mercadopago',
    status:       'active',
    external_id:  `mp:${user_id}`,
    display_name: displayName,
    metadata: {
      access_token,
      refresh_token: refresh_token ?? null,
      public_key:    public_key ?? null,
      mp_user_id:    user_id,
      mp_email:      mpUser.email ?? null,
    },
    updated_at: new Date().toISOString(),
  }, { onConflict: 'business_id,channel' })

  return NextResponse.redirect(`${appUrl}/dashboard/connect?mp=connected`)
}
