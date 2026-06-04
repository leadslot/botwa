import { NextRequest, NextResponse } from 'next/server'
import { sendServiceAlertEmail } from '@/lib/mailer'

const BOT_SECRET = process.env.BOT_SECRET
const ADMIN_EMAIL = process.env.ADMIN_EMAIL

export async function POST(req: NextRequest) {
  // Solo acepta llamadas del bot server
  if (!BOT_SECRET) return NextResponse.json({ error: 'Misconfigured' }, { status: 503 })
  if (req.headers.get('x-bot-secret') !== BOT_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!ADMIN_EMAIL) return NextResponse.json({ error: 'ADMIN_EMAIL not set' }, { status: 503 })

  let body: { type?: string; businessId?: string; businessName?: string; detail?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { type = 'unknown', businessId = '?', businessName = businessId, detail = '' } = body

  const alertMap: Record<string, { title: string }> = {
    wa_logged_out:    { title: `WhatsApp desconectado — ${businessName}` },
    wa_max_retries:   { title: `WhatsApp no pudo reconectarse — ${businessName}` },
    bot_error:        { title: 'Error crítico en el servidor del bot' },
  }

  const alert = alertMap[type] ?? { title: `Alerta Responbot — ${type}` }

  await sendServiceAlertEmail({
    to: ADMIN_EMAIL,
    title: alert.title,
    detail: detail || `businessId: ${businessId}`,
    resolved: false,
  }).catch((e) => console.error('[alert] Error enviando email:', e))

  return NextResponse.json({ ok: true })
}
