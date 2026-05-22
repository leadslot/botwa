import type { EmailMessage } from './types'

const GMAIL_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me'

// Refresh access token using refresh_token
export async function refreshGmailToken(refreshToken: string): Promise<{ access_token: string; expires_at: string }> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()
  if (!res.ok || !data.access_token) throw new Error(data.error_description || 'Gmail token refresh failed')
  return {
    access_token: data.access_token,
    expires_at: new Date(Date.now() + (data.expires_in ?? 3600) * 1000).toISOString(),
  }
}

// Decode base64url to string
function b64urlDecode(str: string): string {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/')
  try { return Buffer.from(b64, 'base64').toString('utf-8') } catch { return '' }
}

// Extract plain text from Gmail message payload
function extractText(payload: Record<string, unknown>): string {
  const mimeType = payload.mimeType as string | undefined
  const body = payload.body as { data?: string } | undefined
  const parts = payload.parts as Record<string, unknown>[] | undefined

  if (mimeType === 'text/plain' && body?.data) return b64urlDecode(body.data)
  if (parts) {
    for (const part of parts) {
      const text = extractText(part)
      if (text) return text
    }
  }
  return ''
}

// Get unread messages (up to maxResults)
export async function getUnreadGmailMessages(accessToken: string, maxResults = 10): Promise<EmailMessage[]> {
  const listRes = await fetch(`${GMAIL_BASE}/messages?q=is:unread&maxResults=${maxResults}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const listData = await listRes.json()
  if (!listRes.ok) throw new Error(listData.error?.message || 'Gmail list failed')
  if (!listData.messages?.length) return []

  const messages: EmailMessage[] = []
  for (const { id } of listData.messages.slice(0, maxResults)) {
    const msgRes = await fetch(`${GMAIL_BASE}/messages/${id}?format=full`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const msg = await msgRes.json()
    if (!msgRes.ok) continue

    const headers: { name: string; value: string }[] = msg.payload?.headers ?? []
    const get = (name: string) => headers.find(h => h.name.toLowerCase() === name)?.value ?? ''

    const fromRaw = get('from')
    const fromMatch = fromRaw.match(/^"?([^"<]+)"?\s*<?([^>]*)>?$/)
    const fromName = fromMatch?.[1]?.trim() || fromRaw
    const fromEmail = fromMatch?.[2]?.trim() || fromRaw

    messages.push({
      messageId: id,
      threadId: msg.threadId,
      subject: get('subject') || '(sin asunto)',
      fromEmail,
      fromName,
      snippet: msg.snippet || '',
      bodyText: extractText(msg.payload ?? {}),
      date: get('date'),
    })
  }
  return messages
}

// Build RFC 2822 message and encode as base64url
function buildRFC2822(to: string, subject: string, body: string, inReplyTo?: string, threadId?: string): string {
  const replySubject = subject.startsWith('Re:') ? subject : `Re: ${subject}`
  const lines = [
    `To: ${to}`,
    `Subject: ${replySubject}`,
    'Content-Type: text/plain; charset="UTF-8"',
  ]
  if (inReplyTo) lines.push(`In-Reply-To: ${inReplyTo}`)
  if (threadId) lines.push(`References: ${inReplyTo ?? ''}`)
  lines.push('', body)
  return Buffer.from(lines.join('\r\n')).toString('base64url')
}

// Create a Gmail draft (returns draft ID)
export async function createGmailDraft(
  accessToken: string,
  to: string,
  subject: string,
  body: string,
  threadId?: string
): Promise<string> {
  const raw = buildRFC2822(to, subject, body, undefined, threadId)
  const res = await fetch(`${GMAIL_BASE}/drafts`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: { raw, ...(threadId ? { threadId } : {}) } }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || 'Gmail draft creation failed')
  return data.id as string
}

// Send a Gmail draft by draft ID
export async function sendGmailDraft(accessToken: string, draftId: string): Promise<void> {
  const res = await fetch(`${GMAIL_BASE}/drafts/send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: draftId }),
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error?.message || 'Gmail send failed')
  }
}

// Mark a message as read
export async function markGmailRead(accessToken: string, messageId: string): Promise<void> {
  await fetch(`${GMAIL_BASE}/messages/${messageId}/modify`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ removeLabelIds: ['UNREAD'] }),
  })
}
