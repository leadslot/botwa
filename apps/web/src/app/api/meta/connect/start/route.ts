import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const appId = process.env.META_APP_ID
  const configId = process.env.META_CONFIG_ID
  if (!appId) return NextResponse.json({ error: 'META_APP_ID no configurado' }, { status: 500 })

  const cookieStore = await cookies()
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'sin sesion' }, { status: 401 })

  const origin = req.nextUrl.origin
  const redirectUri = `${origin}/api/meta/connect/callback`
  const state = crypto.randomUUID()
  cookieStore.set('meta_oauth_state', state, { httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 900 })

  const scopes = [
    'pages_show_list',
    'pages_manage_metadata',
    'pages_messaging',
    'pages_read_engagement',
    'instagram_basic',
    'instagram_manage_messages',
  ]

  const url = new URL('https://www.facebook.com/v20.0/dialog/oauth')
  url.searchParams.set('client_id', appId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('state', state)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', scopes.join(','))
  if (configId) url.searchParams.set('config_id', configId)

  return NextResponse.json(
    { url: url.toString() },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  )
}
