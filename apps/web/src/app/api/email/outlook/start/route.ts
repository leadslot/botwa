import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { getVerifiedUser } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const clientId = process.env.MICROSOFT_CLIENT_ID
  if (!clientId) return NextResponse.json({ error: 'MICROSOFT_CLIENT_ID no configurado' }, { status: 500 })

  const user = await getVerifiedUser()
  if (!user) return NextResponse.json({ error: 'sin sesion' }, { status: 401 })

  const cookieStore = await cookies()
  const state = crypto.randomUUID()
  cookieStore.set('outlook_oauth_state', state, { httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 900 })

  const tenant = process.env.MICROSOFT_TENANT_ID || 'common'
  const redirectUri = `${req.nextUrl.origin}/api/email/outlook/callback`
  const url = new URL(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`)
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('response_mode', 'query')
  url.searchParams.set('state', state)
  url.searchParams.set('scope', [
    'offline_access',
    'openid',
    'email',
    'profile',
    'User.Read',
    'Mail.ReadWrite',
    'Mail.Send',
  ].join(' '))

  return NextResponse.json({ url: url.toString() }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
}
