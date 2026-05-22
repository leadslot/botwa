/**
 * Generic IMAP/SMTP helper — works for any provider that supports IMAP/SMTP:
 * Yahoo, Zoho, Titan, Hostinger Mail, custom domains, Hotmail personal, etc.
 * iCloud also uses this (just pass iCloud's host/port).
 */
import type { EmailMessage } from './types'
import { ImapFlow } from 'imapflow'
import nodemailer from 'nodemailer'

export type ImapConfig = {
  email: string
  password: string          // App-specific password or regular password
  imap_host: string
  imap_port: number
  smtp_host: string
  smtp_port: number
}

function makeImapClient(cfg: ImapConfig) {
  return new ImapFlow({
    host: cfg.imap_host,
    port: cfg.imap_port,
    secure: cfg.imap_port === 993,
    auth: { user: cfg.email, pass: cfg.password },
    logger: false,
    tls: { rejectUnauthorized: false },
  })
}

export async function getUnreadImapMessages(cfg: ImapConfig, maxResults = 5): Promise<EmailMessage[]> {
  const client = makeImapClient(cfg)
  const messages: EmailMessage[] = []
  try {
    await client.connect()
    await client.mailboxOpen('INBOX')
    const uids = await client.search({ seen: false }, { uid: true })
    const uidArray = Array.isArray(uids) ? uids : []
    const toFetch = uidArray.slice(-maxResults)
    if (!toFetch.length) return []

    for await (const msg of client.fetch(toFetch, {
      uid: true, envelope: true, bodyParts: ['1', 'text'],
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

export async function markImapRead(cfg: ImapConfig, uids: string[]): Promise<void> {
  if (!uids.length) return
  const client = makeImapClient(cfg)
  try {
    await client.connect()
    await client.mailboxOpen('INBOX')
    await client.messageFlagsAdd(uids.join(','), ['\\Seen'], { uid: true })
  } finally {
    await client.logout().catch(() => {})
  }
}

export async function createImapDraft(cfg: ImapConfig, to: string, subject: string, body: string): Promise<string> {
  const client = makeImapClient(cfg)
  const replySubject = subject.startsWith('Re:') ? subject : `Re: ${subject}`
  const rawMessage = [
    `From: ${cfg.email}`,
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
    const list = await client.list()
    let draftsFolder = 'Drafts'
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

export async function sendImapSmtp(cfg: ImapConfig, to: string, subject: string, body: string): Promise<void> {
  const secure = cfg.smtp_port === 465
  const transporter = nodemailer.createTransport({
    host: cfg.smtp_host,
    port: cfg.smtp_port,
    secure,
    requireTLS: !secure,
    auth: { user: cfg.email, pass: cfg.password },
    tls: { rejectUnauthorized: false },
  })
  await transporter.sendMail({
    from: cfg.email,
    to,
    subject: subject.startsWith('Re:') ? subject : `Re: ${subject}`,
    text: body,
  })
}
