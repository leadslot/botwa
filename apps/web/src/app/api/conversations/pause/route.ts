import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'No auth' }, { status: 401 })

  const business = { id: ctx.businessId }

  const { number, paused } = await req.json()

  const BOT_URL = process.env.BOT_SERVER_URL || 'http://localhost:3001'
  await fetch(`${BOT_URL}/session/pause`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ businessId: business.id, number, paused }),
  })

  return NextResponse.json({ ok: true })
}
