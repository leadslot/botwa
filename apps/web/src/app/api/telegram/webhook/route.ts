import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { generateChannelResponse } from '@/lib/ai-response'

type TelegramUpdate = {
  update_id?: number
  message?: {
    message_id: number
    text?: string
    chat: { id: number; username?: string; first_name?: string; last_name?: string }
    from?: { id: number; username?: string; first_name?: string; last_name?: string }
  }
}

export async function POST(req: NextRequest) {
  try {
    const businessId = req.nextUrl.searchParams.get('businessId')
    const secret = req.nextUrl.searchParams.get('secret')
    if (!businessId) return NextResponse.json({ error: 'businessId requerido' }, { status: 400 })
    const update = await req.json() as TelegramUpdate
    const incoming = update.message
    const text = incoming?.text?.trim()
    if (!incoming || !text) return NextResponse.json({ ok: true })

    const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
    const { data: connection } = await adminClient
      .from('channel_connections')
      .select('id, status, metadata')
      .eq('business_id', businessId)
      .eq('channel', 'telegram')
      .limit(1)
      .single()

    const metadata = (connection?.metadata ?? {}) as { bot_token?: string; webhook_secret?: string }
    if (metadata.webhook_secret && secret !== metadata.webhook_secret) {
      return NextResponse.json({ error: 'secret invalido' }, { status: 401 })
    }
    if (!metadata.webhook_secret && process.env.TELEGRAM_WEBHOOK_SECRET && secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'secret invalido' }, { status: 401 })
    }
    if (!connection || connection.status !== 'active') {
      return NextResponse.json({ ok: true, paused: connection?.status === 'paused' })
    }

    const { data: business } = await adminClient
      .from('businesses')
      .select('id, name, ai_prompt, ai_enabled, price_list')
      .eq('id', businessId)
      .single()

    if (!business) return NextResponse.json({ error: 'negocio no encontrado' }, { status: 404 })

    const chatId = String(incoming.chat.id)
    const contactName = [incoming.from?.first_name, incoming.from?.last_name].filter(Boolean).join(' ') || incoming.chat.username || 'Telegram'

    if (connection?.id) {
      await adminClient
        .from('channel_connections')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', connection.id)
    }

    const { data: conversation, error: convError } = await adminClient
      .from('channel_conversations')
      .upsert({
        business_id: businessId,
        channel: 'telegram',
        external_conversation_id: chatId,
        contact_name: contactName,
        contact_handle: incoming.chat.username ? `@${incoming.chat.username}` : chatId,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'business_id,channel,external_conversation_id' })
      .select('id')
      .single()

    if (convError) return NextResponse.json({ error: convError.message }, { status: 500 })

    await adminClient.from('channel_messages').insert({
      business_id: businessId,
      conversation_id: conversation.id,
      channel: 'telegram',
      external_message_id: String(incoming.message_id),
      direction: 'inbound',
      message: text,
      raw: update,
    })

    const reply = business.ai_enabled === false
      ? 'Gracias por escribir. En breve te respondemos.'
      : await generateChannelResponse(text, business, 'telegram')

    await adminClient.from('channel_messages').insert({
      business_id: businessId,
      conversation_id: conversation.id,
      channel: 'telegram',
      direction: 'outbound',
      message: reply,
      raw: { chatId },
    })

    const botToken = metadata.bot_token || process.env.TELEGRAM_BOT_TOKEN
    if (botToken) {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: reply }),
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('/api/telegram/webhook error:', error)
    return NextResponse.json({ error: 'error interno' }, { status: 500 })
  }
}
