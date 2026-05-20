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
    if (!session?.user) return NextResponse.json({ days: [] })

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )

    const { data: business } = await adminClient
      .from('businesses')
      .select('id')
      .eq('user_id', session.user.id)
      .single()

    if (!business) return NextResponse.json({ days: [] })

    const since = new Date()
    since.setDate(since.getDate() - 6)
    since.setHours(0, 0, 0, 0)

    const { data: messages } = await adminClient
      .from('whatsapp_messages')
      .select('created_at, direction')
      .eq('business_id', business.id)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: true })

    // Build last 7 days array
    const days: { label: string; inbound: number; outbound: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      days.push({
        label: d.toLocaleDateString('es-AR', { weekday: 'short' }),
        inbound: 0,
        outbound: 0,
      })
    }

    for (const msg of messages ?? []) {
      const msgDate = new Date(msg.created_at)
      const diffDays = Math.floor((Date.now() - msgDate.getTime()) / 86400000)
      const idx = 6 - diffDays
      if (idx >= 0 && idx < 7) {
        if (msg.direction === 'inbound') days[idx].inbound++
        else days[idx].outbound++
      }
    }

    return NextResponse.json({ days })
  } catch (e) {
    console.error('/api/stats error:', e)
    return NextResponse.json({ days: [] })
  }
}
