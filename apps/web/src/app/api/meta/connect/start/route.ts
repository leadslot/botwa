import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const appId = process.env.META_APP_ID
  const configId = process.env.META_CONFIG_ID
  if (!appId) return NextResponse.redirect(new URL('/dashboard/connect?meta=missing_env', req.url))

  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.redirect(new URL('/login', req.url))

  const nonce = crypto.randomUUID().replace(/-/g, '')
  const statePayload = Buffer.from(JSON.stringify({ nonce, businessId: ctx.businessId })).toString('base64url')

  // Persist nonce in DB for verification (no cookies needed)
  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
  await admin.from('oauth_states').upsert({ nonce, business_id: ctx.businessId, created_at: new Date().toISOString() })

  const origin = req.nextUrl.origin
  const redirectUri = `${origin}/api/meta/connect/callback`

  const scopes = [
    'pages_show_list',
    'pages_manage_metadata',
    'pages_messaging',
    'instagram_business_basic',
    'instagram_business_manage_messages',
    'instagram_manage_comments',
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
