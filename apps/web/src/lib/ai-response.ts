import { createClient } from '@supabase/supabase-js'

type BusinessPrompt = {
  name?: string | null
  ai_prompt?: string | null
  price_list?: { name?: string | null; price?: string | null }[] | null
  escalation_contact?: string | null
}

export type HistoryEntry = { direction: 'inbound' | 'outbound'; message: string }

type PoolEntry = {
  provider: string
  key: string
  model: string
  label: string
}

let apiPool: PoolEntry[] = []
let poolLoadedAt = 0
const POOL_TTL = 5 * 60 * 1000

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )
}

async function getPool(): Promise<PoolEntry[]> {
  const now = Date.now()
  if (apiPool.length > 0 && now - poolLoadedAt < POOL_TTL) return apiPool

  try {
    const { data } = await adminClient()
      .from('api_keys')
      .select('provider, key_value, model, label')
      .eq('is_active', true)
      .order('priority', { ascending: true })

    if (data?.length) {
      apiPool = data.map((k) => ({
        provider: k.provider,
        key: k.key_value,
        model: k.model,
        label: k.label,
      }))
      poolLoadedAt = now
      return apiPool
    }
  } catch {}

  apiPool = [
    { provider: 'groq', key: process.env.GROQ_API_KEY_1!, model: 'llama-3.3-70b-versatile', label: 'Groq-1' },
    { provider: 'groq', key: process.env.GROQ_API_KEY_2!, model: 'llama-3.3-70b-versatile', label: 'Groq-2' },
    { provider: 'gemini', key: process.env.GEMINI_API_KEY_1!, model: 'gemini-3.1-flash-lite', label: 'Gemini-1' },
    { provider: 'gemini', key: process.env.GEMINI_API_KEY_2!, model: 'gemini-3.1-flash-lite', label: 'Gemini-2' },
    { provider: 'openai', key: process.env.OPENAI_API_KEY!, model: 'gpt-4o-mini', label: 'OpenAI' },
  ].filter((entry): entry is PoolEntry => Boolean(entry.key))
  poolLoadedAt = now
  return apiPool
}

// ── Reglas por canal ─────────────────────────────────────────────────────────
function channelRules(channel: string): string {
  switch (channel) {
    case 'whatsapp_api':
      return `
CANAL: WhatsApp.
- Respondé breve y natural. Maximo 2-3 oraciones por mensaje.
- Sin listas, bullets, asteriscos ni titulos.
- Tono cercano, rioplatense: usa "vos", "te paso", "decime", "dale".
- Una sola pregunta por mensaje si necesitas datos.
- Nunca inventes precios ni disponibilidad.`

    case 'instagram':
      return `
CANAL: Instagram DM.
- Tono cercano, moderno y breve. Maximo 2 oraciones.
- Se directo y comercial sin sonar corporativo.
- Si preguntan precio, pedi mas info antes de dar cifras.
- Podes usar 1 emoji si viene natural, no mas.`

    case 'facebook':
      return `
CANAL: Facebook Messenger.
- Tono amable y claro. Podes ser un poco mas explicativo que en Instagram.
- Maximo 3 oraciones.
- Ofrece derivar a WhatsApp si es mejor para cerrar la consulta.
- No uses jerga muy joven, el publico puede ser variado.`

    case 'email':
      return `
CANAL: Email.
- Respondé de forma ordenada y completa, no como chat.
- Estructura: saludo, respuesta clara, datos relevantes, cierre y firma con el nombre del negocio.
- Podes usar listas si hay multiples puntos que aclarar.
- Tono profesional pero calido. Nada de "estimado cliente".
- Si falta informacion para responder bien, pedila de forma amable.
- No inventes datos, fechas, precios ni disponibilidad.`

    case 'telegram':
      return `
CANAL: Telegram.
- Tono directo y conciso. Maximo 3 oraciones.
- Una pregunta por mensaje si necesitas datos.`

    default:
      return `
CANAL: chat web.
- Respondé breve y claro. Maximo 3 oraciones.
- Tono amable y directo.`
  }
}

// ── Deteccion de escalado ────────────────────────────────────────────────────
const ESCALATION_KEYWORDS = [
  'reclamo', 'queja', 'problema grave', 'estafa', 'denuncia', 'robo', 'fraude',
  'devolucion', 'devolución', 'reembolso', 'no funciona', 'no me respondieron',
  'muy enojad', 'estoy harto', 'pesimo', 'pésimo', 'horrible', 'vergonzoso',
  'hablar con una persona', 'quiero hablar con alguien', 'atencion humana',
]

export function needsEscalation(text: string): boolean {
  const lower = text.toLowerCase()
  return ESCALATION_KEYWORDS.some(k => lower.includes(k))
}

// ── Matching de plantillas ───────────────────────────────────────────────────
async function findMatchingTemplate(businessId: string, text: string, channel: string) {
  try {
    const { data: templates } = await adminClient()
      .from('business_templates')
      .select('title, body, keywords, channel')
      .eq('business_id', businessId)
      .order('created_at', { ascending: true })

    if (!templates?.length) return null

    const lower = text.toLowerCase()
    for (const t of templates) {
      // Filtrar por canal si está especificado
      if (t.channel !== 'all' && t.channel !== channel) continue
      // Si no tiene keywords definidas, no se auto-dispara
      if (!t.keywords?.length) continue
      // Si alguna keyword matchea, usar esta plantilla
      if (t.keywords.some((k: string) => lower.includes(k))) return t
    }
  } catch {}
  return null
}

// ── Funcion principal ────────────────────────────────────────────────────────
export async function generateChannelResponse(
  userMessage: string,
  business: BusinessPrompt & { id?: string },
  channel: string,
  history: HistoryEntry[] = []
) {
  const priceLines = business.price_list
    ?.filter((p) => p.name?.trim())
    .map((p) => `- ${p.name?.trim()}: ${p.price?.trim() || 'consultar'}`)
    .join('\n')

  const priceBlock = priceLines
    ? `\n\nLISTA DE PRECIOS (exacta, no inventes otros):\n${priceLines}\nSi preguntan algo que no esta en esta lista, deci que ese precio se maneja por consulta.`
    : ''

  const basePrompt = business.ai_prompt ||
    `Sos el asistente de ${business.name || 'este negocio'}. Respondé consultas de clientes de forma amable y clara. No inventes informacion que no tenes. Si no podes ayudar, deci que alguien del equipo se comunica a la brevedad.`

  const systemPrompt = `${basePrompt}${priceBlock}
${channelRules(channel)}

REGLAS GENERALES:
- No digas que sos una IA ni un bot a menos que te lo pregunten directamente.
- Si te preguntan si sos un bot, respondé con honestidad de forma natural: "Soy el asistente de [negocio], te ayudo con las consultas."
- No repitas el saludo si la conversacion ya empezo (hay historial previo).
- Si el cliente esta enojado o reclama algo serio, respondé con empatia y deriva: "Entiendo, esto lo veo directamente con alguien del equipo para darte la mejor respuesta."`

  // Chequear plantillas antes de llamar a la IA
  if (business.id) {
    const template = await findMatchingTemplate(business.id, userMessage, channel)
    if (template) {
      console.log(`[AI:${channel}] Plantilla matched: "${template.title}"`)
      return template.body
    }
  }

  const pool = await getPool()
  for (const entry of pool) {
    try {
      return await callProvider(entry, userMessage, systemPrompt, history)
    } catch (error) {
      console.error(`[AI:${channel}] ${entry.label}:`, error)
    }
  }

  return 'Gracias por escribir. En breve te respondemos.'
}

// ── Proveedores ──────────────────────────────────────────────────────────────
async function callProvider(entry: PoolEntry, message: string, systemPrompt: string, history: HistoryEntry[]) {
  if (entry.provider === 'gemini') return callGemini(entry, message, systemPrompt, history)
  return callOpenAICompatible(
    entry.provider === 'groq'
      ? 'https://api.groq.com/openai/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions',
    entry, message, systemPrompt, history
  )
}

function buildMessages(systemPrompt: string, history: HistoryEntry[], currentMessage: string) {
  const msgs: { role: string; content: string }[] = [{ role: 'system', content: systemPrompt }]
  for (const h of history) {
    msgs.push({ role: h.direction === 'inbound' ? 'user' : 'assistant', content: h.message })
  }
  msgs.push({ role: 'user', content: currentMessage })
  return msgs
}

async function callGemini(entry: PoolEntry, message: string, systemPrompt: string, history: HistoryEntry[]) {
  const contents = history.map(h => ({
    role: h.direction === 'inbound' ? 'user' : 'model',
    parts: [{ text: h.message }],
  }))
  contents.push({ role: 'user', parts: [{ text: message }] })

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${entry.model}:generateContent?key=${entry.key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 300 },
      }),
    }
  )
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error?.message || 'Gemini error')
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No pude procesar tu mensaje.'
}

async function callOpenAICompatible(
  url: string,
  entry: PoolEntry,
  message: string,
  systemPrompt: string,
  history: HistoryEntry[]
) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${entry.key}` },
    body: JSON.stringify({
      model: entry.model,
      messages: buildMessages(systemPrompt, history, message),
      temperature: 0.7,
      max_tokens: 300,
    }),
  })
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error?.message || 'AI provider error')
  return data.choices?.[0]?.message?.content || 'No pude procesar tu mensaje.'
}
