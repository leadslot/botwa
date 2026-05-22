import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

import { botFetch } from '@/lib/bot-fetch'

export async function POST() {
  const supabase = await createClient()
  const { data: { session: _s } } = await supabase.auth.getSession(); const user = _s?.user ?? null
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: business } = await supabase
    .from('businesses').select('id').eq('user_id', user.id).single()
  if (!business) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  await botFetch('/session/disconnect', {
    method: 'POST',
    body: JSON.stringify({ businessId: business.id })
  })
  return NextResponse.json({ ok: true })
}
