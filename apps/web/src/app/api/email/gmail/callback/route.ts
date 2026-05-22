import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

async function getBusinessId() {
  const cookieStore = await cookies()
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return null

  const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
  const { data: business } = await adminClient.from('businesses').select('id').eq('user_id', user.id).single()
  return business ? { adminClient, businessId: business.id } : null
}

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) return NextResponse.redirect(new URL('/dashboard/connect?email=missing_google_env', req.url))

  const cookieStore = await cookies()
  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state')
  const savedState = cookieStore.get('gmail_oauth_state')?.value
  if (!code || !state || state !== savedState) return NextResponse.redirect(new URL('/dashboard/connect?email=invalid_state', req.url))

  const auth = await getBusinessId()
  if (!auth) return NextResponse.redirect(new URL('/login', req.url))

  const redirectUri = `${req.nextUrl.origin}/api/email/gmail/callback`
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
    console.error('Gmail token error:', tokenData)
    return NextResponse.redirect(new URL('/dashboard/connect?email=token_error', req.url))
  }

  const profileRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  })
  const profile = await profileRes.json()
  if (!profileRes.ok || !profile.emailAddress) {
    console.error('Gmail profile error:', profile)
    return NextResponse.redirect(new URL('/dashboard/connect?email=profile_error', req.url))
  }

  const expiresAt = typeof tokenData.expires_in === 'number'
    ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
    : null

  await auth.adminClient.from('channel_connections').upsert({
    business_id: auth.businessId,
    channel: 'email',
    status: 'active',
    external_id: `gmail:${profile.emailAddress}`,
    display_name: `Gmail - ${profile.emailAddress}`,
    metadata: {
      provider: 'gmail',
      email: profile.emailAddress,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token ?? null,
      expires_at: expiresAt,
      scope: tokenData.scope ?? null,
      mode: 'drafts_first',
      auto_send_enabled: false,
    },
    updated_at: new Date().toISOString(),
  }, { onConflict: 'business_id,channel,external_id' })

  return NextResponse.redirect(new URL('/dashboard/connect?email=connected', req.url))
}
