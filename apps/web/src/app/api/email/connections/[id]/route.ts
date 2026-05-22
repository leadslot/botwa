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
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return null
  const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
  const { data: business } = await adminClient.from('businesses').select('id').eq('user_id', user.id).single()
  return business ? { adminClient, businessId: business.id } : null
}

// PATCH /api/email/connections/[id] — toggle auto_send_enabled
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth()
  if (!auth) return NextResponse.json({ error: 'sin sesion' }, { status: 401 })

  const { id } = await params
  const body = await req.json().catch(() => ({}))

  // Get connection and verify ownership
  const { data: conn } = await auth.adminClient
    .from('channel_connections')
    .select('id, business_id, metadata')
    .eq('id', id)
    .eq('business_id', auth.businessId)
    .single()

  if (!conn) return NextResponse.json({ error: 'no encontrado' }, { status: 404 })

  const updated: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (typeof body.auto_send_enabled === 'boolean') {
    updated.metadata = { ...(conn.metadata ?? {}), auto_send_enabled: body.auto_send_enabled }
  }
  if (typeof body.status === 'string') {
    updated.status = body.status
  }

  const { error } = await auth.adminClient.from('channel_connections').update(updated).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
