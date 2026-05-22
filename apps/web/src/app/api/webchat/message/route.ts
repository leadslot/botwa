import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { generateChannelResponse } from '@/lib/ai-response'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { businessId?: string; visitorId?: string; message?: string; name?: string }
    const businessId = body.businessId?.trim()
    const message = body.message?.trim()
    if (!businessId || !message) return NextResponse.json({ error: 'businessId y message requeridos' }, { status: 400 })

    const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
    const { data: business } = await adminClient
      .from('businesses')
      .select('id, name, ai_prompt, ai_enabled, price_list')
      .eq('id', businessId)
      .single()

    if (!business) return NextResponse.json({ error: 'negocio no encontrado' }, { status: 404 })

    const { data: existingConnection } = await adminClient
      .from('channel_connections')
      .select('status')
      .eq('business_id', businessId)
      .eq('channel', 'webchat')
      .eq('external_id', 'default')
      .maybeSingle()

    if (!existingConnection) await adminClient.from('channel_connections').upsert({
      business_id: businessId,
      channel: 'webchat',
      status: 'active',
      external_id: 'default',
      display_name: 'Web Chat',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'business_id,channel,external_id' })

    const visitorId = body.visitorId || crypto.randomUUID()
    const { data: conversation, error: convError } = await adminClient
      .from('channel_conversations')
      .upsert({
        business_id: businessId,
        channel: 'webchat',
        external_conversation_id: visitorId,
        contact_name: body.name || 'Visitante web',
        contact_handle: visitorId,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'business_id,channel,external_conversation_id' })
      .select('id')
      .single()

    if (convError) return NextResponse.json({ error: convError.message }, { status: 500 })

    await adminClient.from('channel_messages').insert({
      business_id: businessId,
      conversation_id: conversation.id,
      channel: 'webchat',
      direction: 'inbound',
      message,
      raw: { visitorId },
    })

    if (existingConnection?.status === 'paused') {
      return NextResponse.json({ paused: true, visitorId })
    }

    const reply = business.ai_enabled === false
      ? 'Gracias por escribir. En breve te respondemos.'
      : await generateChannelResponse(message, business, 'webchat')

    await adminClient.from('channel_messages').insert({
      business_id: businessId,
      conversation_id: conversation.id,
      channel: 'webchat',
      direction: 'outbound',
      message: reply,
      raw: { visitorId },
    })

    return NextResponse.json({ reply, visitorId })
  } catch (error) {
    console.error('/api/webchat/message error:', error)
    return NextResponse.json({ error: 'error interno' }, { status: 500 })
  }
}
