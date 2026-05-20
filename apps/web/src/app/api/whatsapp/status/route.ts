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
    const res = await fetch(`${BOT_URL}/session/qr/${business.id}`, {
      signal: AbortSignal.timeout(6000)
    })
    const data = await res.json()

    // Bot respondió — si dice connected, sincronizar Supabase
    if (data.status === 'connected') {
      admin.from('whatsapp_sessions')
        .upsert({ business_id: business.id, status: 'connected', qr_code: null }, { onConflict: 'business_id' })
        .then(() => {}).catch(() => {})
      return NextResponse.json({ status: 'connected', qr: null })
    }

    // Bot dice disconnected en memoria → ver qué dice Supabase
    if (data.status === 'disconnected') {
      const { data: row } = await admin
        .from('whatsapp_sessions')
        .select('status, session_data')
        .eq('business_id', business.id)
        .single()

      // Supabase dice 'connected' → el bot está arrancando, confiar en Supabase
      if (row?.status === 'connected' && row?.session_data) {
        return NextResponse.json({ status: 'reconnecting', qr: null })
      }
      // Supabase dice explícitamente 'reconnecting'
      if (row?.status === 'reconnecting' && row?.session_data) {
        return NextResponse.json({ status: 'reconnecting', qr: null })
      }
    }

    return NextResponse.json(data)

  } catch {
    // Bot no responde (timeout o caído) → confiar en Supabase
    try {
      const { data: row } = await admin
        .from('whatsapp_sessions')
        .select('status, session_data')
        .eq('business_id', business.id)
        .single()

      if (!row?.session_data) return NextResponse.json({ status: 'disconnected', qr: null })

      // Si Supabase dice connected → reportar connected (no reconectando)
      if (row.status === 'connected') return NextResponse.json({ status: 'connected', qr: null })

      // Si Supabase dice reconectando → reportar reconectando
      if (row.status === 'reconnecting') return NextResponse.json({ status: 'reconnecting', qr: null })

      return NextResponse.json({ status: 'disconnected', qr: null })
    } catch {}

    return NextResponse.json({ status: 'disconnected', qr: null })
  }
}
