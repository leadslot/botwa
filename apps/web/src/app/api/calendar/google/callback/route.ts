import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { encryptSecret } from '@/lib/secrets'

export async function GET(req: NextRequest) {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://responbot.com.ar').replace(/\/$/, '')
  const redirectBase = `${appUrl}/dashboard/calendar`
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL(`${redirectBase}?cal=missing_env`))
  }

  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state')
  const businessId = state?.split(':')[0]
  if (!code || !businessId) {
    return NextResponse.redirect(new URL(`${redirectBase}?cal=invalid_state`))
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  const redirectUri = `${appUrl}/api/calendar/google/callback`
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  const tokenData = await tokenRes.json()
  if (!tokenRes.ok || !tokenData.access_token) {
    console.error('GCal token error:', tokenData)
    return NextResponse.redirect(new URL(`${redirectBase}?cal=token_error`))
  }

  const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  })
  const profile = await profileRes.json()
  const email = profile.email ?? 'sin-email'

  const expiresAt = typeof tokenData.expires_in === 'number'
    ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
    : null

  await adminClient.from('channel_connections').upsert({
    business_id: businessId,
    channel: 'calendar_google',
    status: 'active',
    external_id: `gcal:${email}`,
    display_name: `Google Calendar - ${email}`,
    metadata: {
      provider: 'google_calendar',
      email,
      access_token: encryptSecret(tokenData.access_token),
      refresh_token: encryptSecret(tokenData.refresh_token ?? null),
      expires_at: expiresAt,
      scope: tokenData.scope ?? null,
    },
    updated_at: new Date().toISOString(),
  }, { onConflict: 'business_id,channel,external_id' })

  return NextResponse.redirect(new URL(`${redirectBase}?cal=connected`))
}
