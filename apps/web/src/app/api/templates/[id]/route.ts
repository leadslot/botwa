import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/supabase/server'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const { title, body, keywords, channel } = await req.json()

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (title !== undefined) updates.title = title.trim()
  if (body !== undefined) updates.body = body.trim()
  if (keywords !== undefined) updates.keywords = Array.isArray(keywords)
    ? keywords.map((k: string) => k.trim().toLowerCase()).filter(Boolean)
    : []
  if (channel !== undefined) updates.channel = channel

  const { data, error } = await ctx.adminClient
    .from('business_templates')
    .update(updates)
    .eq('id', id)
    .eq('business_id', ctx.businessId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ template: data })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  await ctx.adminClient
    .from('business_templates')
    .delete()
    .eq('id', id)
    .eq('business_id', ctx.businessId)

  return NextResponse.json({ ok: true })
}
