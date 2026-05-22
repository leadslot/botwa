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
    // getSession lee del cookie local — sin network call, no falla
    const { data: { session } } = await authClient.auth.getSession()
    if (!session?.user) return NextResponse.json({ business: null })

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )
    const { data } = await adminClient
      .from('businesses')
      .select('id, name, is_paid, plan, plan_tier, enabled_channels, messages_used, ai_enabled, ai_prompt, coupon_used, daily_messages_count, price_list, excluded_numbers, response_delay_seconds')
      .eq('user_id', session.user.id)
      .single()

    return NextResponse.json({ business: data ?? null })
  } catch (e) {
    console.error('/api/business error:', e)
    return NextResponse.json({ business: null })
  }
}
