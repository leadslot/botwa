import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

async function getAuthContext() {
  const cookieStore = await cookies()
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return null
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
  const { data: business } = await admin.from('businesses').select('id').eq('user_id', user.id).single()
  if (!business) return null
  return { admin, businessId: business.id as string }
}

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

  const { data, error } = await ctx.admin
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
  await ctx.admin
    .from('business_templates')
    .delete()
    .eq('id', id)
    .eq('business_id', ctx.businessId)

  return NextResponse.json({ ok: true })
}
