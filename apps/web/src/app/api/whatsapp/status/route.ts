import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getVerifiedUser } from '@/lib/supabase/server'
import { botFetch } from '@/lib/bot-fetch'

export async function GET() {
  const user = await getVerifiedUser()
  if (!user) return NextResponse.json({ status: 'disconnected' })

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
  const { data: business } = await admin
    .from('businesses').select('id').eq('user_id', user.id).single()
  if (!business) return NextResponse.json({ status: 'disconnected' })

  // Helper: read from Supabase
  const getSupabaseRow = async () => {
    const { data: row } = await admin
      .from('whatsapp_sessions')
      .select('status, session_data, qr_code')
      .eq('business_id', business.id)
      .single()
    return row
  }

  try {
    const res = await botFetch(`/session/qr/${business.id}`, {
      signal: AbortSignal.timeout(6000)
    })

    // Bot returned an error (503 / non-ok) — fall back to Supabase
    if (!res.ok) {
      const row = await getSupabaseRow()
      if (!row) return NextResponse.json({ status: 'disconnected', qr: null })
      if (row.status === 'connected') return NextResponse.json({ status: 'connected', qr: null })
      if (row.status === 'waiting_qr') return NextResponse.json({ status: 'waiting_qr', qr: row.qr_code ?? null })
      if (row.status === 'reconnecting' && row.session_data) return NextResponse.json({ status: 'reconnecting', qr: null })
      return NextResponse.json({ status: 'disconnected', qr: null })
    }

    const data = await res.json()

    if (data.status === 'connected') {
      admin.from('whatsapp_sessions')
        .upsert({ business_id: business.id, status: 'connected', qr_code: null }, { onConflict: 'business_id' })
      return NextResponse.json({ status: 'connected', qr: null })
    }

    // Bot has the QR in memory — return it directly
    if (data.status === 'waiting_qr' && data.qr) {
      return NextResponse.json({ status: 'waiting_qr', qr: data.qr })
    }

    if (data.status === 'disconnected') {
      const row = await getSupabaseRow()
      if (!row) return NextResponse.json({ status: 'disconnected', qr: null })

      // QR was generated (bot may have restarted and lost it from memory) — read from Supabase
      if (row.status === 'waiting_qr' && row.qr_code) {
        return NextResponse.json({ status: 'waiting_qr', qr: row.qr_code })
      }
      // Bot was truly connected but crashed/redeployed — reconnect automatically
      if (row.status === 'connected' && row.session_data) {
        return NextResponse.json({ status: 'reconnecting', qr: null })
      }
      if (row.status === 'reconnecting' && row.session_data) {
        return NextResponse.json({ status: 'reconnecting', qr: null })
      }
    }

    return NextResponse.json({ status: data.status ?? 'disconnected', qr: data.qr ?? null })

  } catch {
    try {
      const row = await getSupabaseRow()
      if (!row?.session_data) return NextResponse.json({ status: 'disconnected', qr: null })
      if (row.status === 'connected') return NextResponse.json({ status: 'connected', qr: null })
      if (row.status === 'waiting_qr' && row.qr_code) return NextResponse.json({ status: 'waiting_qr', qr: row.qr_code })
      if (row.status === 'reconnecting') return NextResponse.json({ status: 'reconnecting', qr: null })
      return NextResponse.json({ status: 'disconnected', qr: null })
    } catch {}

    return NextResponse.json({ status: 'disconnected', qr: null })
  }
}
