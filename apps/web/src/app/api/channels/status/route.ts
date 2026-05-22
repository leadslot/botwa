import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const CHANNELS = ['whatsapp', 'whatsapp_api', 'webchat', 'email', 'telegram', 'instagram', 'facebook']

async function getAuth() {
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

export async function POST(req: Request) {
  const auth = await getAuth()
  if (!auth) return NextResponse.json({ error: 'sin sesion' }, { status: 401 })

  const body = await req.json() as { channel?: string; paused?: boolean }
  if (!body.channel || !CHANNELS.includes(body.channel)) {
    return NextResponse.json({ error: 'canal invalido' }, { status: 400 })
  }

  const status = body.paused ? 'paused' : 'active'
  const updatedAt = new Date().toISOString()
  const { data: existing, error: listError } = await auth.adminClient
    .from('channel_connections')
    .select('id')
    .eq('business_id', auth.businessId)
    .eq('channel', body.channel)

  if (listError) return NextResponse.json({ error: listError.message }, { status: 500 })

  if (existing?.length) {
    const { error } = await auth.adminClient
      .from('channel_connections')
      .update({ status, updated_at: updatedAt })
      .eq('business_id', auth.businessId)
      .eq('channel', body.channel)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await auth.adminClient.from('channel_connections').insert({
      business_id: auth.businessId,
      channel: body.channel,
      status,
      external_id: 'default',
      display_name: body.channel,
      updated_at: updatedAt,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, status })
}
