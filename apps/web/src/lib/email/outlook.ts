import type { EmailMessage } from './types'

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0/me'

export async function refreshOutlookToken(refreshToken: string): Promise<{ access_token: string; expires_at: string }> {
  const tenant = process.env.MICROSOFT_TENANT_ID || 'common'
  const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID!,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      scope: 'offline_access Mail.ReadWrite Mail.Send',
    }),
  })
  const data = await res.json()
  if (!res.ok || !data.access_token) throw new Error(data.error_description || 'Outlook token refresh failed')
  return {
    access_token: data.access_token,
    expires_at: new Date(Date.now() + (data.expires_in ?? 3600) * 1000).toISOString(),
  }
}

export async function getUnreadOutlookMessages(accessToken: string, maxResults = 10): Promise<EmailMessage[]> {
  const res = await fetch(
    `${GRAPH_BASE}/mailFolders/inbox/messages?$filter=isRead eq false&$top=${maxResults}&$select=id,subject,from,body,receivedDateTime,conversationId`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || 'Outlook list failed')
  if (!data.value?.length) return []

  return data.value.map((msg: Record<string, unknown>) => {
    const from = msg.from as { emailAddress?: { address?: string; name?: string } } | undefined
    const body = msg.body as { content?: string; contentType?: string } | undefined
    const bodyText = body?.contentType === 'text'
      ? (body.content ?? '')
      : (body?.content ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

    return {
      messageId: msg.id as string,
      threadId: msg.conversationId as string | undefined,
      subject: (msg.subject as string) || '(sin asunto)',
      fromEmail: from?.emailAddress?.address ?? '',
      fromName: from?.emailAddress?.name ?? from?.emailAddress?.address ?? '',
      snippet: bodyText.slice(0, 200),
      bodyText: bodyText.slice(0, 1000),
      date: msg.receivedDateTime as string,
    }
  })
}

// Create an Outlook draft message and return its ID
export async function createOutlookDraft(
  accessToken: string,
  to: string,
  subject: string,
  body: string,
  conversationId?: string
): Promise<string> {
  const replySubject = subject.startsWith('Re:') ? subject : `Re: ${subject}`
  const payload: Record<string, unknown> = {
    subject: replySubject,
    isDraft: true,
    body: { contentType: 'Text', content: body },
    toRecipients: [{ emailAddress: { address: to } }],
  }
  if (conversationId) payload.conversationId = conversationId

  const res = await fetch(`${GRAPH_BASE}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || 'Outlook draft creation failed')
  return data.id as string
}

// Send an Outlook draft by message ID
export async function sendOutlookDraft(accessToken: string, messageId: string): Promise<void> {
  const res = await fetch(`${GRAPH_BASE}/messages/${messageId}/send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error?.message || 'Outlook send failed')
  }
}

// Mark an Outlook message as read
export async function markOutlookRead(accessToken: string, messageId: string): Promise<void> {
  await fetch(`${GRAPH_BASE}/messages/${messageId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ isRead: true }),
  })
}
