import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/supabase/server'

async function getAuth() {
  const ctx = await getAuthContext()
  if (!ctx) return null
  return { adminClient: ctx.adminClient, businessId: ctx.businessId }
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
