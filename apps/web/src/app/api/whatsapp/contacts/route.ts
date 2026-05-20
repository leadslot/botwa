import { createServerClient } from '@supabase/ssr'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const BOT_URL = process.env.BOT_SERVER_URL || 'http://localhost:3001'

export async function GET() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return NextResponse.json({ contacts: [] })

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
  const { data: business } = await admin
    .from('businesses').select('id').eq('user_id', session.user.id).single()
  if (!business) return NextResponse.json({ contacts: [] })

  // 1) Intentar chats (más confiable que contacts en WA Web)
  try {
    const res = await fetch(`${BOT_URL}/session/chats/${business.id}`, {
      signal: AbortSignal.timeout(5000)
    })
    const data = await res.json()
    if (data.chats?.length) return NextResponse.json({ contacts: data.chats })
  } catch {}

  // 2) Fallback: contacts endpoint del bot
  try {
    const res = await fetch(`${BOT_URL}/session/contacts/${business.id}`, {
      signal: AbortSignal.timeout(5000)
    })
    const data = await res.json()
    if (data.contacts?.length) return NextResponse.json(data)
  } catch {}

  // 3) Fallback Supabase chats_data
  try {
    const { data: session_row } = await admin
      .from('whatsapp_sessions')
      .select('chats_data, contacts_data')
      .eq('business_id', business.id)
      .single()
    if (session_row?.chats_data?.length) {
      return NextResponse.json({ contacts: session_row.chats_data })
    }
    if (session_row?.contacts_data?.length) {
      return NextResponse.json({ contacts: session_row.contacts_data })
    }
  } catch {}

  return NextResponse.json({ contacts: [] })
}
