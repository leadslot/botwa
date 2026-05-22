import { createClient } from '@supabase/supabase-js'

type BusinessPrompt = {
  name?: string | null
  ai_prompt?: string | null
  price_list?: { name?: string | null; price?: string | null }[] | null
}

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
    { provider: 'groq', key: process.env.GROQ_API_KEY_1, model: 'llama-3.3-70b-versatile', label: 'Groq-1' },
    { provider: 'groq', key: process.env.GROQ_API_KEY_2, model: 'llama-3.3-70b-versatile', label: 'Groq-2' },
    { provider: 'gemini', key: process.env.GEMINI_API_KEY_1, model: 'gemini-2.0-flash', label: 'Gemini-1' },
    { provider: 'gemini', key: process.env.GEMINI_API_KEY_2, model: 'gemini-2.0-flash', label: 'Gemini-2' },
    { provider: 'openai', key: process.env.OPENAI_API_KEY, model: 'gpt-4o-mini', label: 'OpenAI' },
  ].filter((entry): entry is PoolEntry => Boolean(entry.key))
  poolLoadedAt = now
  return apiPool
}

export async function generateChannelResponse(userMessage: string, business: BusinessPrompt, channel: string) {
  const priceLines = business.price_list
    ?.filter((p) => p.name?.trim())
    .map((p) => `- ${p.name?.trim()}: ${p.price?.trim() || 'consultar'}`)
    .join('\n')

  const priceBlock = priceLines
    ? `\n\nLISTA DE PRECIOS (exacta):\n${priceLines}\nSi preguntan por algo que no esta en esta lista, deci que ese precio se maneja por consulta.`
    : ''

  const basePrompt = business.ai_prompt ||
    `Sos el asistente de ${business.name || 'este negocio'}. Responde consultas de clientes de forma amable, breve y clara. No inventes informacion.`

  const systemPrompt = `${basePrompt}${priceBlock}

CANAL: ${channel}.
Responde en menos de 3 oraciones, sin listas salvo que el cliente las pida. Hace una sola pregunta por mensaje.`

  const pool = await getPool()
  for (const entry of pool) {
    try {
      return await callProvider(entry, userMessage, systemPrompt)
    } catch (error) {
      console.error(`[AI] ${entry.label}:`, error)
    }
  }

  return 'Gracias por escribir. En breve te respondemos.'
}

async function callProvider(entry: PoolEntry, message: string, systemPrompt: string) {
  if (entry.provider === 'gemini') return callGemini(entry, message, systemPrompt)
  if (entry.provider === 'groq') return callOpenAICompatible('https://api.groq.com/openai/v1/chat/completions', entry, message, systemPrompt)
  if (entry.provider === 'openai') return callOpenAICompatible('https://api.openai.com/v1/chat/completions', entry, message, systemPrompt)
  throw new Error(`Proveedor desconocido: ${entry.provider}`)
}

async function callGemini(entry: PoolEntry, message: string, systemPrompt: string) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${entry.model}:generateContent?key=${entry.key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: message }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 220 },
    }),
  })
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error?.message || 'Gemini error')
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No pude procesar tu mensaje.'
}

async function callOpenAICompatible(url: string, entry: PoolEntry, message: string, systemPrompt: string) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${entry.key}` },
    body: JSON.stringify({
      model: entry.model,
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: message }],
      temperature: 0.7,
      max_tokens: 220,
    }),
  })
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error?.message || 'AI provider error')
  return data.choices?.[0]?.message?.content || 'No pude procesar tu mensaje.'
}
