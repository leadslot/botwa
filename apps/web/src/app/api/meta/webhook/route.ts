import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { generateChannelResponse } from '@/lib/ai-response'
import { createHmac, timingSafeEqual } from 'crypto'

function verifyMetaSignature(rawBody: string, signature: string | null): boolean {
  const appSecret = process.env.META_APP_SECRET
  if (!appSecret || !signature) return false
  const expected = 'sha256=' + createHmac('sha256', appSecret).update(rawBody).digest('hex')
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  } catch { return false }
}

type MetaMessagingEvent = {
  sender?: { id?: string }
  recipient?: { id?: string }
  message?: { mid?: string; text?: string }
  timestamp?: number
}

type MetaWebhookBody = {
  object?: string
  entry?: {
    id?: string
    messaging?: MetaMessagingEvent[]
    changes?: {
      value?: {
        metadata?: { phone_number_id?: string; display_phone_number?: string }
        contacts?: { wa_id?: string; profile?: { name?: string } }[]
        messages?: { id?: string; from?: string; timestamp?: string; type?: string; text?: { body?: string } }[]
      }
      field?: string
    }[]
  }[]
}

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get('hub.mode')
  const token = req.nextUrl.searchParams.get('hub.verify_token')
  const challenge = req.nextUrl.searchParams.get('hub.challenge')
  if (mode === 'subscribe' && token && token === process.env.META_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? '', { status: 200 })
  }
  return new NextResponse('Forbidden', { status: 403 })
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    const signature = req.headers.get('x-hub-signature-256')
    if (!verifyMetaSignature(rawBody, signature)) {
      return new NextResponse('Forbidden', { status: 403 })
    }
    const body = JSON.parse(rawBody) as MetaWebhookBody
    const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value
        const phoneNumberId = value?.metadata?.phone_number_id
        if (!phoneNumberId) continue

        for (const message of value?.messages ?? []) {
          const text = message.text?.body?.trim()
          const from = message.from
          if (!text || !from) continue

          const { data: connection } = await adminClient
            .from('channel_connections')
            .select('business_id, metadata')
            .eq('channel', 'whatsapp_api')
            .eq('external_id', phoneNumberId)
            .eq('status', 'active')
            .limit(1)
            .single()

          if (!connection) continue
          const businessId = connection.business_id as string
          const metadata = (connection.metadata ?? {}) as { access_token?: string; phone_number_id?: string }

          const { data: business } = await adminClient
            .from('businesses')
            .select('id, name, ai_prompt, ai_enabled, price_list')
            .eq('id', businessId)
            .single()

          if (!business) continue

          const contactName = value?.contacts?.find(contact => contact.wa_id === from)?.profile?.name || from
          const { data: conversation } = await adminClient
            .from('channel_conversations')
            .upsert({
              business_id: businessId,
              channel: 'whatsapp_api',
              external_conversation_id: from,
              contact_name: contactName,
              contact_handle: from,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'business_id,channel,external_conversation_id' })
            .select('id')
            .single()

          await adminClient.from('channel_messages').insert({
            business_id: businessId,
            conversation_id: conversation?.id,
            channel: 'whatsapp_api',
            external_message_id: message.id,
            direction: 'inbound',
            message: text,
            raw: message,
          })

          const reply = business.ai_enabled === false
            ? 'Gracias por escribir. En breve te respondemos.'
            : await generateChannelResponse(text, business, 'whatsapp_api')

          await adminClient.from('channel_messages').insert({
            business_id: businessId,
            conversation_id: conversation?.id,
            channel: 'whatsapp_api',
            direction: 'outbound',
            message: reply,
            raw: { from, phoneNumberId, customer_service_only: true },
          })

          if (metadata.access_token) {
            await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${metadata.access_token}`,
              },
              body: JSON.stringify({
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: from,
                type: 'text',
                text: { preview_url: false, body: reply },
              }),
            })
          }
        }
      }

      for (const event of entry.messaging ?? []) {
        const text = event.message?.text?.trim()
        const senderId = event.sender?.id
        const recipientId = event.recipient?.id || entry.id
        if (!text || !senderId || !recipientId) continue

        const { data: connection } = await adminClient
          .from('channel_connections')
          .select('business_id, channel, metadata')
          .in('channel', ['facebook', 'instagram'])
          .or(`external_id.eq.${recipientId},metadata->>page_id.eq.${recipientId}`)
          .eq('status', 'active')
          .limit(1)
          .single()

        if (!connection) continue
        const channel = connection.channel as 'facebook' | 'instagram'
        const businessId = connection.business_id as string
        const metadata = (connection.metadata ?? {}) as { page_access_token?: string }

        const { data: business } = await adminClient
          .from('businesses')
          .select('id, name, ai_prompt, ai_enabled, price_list')
          .eq('id', businessId)
          .single()

        if (!business) continue

        const { data: conversation } = await adminClient
          .from('channel_conversations')
          .upsert({
            business_id: businessId,
            channel,
            external_conversation_id: senderId,
            contact_name: channel === 'instagram' ? 'Instagram' : 'Facebook',
            contact_handle: senderId,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'business_id,channel,external_conversation_id' })
          .select('id')
          .single()

        await adminClient.from('channel_messages').insert({
          business_id: businessId,
          conversation_id: conversation?.id,
          channel,
          external_message_id: event.message?.mid,
          direction: 'inbound',
          message: text,
          raw: event,
        })

        const reply = business.ai_enabled === false
          ? 'Gracias por escribir. En breve te respondemos.'
          : await generateChannelResponse(text, business, channel)

        await adminClient.from('channel_messages').insert({
          business_id: businessId,
          conversation_id: conversation?.id,
          channel,
          direction: 'outbound',
          message: reply,
          raw: { senderId, recipientId },
        })

        if (metadata.page_access_token) {
          await fetch('https://graph.facebook.com/v20.0/me/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              recipient: { id: senderId },
              message: { text: reply },
              access_token: metadata.page_access_token,
            }),
          })
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('/api/meta/webhook error:', error)
    return NextResponse.json({ error: 'error interno' }, { status: 500 })
  }
}
