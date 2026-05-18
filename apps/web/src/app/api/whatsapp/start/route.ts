import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const BOT_URL = process.env.BOT_SERVER_URL || 'http://localhost:3001'

export async function POST() {
  const supabase = await createClient()
  const { data: { session: _s } } = await supabase.auth.getSession(); const user = _s?.user ?? null
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: business } = await supabase
    .from('businesses').select('id').eq('user_id', user.id).single()
  if (!business) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })

  const res = await fetch(`${BOT_URL}/session/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ businessId: business.id })
  })
  const data = await res.json()
  return NextResponse.json(data)
}
