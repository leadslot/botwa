import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/supabase/server'
import { ADDON_CATALOG } from '@/lib/plans'

export async function GET() {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'No auth' }, { status: 401 })
  const { businessId, adminClient } = ctx

  const { data, error } = await adminClient
    .from('addon_requests')
    .select('id, addon_type, addon_label, price, status, created_at')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ requests: data })
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'No auth' }, { status: 401 })
  const { businessId, adminClient } = ctx

  const { addon_type } = await req.json()
  const addon = ADDON_CATALOG.find(a => a.type === addon_type)
  if (!addon) return NextResponse.json({ error: 'Addon inválido' }, { status: 400 })

  // Check no pending request for same type
  const { data: existing } = await adminClient
    .from('addon_requests')
    .select('id')
    .eq('business_id', businessId)
    .eq('addon_type', addon_type)
    .eq('status', 'pendiente')
    .maybeSingle()

  if (existing) return NextResponse.json({ error: 'Ya tenés una solicitud pendiente para este pack' }, { status: 409 })

  const { data, error } = await adminClient
    .from('addon_requests')
    .insert({
      business_id: businessId,
      addon_type: addon.type,
      addon_label: addon.label,
      responses_added: addon.responsesAdded,
      emails_added: addon.emailsAdded,
      price: addon.price,
      status: 'pendiente',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ request: data }, { status: 201 })
}
