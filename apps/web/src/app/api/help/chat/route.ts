import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { HELP_SYSTEM_PROMPT } from '@/lib/help-prompt'

const ADMIN_FALLBACK_EMAIL = process.env.ADMIN_EMAIL || 'responbot.app@gmail.com'
const RATE_LIMIT = new Map<string, { count: number; resetAt: number }>()

type AdminClient = ReturnType<typeof createClient>
let cachedAdmin: AdminClient | null = null

function getAdmin() {
  if (cachedAdmin) return cachedAdmin
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) throw new Error('Supabase admin no configurado')
  cachedAdmin = createClient(url, key)
  return cachedAdmin
}

function isRateLimited(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
  const now = Date.now()
  const current = RATE_LIMIT.get(ip)
  if (!current || current.resetAt < now) {
    RATE_LIMIT.set(ip, { count: 1, resetAt: now + 60_000 })
    return false
  }
  current.count += 1
  return current.count > 20
}

function normalizeMessages(messages: unknown) {
  if (!Array.isArray(messages)) return null
  const normalized = messages.map(message => {
    if (!message || typeof message !== 'object') return null
    const candidate = message as { role?: unknown; content?: unknown }
    const role = candidate.role === 'assistant' ? 'assistant' : 'user'
    const content = typeof candidate.content === 'string' ? candidate.content.trim().slice(0, 2000) : ''
    if (!content) return null
    return { role, content }
  }).filter(Boolean) as Array<{ role: 'user' | 'assistant'; content: string }>
  return normalized.length ? normalized : null
}

async function getApiKey(): Promise<{ provider: string; key: string; model: string } | null> {
  try {
    const { data } = await getAdmin()
      .from('api_keys')
      .select('provider, key_value, model')
      .eq('is_active', true)
      .order('priority', { ascending: true })
      .limit(1)
      .single()
    if (data) return { provider: data.provider, key: data.key_value, model: data.model }
  } catch {}
  return null
}

export async function POST(req: NextRequest) {
  try {
    if (isRateLimited(req)) return NextResponse.json({ error: 'demasiadas solicitudes' }, { status: 429 })
    const { messages } = await req.json()
    const safeMessages = normalizeMessages(messages)
    if (!safeMessages) return NextResponse.json({ error: 'sin mensajes' }, { status: 400 })

    const apiKey = await getApiKey()
    if (!apiKey) return NextResponse.json({ reply: `No hay servicio de IA disponible en este momento. Escribinos a ${ADMIN_FALLBACK_EMAIL}` })

    const payload = {
      model: apiKey.model,
      messages: [
        { role: 'system', content: HELP_SYSTEM_PROMPT },
        ...safeMessages,
      ],
      max_tokens: 600,
      temperature: 0.4,
    }

    let reply = ''

    if (apiKey.provider === 'groq') {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey.key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000),
      })
      const data = await res.json()
      reply = data.choices?.[0]?.message?.content || ''
    } else if (apiKey.provider === 'gemini') {
      const geminiMessages = payload.messages
        .filter(m => m.role !== 'system')
        .map((m: { role: string; content: string }) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }))
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${apiKey.model}:generateContent?key=${apiKey.key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: HELP_SYSTEM_PROMPT }] },
            contents: geminiMessages,
            generationConfig: { maxOutputTokens: 600, temperature: 0.4 },
          }),
          signal: AbortSignal.timeout(15000),
        }
      )
      const data = await res.json()
      reply = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    }

    return NextResponse.json({ reply: reply || 'No pude generar una respuesta. Intentá de nuevo.' })
  } catch (e) {
    console.error('/api/help/chat error:', e)
    return NextResponse.json({ reply: 'Error al conectar con el asistente. Intentá en unos segundos.' })
  }
}
