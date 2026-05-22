const BOT_URL = process.env.BOT_SERVER_URL || 'http://localhost:3001'
const BOT_SECRET = process.env.BOT_SECRET

export function botFetch(path: string, init: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> ?? {}),
  }
  if (BOT_SECRET) headers['x-bot-secret'] = BOT_SECRET
  return fetch(`${BOT_URL}${path}`, {
    ...init,
    signal: init.signal ?? AbortSignal.timeout(15000),
    headers,
  })
}
