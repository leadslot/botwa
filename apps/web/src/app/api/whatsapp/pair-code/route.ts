import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const cookieStore = await cookies()
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )
  const { data: { session } } = await authClient.auth.getSession()
  if (!session?.user) return NextResponse.json({ error: 'No auth' }, { status: 401 })

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )
  const { data: business } = await adminClient
    .from('businesses').select('id').eq('user_id', session.user.id).single()
  if (!business) return NextResponse.json({ error: 'No business' }, { status: 404 })

  const { phone } = await req.json()
  const BOT_URL = process.env.BOT_SERVER_URL || 'http://localhost:3001'

  const r = await fetch(`${BOT_URL}/session/pair-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ businessId: business.id, phone }),
  })
  const data = await r.json()
  if (!r.ok) return NextResponse.json({ error: data.error }, { status: 500 })
  return NextResponse.json({ code: data.code })
}
