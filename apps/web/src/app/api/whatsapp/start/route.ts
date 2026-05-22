import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getVerifiedUser } from '@/lib/supabase/server'
import { botFetch } from '@/lib/bot-fetch'

export async function POST() {
  const user = await getVerifiedUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
  const { data: business } = await admin
    .from('businesses').select('id').eq('user_id', user.id).single()
  if (!business) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })

  try {
    const res = await botFetch('/session/start', {
      method: 'POST',
      body: JSON.stringify({ businessId: business.id })
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Bot server no disponible' }, { status: 503 })
  }
}
