import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const appId = process.env.META_APP_ID
  if (!appId) return NextResponse.redirect(new URL('/dashboard/connect?wa=missing_env', req.url))

  let businessId: string | null = req.nextUrl.searchParams.get('bid')
  if (!businessId) {
    const ctx = await getAuthContext()
    if (!ctx) return NextResponse.redirect(new URL('/login', req.url))
    businessId = ctx.businessId
  }

  const nonce = crypto.randomUUID().replace(/-/g, '')
  const statePayload = Buffer.from(JSON.stringify({ nonce, businessId })).toString('base64url')

  try {
    const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
    await admin.from('oauth_states').upsert({ nonce, business_id: businessId, created_at: new Date().toISOString() })
  } catch { /* ignore */ }

  const origin = req.nextUrl.origin
  const redirectUri = `${origin}/api/whatsapp-business/connect/callback`

  const url = new URL('https://www.facebook.com/v20.0/dialog/oauth')
  url.searchParams.set('client_id', appId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('state', statePayload)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', 'whatsapp_business_management,whatsapp_business_messaging')

  return NextResponse.redirect(url.toString())
}
