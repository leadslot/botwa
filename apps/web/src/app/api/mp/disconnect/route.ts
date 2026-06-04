import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/supabase/server'

export async function POST() {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'sin sesion' }, { status: 401 })
  await ctx.adminClient
    .from('channel_connections')
    .update({ status: 'disconnected', updated_at: new Date().toISOString() })
    .eq('business_id', ctx.businessId)
    .eq('channel', 'mercadopago')
  return NextResponse.json({ ok: true })
}
