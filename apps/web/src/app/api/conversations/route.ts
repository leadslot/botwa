import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

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
      .select('id, from_number, message, direction, created_at')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false })
      .limit(200)

    return NextResponse.json({ messages: messages ?? [] })
  } catch (e) {
    console.error('/api/conversations error:', e)
    return NextResponse.json({ messages: [] })
  }
}
