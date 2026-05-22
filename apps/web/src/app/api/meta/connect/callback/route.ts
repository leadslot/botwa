import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

type MetaPage = {
  id: string
  name: string
  access_token: string
  instagram_business_account?: { id: string; username?: string }
}

async function getBusinessId() {
  const cookieStore = await cookies()
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )
  const { data: { session } } = await authClient.auth.getSession()
  if (!session?.user) return null
  const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
  const { data: business } = await adminClient.from('businesses').select('id').eq('user_id', session.user.id).single()
  return business ? { businessId: business.id, adminClient } : null
}

export async function GET(req: NextRequest) {
  const appId = process.env.META_APP_ID
  const appSecret = process.env.META_APP_SECRET
  if (!appId || !appSecret) return NextResponse.redirect(new URL('/dashboard/connect?meta=missing_env', req.url))

  const cookieStore = await cookies()
  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state')
  const savedState = cookieStore.get('meta_oauth_state')?.value
  if (!code || !state || state !== savedState) return NextResponse.redirect(new URL('/dashboard/connect?meta=invalid_state', req.url))

  const auth = await getBusinessId()
  if (!auth) return NextResponse.redirect(new URL('/login', req.url))

  const origin = req.nextUrl.origin
  const redirectUri = `${origin}/api/meta/connect/callback`
  const tokenUrl = new URL('https://graph.facebook.com/v20.0/oauth/access_token')
  tokenUrl.searchParams.set('client_id', appId)
  tokenUrl.searchParams.set('client_secret', appSecret)
  tokenUrl.searchParams.set('redirect_uri', redirectUri)
  tokenUrl.searchParams.set('code', code)

  const tokenRes = await fetch(tokenUrl)
  const tokenData = await tokenRes.json()
  if (!tokenRes.ok || !tokenData.access_token) {
    console.error('Meta token error:', tokenData)
    return NextResponse.redirect(new URL('/dashboard/connect?meta=token_error', req.url))
  }

  const accountsUrl = new URL('https://graph.facebook.com/v20.0/me/accounts')
  accountsUrl.searchParams.set('fields', 'id,name,access_token,instagram_business_account{id,username}')
  accountsUrl.searchParams.set('access_token', tokenData.access_token)
  const accountsRes = await fetch(accountsUrl)
  const accountsData = await accountsRes.json()
  const pages = (accountsData.data ?? []) as MetaPage[]

  for (const page of pages) {
    await auth.adminClient.from('channel_connections').upsert({
      business_id: auth.businessId,
      channel: 'facebook',
      status: 'active',
      external_id: page.id,
      display_name: page.name,
      metadata: {
        page_id: page.id,
        page_name: page.name,
        page_access_token: page.access_token,
      },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'business_id,channel,external_id' })

    await subscribePage(page.id, page.access_token)

    const instagram = page.instagram_business_account
    if (instagram?.id) {
      await auth.adminClient.from('channel_connections').upsert({
        business_id: auth.businessId,
        channel: 'instagram',
        status: 'active',
        external_id: instagram.id,
        display_name: instagram.username ? `@${instagram.username}` : 'Instagram',
        metadata: {
          instagram_id: instagram.id,
          username: instagram.username,
          page_id: page.id,
          page_access_token: page.access_token,
        },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'business_id,channel,external_id' })
    }
  }

  return NextResponse.redirect(new URL('/dashboard/connect?meta=connected', req.url))
}

async function subscribePage(pageId: string, pageAccessToken: string) {
  try {
    await fetch(`https://graph.facebook.com/v20.0/${pageId}/subscribed_apps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscribed_fields: ['messages', 'messaging_postbacks'],
        access_token: pageAccessToken,
      }),
    })
  } catch (error) {
    console.error('Meta subscribe error:', error)
  }
}
