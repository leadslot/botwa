import { NextResponse } from 'next/server'

const BOT_URL = process.env.BOT_SERVER_URL || 'http://localhost:3001'

export async function GET() {
  try {
    const res = await fetch(`${BOT_URL}/health`, { signal: AbortSignal.timeout(8000) })
    const status = res.ok ? 'awake' : 'error'
    return NextResponse.json({ status, bot: BOT_URL, ts: new Date().toISOString() })
  } catch {
    return NextResponse.json({ status: 'unreachable', bot: BOT_URL, ts: new Date().toISOString() }, { status: 503 })
  }
}
