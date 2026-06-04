/**
 * GET /api/mp/connect
 * Starts Mercado Pago OAuth flow for the business to connect their own MP account.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'sin sesion' }, { status: 401 })

  const clientId = process.env.MP_APP_ID
  if (!clientId) return NextResponse.json({ error: 'MP_APP_ID no configurado' }, { status: 500 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin
  const redirectUri = `${appUrl}/api/mp/callback`

  const state = `${ctx.businessId}:${crypto.randomUUID()}`

  const url = new URL('https://auth.mercadopago.com/authorization')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('platform_id', 'mp')
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('state', state)

  return NextResponse.json({ url: url.toString() })
}
