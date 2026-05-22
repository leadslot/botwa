import { NextResponse } from 'next/server'
import { getVerifiedUser } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const user = await getVerifiedUser()
    if (!user) return NextResponse.json({ error: 'No auth' }, { status: 401 })

    const adminClient = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
    const { data: business } = await adminClient
      .from('businesses').select('id, excluded_numbers').eq('user_id', user.id).single()
    if (!business) return NextResponse.json({ error: 'No business' }, { status: 404 })

    const { number } = await req.json()
    // number can be a phone number like "541126411901" or a LID like "52798150426668"
    // Strip @lid or @s.whatsapp.net if present
    const clean = number.replace(/@[^@]+$/, '').replace(/[^0-9]/g, '')

    const existing: string[] = business.excluded_numbers ?? []
    if (!existing.includes(clean)) {
      await adminClient
        .from('businesses')
        .update({ excluded_numbers: [...existing, clean] })
        .eq('id', business.id)
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('/api/conversations/block error:', e)
    return NextResponse.json({ error: 'error interno' }, { status: 500 })
  }
}
