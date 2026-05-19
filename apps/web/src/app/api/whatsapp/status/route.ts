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
  if (!session?.user) return NextResponse.json({ status: 'disconnected' })

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
  const { data: business } = await admin
    .from('businesses').select('id').eq('user_id', session.user.id).single()
  if (!business) return NextResponse.json({ status: 'disconnected' })

  try {
    const res = await fetch(`${BOT_URL}/session/qr/${business.id}`, { signal: AbortSignal.timeout(4000) })
    const data = await res.json()
    // Si el bot dice disconnected, verificar en Supabase si hay credenciales guardadas
    // (puede estar arrancando / restaurando sesión)
    if (data.status === 'disconnected') {
      const { data: sessionRow } = await admin
        .from('whatsapp_sessions')
        .select('status, session_data')
        .eq('business_id', business.id)
        .single()
      if (sessionRow?.session_data && sessionRow.status !== 'disconnected') {
        return NextResponse.json({ status: 'reconnecting', qr: null })
      }
    }
    return NextResponse.json(data)
  } catch {
    // Bot caído — verificar Supabase
    try {
      const { data: sessionRow } = await admin
        .from('whatsapp_sessions')
        .select('status, session_data')
        .eq('business_id', business.id)
        .single()
      if (sessionRow?.session_data && sessionRow.status !== 'disconnected') {
        return NextResponse.json({ status: 'reconnecting', qr: null })
      }
    } catch {}
    return NextResponse.json({ status: 'disconnected', qr: null })
  }
}
