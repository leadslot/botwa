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
  if (!business) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  try {
    await botFetch('/session/reset', {
      method: 'POST',
      body: JSON.stringify({ businessId: business.id })
    })
  } catch {}

  return NextResponse.json({ ok: true })
}
