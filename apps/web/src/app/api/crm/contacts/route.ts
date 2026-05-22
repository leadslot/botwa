import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

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

export async function GET() {
  const auth = await getAuth()
  if (!auth) return NextResponse.json({ contacts: [] })

  const { data: conversations } = await auth.adminClient
    .from('channel_conversations')
    .select('id, channel, contact_name, contact_handle, status, updated_at')
    .eq('business_id', auth.businessId)
    .order('updated_at', { ascending: false })
    .limit(200)

  const { data: crmContacts } = await auth.adminClient
    .from('crm_contacts')
    .select('id, name, phone, email, source_channel, stage, tags, notes, updated_at')
    .eq('business_id', auth.businessId)
    .order('updated_at', { ascending: false })
    .limit(200)

  return NextResponse.json({
    contacts: conversations ?? [],
    crmContacts: crmContacts ?? [],
  })
}

export async function POST(request: Request) {
  const auth = await getAuth()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const name = typeof body.name === 'string' ? body.name.trim() : null
  const handle = typeof body.handle === 'string' ? body.handle.trim() : null
  const sourceChannel = typeof body.channel === 'string' ? body.channel.trim().toLowerCase() : null
  const stage = typeof body.stage === 'string' ? body.stage.trim() : 'Nuevo'
  const notes = typeof body.notes === 'string' ? body.notes.trim() : null
  const tags = Array.isArray(body.tags) ? body.tags.filter((tag: unknown) => typeof tag === 'string') : []

  const phone = handle && /^[+0-9\s()-]+$/.test(handle) ? handle : null
  const email = handle && handle.includes('@') && !handle.startsWith('@') ? handle : null

  const { data, error } = await auth.adminClient
    .from('crm_contacts')
    .insert({
      business_id: auth.businessId,
      name,
      phone,
      email,
      source_channel: sourceChannel,
      stage,
      tags,
      notes,
    })
    .select('id, name, phone, email, source_channel, stage, tags, notes, updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ contact: data })
}
