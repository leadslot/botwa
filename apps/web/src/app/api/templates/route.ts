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

export async function GET() {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data } = await ctx.admin
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

  const { data, error } = await ctx.admin
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
