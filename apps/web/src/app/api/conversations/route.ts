import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(req: NextRequest) {
  try {
    const { number } = await req.json()
    if (!number) return NextResponse.json({ error: 'number requerido' }, { status: 400 })

    const cookieStore = await cookies()
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
    )
    const { data: { session } } = await authClient.auth.getSession()
    if (!session?.user) return NextResponse.json({ error: 'sin sesión' }, { status: 401 })

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )
    const { data: business } = await adminClient.from('businesses').select('id').eq('user_id', session.user.id).single()
    if (!business) return NextResponse.json({ error: 'negocio no encontrado' }, { status: 404 })

    await adminClient
      .from('whatsapp_messages')
      .delete()
      .eq('business_id', business.id)
      .like('from_number', `%${number}%`)

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('/api/conversations DELETE error:', e)
    return NextResponse.json({ error: 'error interno' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies()
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
    )
    const { data: { session } } = await authClient.auth.getSession()
    if (!session?.user) return NextResponse.json({ messages: [] })

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )

    // Get business_id for this user
    const { data: business } = await adminClient
      .from('businesses')
      .select('id')
      .eq('user_id', session.user.id)
      .single()

    if (!business) return NextResponse.json({ messages: [] })

    const { data: messages } = await adminClient
      .from('whatsapp_messages')
      .select('id, from_number, message, direction, created_at, push_name')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false })
      .limit(200)

    return NextResponse.json({ messages: messages ?? [] })
  } catch (e) {
    console.error('/api/conversations error:', e)
    return NextResponse.json({ messages: [] })
  }
}
