import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/supabase/server'

export async function GET() {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data } = await ctx.adminClient
    .from('business_templates')
    .select('*')
    .eq('business_id', ctx.businessId)
    .order('created_at', { ascending: true })

  return NextResponse.json({ templates: data ?? [] })
}

export async function POST(req: Request) {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { title, body, keywords, channel } = await req.json()
  if (!title?.trim() || !body?.trim()) {
    return NextResponse.json({ error: 'Título y cuerpo son requeridos' }, { status: 400 })
  }

  const { data, error } = await ctx.adminClient
    .from('business_templates')
    .insert({
      business_id: ctx.businessId,
      title: title.trim(),
      body: body.trim(),
      keywords: Array.isArray(keywords) ? keywords.map((k: string) => k.trim().toLowerCase()).filter(Boolean) : [],
      channel: channel || 'all',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ template: data })
}
