import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getVerifiedUser } from '@/lib/supabase/server'
import { botFetch } from '@/lib/bot-fetch'

export async function POST(req: Request) {
  const user = await getVerifiedUser()
  if (!user) return NextResponse.json({ error: 'No auth' }, { status: 401 })

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
  const { data: business } = await admin
    .from('businesses').select('id').eq('user_id', user.id).single()
  if (!business) return NextResponse.json({ error: 'No business' }, { status: 404 })

  const { phone } = await req.json()

  const r = await botFetch('/session/pair-code', {
    method: 'POST',
    body: JSON.stringify({ businessId: business.id, phone }),
  })
  const data = await r.json()
  if (!r.ok) return NextResponse.json({ error: data.error }, { status: 500 })
  return NextResponse.json({ code: data.code })
}
