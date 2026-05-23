import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

type MetaPage = {
  id: string
  name: string
  access_token: string
  instagram_business_account?: { id: string; username?: string }
}

export async function GET(req: NextRequest) {
  const appId = process.env.META_APP_ID
  const appSecret = process.env.META_APP_SECRET
  if (!appId || !appSecret) return NextResponse.redirect(new URL('/dashboard/connect?meta=missing_env', req.url))

  const code = req.nextUrl.searchParams.get('code')
  const stateParam = req.nextUrl.searchParams.get('state')
  if (!code || !stateParam) return NextResponse.redirect(new URL('/dashboard/connect?meta=invalid_state', req.url))

  let businessId: string
  try {
    const decoded = JSON.parse(Buffer.from(stateParam, 'base64url').toString())
    businessId = decoded.businessId
    if (!businessId) throw new Error('no businessId')
  } catch {
    return NextResponse.redirect(new URL('/dashboard/connect?meta=invalid_state', req.url))
  }

  const adminClient = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
  const auth = { businessId, adminClient }

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
  accountsUrl.searchParams.set('fields', 'id,name,access_token,instagram_business_account{id,username},connected_instagram_account{id,username}')
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

    // Intentar con instagram_business_account primero, luego connected_instagram_account
    const pageData = page as MetaPage & { connected_instagram_account?: { id: string; username?: string } }
    const instagram = page.instagram_business_account ?? pageData.connected_instagram_account
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
    } else {
      // Fallback: buscar vía /me/instagram_accounts con el user token
      try {
        const igUrl = new URL(`https://graph.facebook.com/v20.0/${page.id}`)
        igUrl.searchParams.set('fields', 'instagram_accounts{id,username}')
        igUrl.searchParams.set('access_token', page.access_token)
        const igRes = await fetch(igUrl)
        const igData = await igRes.json()
        const igAccount = igData.instagram_accounts?.data?.[0]
        if (igAccount?.id) {
          await auth.adminClient.from('channel_connections').upsert({
            business_id: auth.businessId,
            channel: 'instagram',
            status: 'active',
            external_id: igAccount.id,
            display_name: igAccount.username ? `@${igAccount.username}` : 'Instagram',
            metadata: {
              instagram_id: igAccount.id,
              username: igAccount.username,
              page_id: page.id,
              page_access_token: page.access_token,
            },
            updated_at: new Date().toISOString(),
          }, { onConflict: 'business_id,channel,external_id' })
        }
      } catch (e) {
        console.error('Instagram fallback lookup failed:', e)
      }
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
        subscribed_fields: ['messages', 'messaging_postbacks', 'instagram_messages'],
        access_token: pageAccessToken,
      }),
    })
  } catch (error) {
    console.error('Meta subscribe error:', error)
  }
}
