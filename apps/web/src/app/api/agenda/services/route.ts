import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/supabase/server'

export async function GET() {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'sin sesion' }, { status: 401 })
  const { data } = await ctx.adminClient
    .from('agenda_services')
    .select('*')
    .eq('business_id', ctx.businessId)
    .eq('active', true)
    .order('created_at')
  return NextResponse.json({ services: data ?? [] })
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'sin sesion' }, { status: 401 })
  const body = await req.json()
  const { name, price, duration_minutes, color } = body
  if (!name) return NextResponse.json({ error: 'nombre requerido' }, { status: 400 })
  const { data, error } = await ctx.adminClient
    .from('agenda_services')
    .insert({ business_id: ctx.businessId, name, price: price || null, duration_minutes: duration_minutes || 60, color: color || '#8B5CF6' })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ service: data })
}

export async function DELETE(req: NextRequest) {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'sin sesion' }, { status: 401 })
  const { id } = await req.json()
  await ctx.adminClient.from('agenda_services').update({ active: false }).eq('id', id).eq('business_id', ctx.businessId)
  return NextResponse.json({ ok: true })
}
