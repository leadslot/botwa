import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'sin sesion' }, { status: 401 })

  const channel = req.nextUrl.searchParams.get('channel')

  let query = ctx.adminClient
    .from('channel_connections')
    .select('id, channel, status, display_name, external_id, updated_at')
    .eq('business_id', ctx.businessId)

  if (channel) query = query.eq('channel', channel)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ connections: data ?? [] })
}
