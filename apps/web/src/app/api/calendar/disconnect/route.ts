import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'sin sesion' }, { status: 401 })

  const { channel, external_id } = await req.json()
  if (!channel) return NextResponse.json({ error: 'channel requerido' }, { status: 400 })

  const q = ctx.adminClient
    .from('channel_connections')
    .update({ status: 'disconnected', updated_at: new Date().toISOString() })
    .eq('business_id', ctx.businessId)
    .eq('channel', channel)

  if (external_id) q.eq('external_id', external_id)

  const { error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
