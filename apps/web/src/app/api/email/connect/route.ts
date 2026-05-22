import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

async function getAuth() {
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
  return business ? { adminClient, businessId: business.id } : null
}

export async function DELETE(req: NextRequest) {
  const auth = await getAuth()
  if (!auth) return NextResponse.json({ error: 'sin sesion' }, { status: 401 })

  const provider = req.nextUrl.searchParams.get('provider')
  let query = auth.adminClient
    .from('channel_connections')
    .update({ status: 'disconnected', updated_at: new Date().toISOString() })
    .eq('business_id', auth.businessId)
    .eq('channel', 'email')

  if (provider === 'gmail') query = query.like('external_id', 'gmail:%')
  if (provider === 'outlook') query = query.like('external_id', 'outlook:%')
  if (provider === 'icloud') query = query.like('external_id', 'icloud:%')

  const { error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function POST(req: NextRequest) {
  const auth = await getAuth()
  if (!auth) return NextResponse.json({ error: 'sin sesion' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const provider = String(body.provider || '').toLowerCase()
  const email = String(body.email || '').trim().toLowerCase()
  const appPassword = String(body.appPassword || '').trim()

  if (provider !== 'icloud') return NextResponse.json({ error: 'proveedor no soportado' }, { status: 400 })
  if (!email.endsWith('@icloud.com') && !email.endsWith('@me.com') && !email.endsWith('@mac.com')) {
    return NextResponse.json({ error: 'usa un email iCloud valido' }, { status: 400 })
  }
  if (appPassword.length < 8) return NextResponse.json({ error: 'falta la contrasena especifica de app' }, { status: 400 })

  const { error } = await auth.adminClient.from('channel_connections').upsert({
    business_id: auth.businessId,
    channel: 'email',
    status: 'active',
    external_id: `icloud:${email}`,
    display_name: `iCloud - ${email}`,
    metadata: {
      provider: 'icloud',
      email,
      app_password: appPassword,
      auth_type: 'app_password',
      imap_host: 'imap.mail.me.com',
      imap_port: 993,
      smtp_host: 'smtp.mail.me.com',
      smtp_port: 587,
      mode: 'drafts_first',
      auto_send_enabled: false,
    },
    updated_at: new Date().toISOString(),
  }, { onConflict: 'business_id,channel,external_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
