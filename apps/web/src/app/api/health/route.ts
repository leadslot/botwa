import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const BOT_URL = process.env.BOT_SERVER_URL || 'http://localhost:3001'

async function checkDB(): Promise<{ ok: boolean; latencyMs?: number; error?: string }> {
  const start = Date.now()
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { error } = await supabase.from('businesses').select('id').limit(1)
    if (error) return { ok: false, error: error.message }
    return { ok: true, latencyMs: Date.now() - start }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

async function checkBot(): Promise<{ ok: boolean; latencyMs?: number; error?: string }> {
  const start = Date.now()
  try {
    const res = await fetch(`${BOT_URL}/health`, { signal: AbortSignal.timeout(6000) })
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` }
    return { ok: true, latencyMs: Date.now() - start }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

async function countActiveSessions(): Promise<number> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { count } = await supabase
      .from('whatsapp_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'connected')
    return count ?? 0
  } catch {
    return -1
  }
}

export async function GET() {
  const [db, bot, activeSessions] = await Promise.all([
    checkDB(),
    checkBot(),
    countActiveSessions(),
  ])

  const allOk = db.ok && bot.ok

  const body = {
    status: allOk ? 'ok' : 'degraded',
    ts: new Date().toISOString(),
    subsystems: {
      database: db,
      bot: bot,
    },
    activeSessions,
  }

  return NextResponse.json(body, { status: allOk ? 200 : 503 })
}
