import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) return NextResponse.json({ error: 'GOOGLE_CLIENT_ID no configurado' }, { status: 500 })

  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'sin sesion' }, { status: 401 })

  // Solo plan gold o addon agenda
  const { data: biz } = await ctx.adminClient
    .from('businesses')
    .select('plan_tier, plan')
    .eq('id', ctx.businessId)
    .single()
  const tier = biz?.plan_tier ?? biz?.plan ?? ''
  const hasAgenda = tier === 'gold' || tier === 'lifetime'
  if (!hasAgenda) return NextResponse.json({ error: 'Plan Gold requerido' }, { status: 403 })

  // Encodear businessId en state para recuperarlo en callback (browser no envía auth headers en redirect)
  const state = `${ctx.businessId}:${crypto.randomUUID()}`

  const redirectUri = `https://responbot.com.ar/api/calendar/google/callback`
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('prompt', 'consent')
  url.searchParams.set('state', state)
  url.searchParams.set('scope', [
    'openid',
    'email',
    'profile',
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
  ].join(' '))

  return NextResponse.json({ url: url.toString() })
}
