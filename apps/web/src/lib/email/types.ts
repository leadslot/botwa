export type EmailProvider = 'gmail' | 'outlook' | 'icloud' | 'imap'

export type EmailMessage = {
  messageId: string
  threadId?: string
  subject: string
  fromEmail: string
  fromName: string
  snippet: string
  bodyText: string
  date: string
}

export type ConnectionMetadata = {
  provider: EmailProvider
  email: string
  access_token?: string
  refresh_token?: string
  expires_at?: string
  app_password?: string
  imap_host?: string
  imap_port?: number
  smtp_host?: string
  smtp_port?: number
  auto_send_enabled?: boolean
  mode?: string
}

export type ChannelConnection = {
  id: string
  business_id: string
  channel: string
  status: string
  external_id: string
  display_name: string | null
  metadata: ConnectionMetadata
}
