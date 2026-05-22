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
    const { data: { user }, error: authError } = await authClient.auth.getUser()
    // Sin sesión → 401 (no es error de servidor, es estado esperado)
    if (authError || !user) return NextResponse.json({ business: null }, { status: 401 })

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )
    const { data, error: dbError } = await adminClient
      .from('businesses')
      .select('id, name, is_paid, plan, plan_tier, enabled_channels, messages_used, ai_enabled, ai_prompt, coupon_used, daily_messages_count, price_list, excluded_numbers, response_delay_seconds, context_messages')
      .eq('user_id', user.id)
      .single()

    if (dbError && dbError.code !== 'PGRST116') {
      // PGRST116 = no rows found (negocio nuevo, no es error)
      console.error('/api/business DB error:', dbError)
      return NextResponse.json({ error: 'db_error' }, { status: 500 })
    }

    return NextResponse.json({ business: data ?? null })
  } catch (e) {
    // Error inesperado → 500 para que el cliente pueda distinguirlo de "sin datos"
    console.error('/api/business error:', e)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
