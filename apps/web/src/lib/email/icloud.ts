import type { EmailMessage } from './types'
import { ImapFlow } from 'imapflow'
import nodemailer from 'nodemailer'

// Fetch unread messages via IMAP
export async function getUnreadICloudMessages(
  email: string,
  appPassword: string,
  maxResults = 10
): Promise<EmailMessage[]> {
  const client = new ImapFlow({
    host: 'imap.mail.me.com',
    port: 993,
    secure: true,
    auth: { user: email, pass: appPassword },
    logger: false,
    tls: { rejectUnauthorized: false },
  })

  const messages: EmailMessage[] = []
  try {
    await client.connect()
    await client.mailboxOpen('INBOX')

    const uids = await client.search({ seen: false }, { uid: true })
    const uidArray = Array.isArray(uids) ? uids : []
    const toFetch = uidArray.slice(-maxResults)
    if (!toFetch.length) return []

    for await (const msg of client.fetch(toFetch, {
      uid: true, envelope: true, bodyStructure: true, bodyParts: ['1', 'text'],
    }, { uid: true })) {
      const fromAddr = msg.envelope?.from?.[0]
      const fromEmail = fromAddr?.address ?? ''
      const fromName = fromAddr?.name ?? fromAddr?.address ?? ''
      const bodyPart = msg.bodyParts?.get('1') ?? msg.bodyParts?.get('text')
      const bodyText = bodyPart ? bodyPart.toString() : ''

      messages.push({
        messageId: String(msg.uid),
        subject: msg.envelope?.subject ?? '(sin asunto)',
        fromEmail,
        fromName,
        snippet: bodyText.slice(0, 200),
        bodyText: bodyText.slice(0, 1000),
        date: msg.envelope?.date?.toISOString() ?? new Date().toISOString(),
      })
    }
  } finally {
    await client.logout().catch(() => {})
  }
  return messages
}

// Mark messages as read via IMAP
export async function markICloudRead(
  email: string,
  appPassword: string,
  uids: string[]
): Promise<void> {
  if (!uids.length) return
  const client = new ImapFlow({
    host: 'imap.mail.me.com',
    port: 993,
    secure: true,
    auth: { user: email, pass: appPassword },
    logger: false,
    tls: { rejectUnauthorized: false },
  })
  try {
    await client.connect()
    await client.mailboxOpen('INBOX')
    await client.messageFlagsAdd(uids.join(','), ['\\Seen'], { uid: true })
  } finally {
    await client.logout().catch(() => {})
  }
}

// Save a draft to iCloud Drafts folder via IMAP APPEND
export async function createICloudDraft(
  email: string,
  appPassword: string,
  to: string,
  subject: string,
  body: string
): Promise<string> {
  const client = new ImapFlow({
    host: 'imap.mail.me.com',
    port: 993,
    secure: true,
    auth: { user: email, pass: appPassword },
    logger: false,
    tls: { rejectUnauthorized: false },
  })

  const replySubject = subject.startsWith('Re:') ? subject : `Re: ${subject}`
  const rawMessage = [
    `From: ${email}`,
    `To: ${to}`,
    `Subject: ${replySubject}`,
    'Content-Type: text/plain; charset="UTF-8"',
    `Date: ${new Date().toUTCString()}`,
    '',
    body,
  ].join('\r\n')

  let uid = String(Date.now())
  try {
    await client.connect()
    // Try to find Drafts folder
    let draftsFolder = 'Drafts'
    const list = await client.list()
    const draftsBox = list.find(b =>
      b.specialUse === '\\Drafts' ||
      b.name.toLowerCase().includes('draft') ||
      b.name.toLowerCase().includes('borrador')
    )
    if (draftsBox) draftsFolder = draftsBox.path

    const result = await client.append(draftsFolder, Buffer.from(rawMessage), ['\\Draft', '\\Seen'])
    if (result && typeof result === 'object' && 'uid' in result && result.uid) uid = String(result.uid)
  } finally {
    await client.logout().catch(() => {})
  }
  return uid
}

// Send via SMTP
export async function sendICloudDraft(
  email: string,
  appPassword: string,
  to: string,
  subject: string,
  body: string
): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: 'smtp.mail.me.com',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: { user: email, pass: appPassword },
    tls: { rejectUnauthorized: false },
  })
  await transporter.sendMail({
    from: email,
    to,
    subject: subject.startsWith('Re:') ? subject : `Re: ${subject}`,
    text: body,
  })
}
