import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const BOT_URL = process.env.BOT_SERVER_URL || 'http://localhost:3001'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: business } = await supabase
    .from('businesses').select('id').eq('user_id', user.id).single()
  if (!business) return NextResponse.json({ status: 'no_business' })

  try {
    const res = await fetch(`${BOT_URL}/session/qr/${business.id}`)
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    // Bot server no disponible, leer de Supabase
    const { data: session } = await supabase
      .from('whatsapp_sessions').select('status, qr_code').eq('business_id', business.id).single()
    return NextResponse.json({ status: session?.status || 'disconnected', qr: session?.qr_code })
  }
}
