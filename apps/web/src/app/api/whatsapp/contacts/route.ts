import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/supabase/server'

import { botFetch } from '@/lib/bot-fetch'

export async function GET() {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ contacts: [] })

  const admin = ctx.adminClient
  const business = { id: ctx.businessId }

  // 1) Intentar chats (más confiable que contacts en WA Web)
  try {
    const res = await botFetch(`/session/chats/${business.id}`, {
      signal: AbortSignal.timeout(5000)
    })
    const data = await res.json()
    if (data.chats?.length) return NextResponse.json({ contacts: data.chats })
  } catch {}

  // 2) Fallback: contacts endpoint del bot
  try {
    const res = await botFetch(`/session/contacts/${business.id}`, {
      signal: AbortSignal.timeout(5000)
    })
    const data = await res.json()
    if (data.contacts?.length) return NextResponse.json(data)
  } catch {}

  // 3) Fallback Supabase chats_data
  try {
    const { data: session_row } = await admin
      .from('whatsapp_sessions')
      .select('chats_data, contacts_data')
      .eq('business_id', business.id)
      .single()
    if (session_row?.chats_data?.length) {
      return NextResponse.json({ contacts: session_row.chats_data })
    }
    if (session_row?.contacts_data?.length) {
      return NextResponse.json({ contacts: session_row.contacts_data })
    }
  } catch {}

  return NextResponse.json({ contacts: [] })
}
