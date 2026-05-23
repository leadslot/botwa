import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const appId = process.env.META_APP_ID
  const configId = process.env.META_CONFIG_ID
  if (!appId) return NextResponse.redirect(new URL('/dashboard/connect?meta=missing_env', req.url))

  // Try bid param first (sent from dashboard), fallback to session
  let businessId: string | null = req.nextUrl.searchParams.get('bid')
  if (!businessId) {
    const ctx = await getAuthContext()
    if (!ctx) return NextResponse.redirect(new URL('/login', req.url))
    businessId = ctx.businessId
  }

  const nonce = crypto.randomUUID().replace(/-/g, '')
  const statePayload = Buffer.from(JSON.stringify({ nonce, businessId })).toString('base64url')

  // Persist nonce in DB for verification (best-effort — table may not exist yet)
  try {
    const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
    await admin.from('oauth_states').upsert({ nonce, business_id: businessId, created_at: new Date().toISOString() })
  } catch { /* ignore if table doesn't exist */ }

  const origin = req.nextUrl.origin
  const redirectUri = `${origin}/api/meta/connect/callback`

  const scopes = [
    'pages_show_list',
    'pages_manage_metadata',
    'pages_messaging',
  ]

  const url = new URL('https://www.facebook.com/v20.0/dialog/oauth')
  url.searchParams.set('client_id', appId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('state', statePayload)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', scopes.join(','))
  if (configId) url.searchParams.set('config_id', configId)

  return NextResponse.redirect(url.toString())
}
