import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/supabase/server'

export async function DELETE(req: NextRequest) {
  try {
    const { number } = await req.json()
    if (!number) return NextResponse.json({ error: 'number requerido' }, { status: 400 })

    const ctx = await getAuthContext()
    if (!ctx) return NextResponse.json({ error: 'sin sesión' }, { status: 401 })

    const adminClient = ctx.adminClient
    const business = { id: ctx.businessId }

    await adminClient
      .from('whatsapp_messages')
      .delete()
      .eq('business_id', business.id)
      .like('from_number', `%${number}%`)

    const { data: conversations } = await adminClient
      .from('channel_conversations')
      .select('id')
      .eq('business_id', business.id)
      .or(`external_conversation_id.eq.${number},contact_handle.eq.${number}`)

    const conversationIds = (conversations ?? []).map(c => c.id)
    if (conversationIds.length > 0) {
      await adminClient
        .from('channel_messages')
        .delete()
        .eq('business_id', business.id)
        .in('conversation_id', conversationIds)

      await adminClient
        .from('channel_conversations')
        .delete()
        .eq('business_id', business.id)
        .in('id', conversationIds)
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('/api/conversations DELETE error:', e)
    return NextResponse.json({ error: 'error interno' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const ctx = await getAuthContext()
    if (!ctx) return NextResponse.json({ messages: [] })

    const adminClient = ctx.adminClient
    const business = { id: ctx.businessId }

    const { data: whatsappMessages } = await adminClient
      .from('whatsapp_messages')
      .select('id, from_number, message, direction, created_at, push_name')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false })
      .limit(200)

    const { data: channelMessages } = await adminClient
      .from('channel_messages')
      .select('id, channel, message, direction, created_at, channel_conversations(external_conversation_id, contact_name, contact_handle)')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false })
      .limit(200)

    const unified = [
      ...(whatsappMessages ?? []).map(msg => ({ ...msg, channel: 'whatsapp' })),
      ...(channelMessages ?? []).map(msg => {
        const conversation = Array.isArray(msg.channel_conversations)
          ? msg.channel_conversations[0]
          : msg.channel_conversations
        return {
          id: msg.id,
          from_number: conversation?.contact_handle || conversation?.external_conversation_id || msg.channel,
          push_name: conversation?.contact_name ?? msg.channel,
          message: msg.message,
          direction: msg.direction,
          created_at: msg.created_at,
          channel: msg.channel,
        }
      }),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 300)

    return NextResponse.json({ messages: unified })
  } catch (e) {
    console.error('/api/conversations error:', e)
    return NextResponse.json({ messages: [] })
  }
}
