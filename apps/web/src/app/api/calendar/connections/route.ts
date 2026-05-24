import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/supabase/server'

export async function GET() {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'sin sesion' }, { status: 401 })

  const { data: connections } = await ctx.adminClient
    .from('channel_connections')
    .select('id, channel, status, display_name, external_id')
    .eq('business_id', ctx.businessId)
    .in('channel', ['calendar_google', 'calendar_icloud', 'gmail'])
    .eq('status', 'active')

  return NextResponse.json({ connections: connections ?? [] })
}
