// ============================================
// POOL DE APIs — ORDEN DE PRIORIDAD
// Agrega keys en las variables de entorno.
// Se usan en orden: si una da rate limit, pasa a la siguiente.
// La última (paga) solo se usa si todas las gratis fallaron.
// ============================================

const API_POOL = [
  // --- GRATIS: Gemini (hasta 1500 req/día por key) ---
  { provider: 'gemini', key: process.env.GEMINI_API_KEY_1,   model: 'gemini-2.0-flash', label: 'Gemini-1' },
  { provider: 'gemini', key: process.env.GEMINI_API_KEY_2,   model: 'gemini-2.0-flash', label: 'Gemini-2' },

  // --- GRATIS: Groq (ultra rápido, ~14400 req/día por key) ---
  { provider: 'groq',   key: process.env.GROQ_API_KEY_1,     model: 'llama-3.3-70b-versatile', label: 'Groq-1' },
  { provider: 'groq',   key: process.env.GROQ_API_KEY_2,     model: 'llama-3.3-70b-versatile', label: 'Groq-2' },

  // --- PAGO: fallback final (solo si todo lo de arriba falló) ---
  { provider: 'openai', key: process.env.OPENAI_API_KEY,     model: 'gpt-4o-mini', label: 'GPT-mini (pago)' },
]

// Keys bloqueadas temporalmente (rate limit). Se resetean solos al reiniciar.
const blockedUntil = {}

export async function generateAIResponse(userMessage, business) {
  const systemPrompt = business.ai_prompt ||
    `Sos el asistente de ${business.name}. Respondé consultas de clientes de forma amable y concisa. No des información que no tenés. Si no podés ayudar, decí que se comunicarán a la brevedad.`

  const now = Date.now()

  for (const entry of API_POOL) {
    // Saltear si no tiene key configurada
    if (!entry.key) continue

    // Saltear si está en cooldown (rate limit reciente)
    if (blockedUntil[entry.label] && blockedUntil[entry.label] > now) {
      console.log(`[AI] ${entry.label} en cooldown, saltando...`)
      continue
    }

    try {
      console.log(`[AI] Usando ${entry.label}`)
      const response = await callProvider(entry, userMessage, systemPrompt)
      return response
    } catch (err) {
      if (isRateLimit(err)) {
        // Bloquear esta key por 1 hora y probar la siguiente
        blockedUntil[entry.label] = now + 60 * 60 * 1000
        console.warn(`[AI] ${entry.label} → rate limit. Bloqueada 1h. Probando siguiente...`)
      } else {
        console.error(`[AI] ${entry.label} → error: ${err.message}`)
      }
    }
  }

  return 'Estamos con alta demanda en este momento. Alguien del equipo te contactará pronto. 🙏'
}

// ============================================
// LLAMADAS POR PROVEEDOR
// ============================================

async function callProvider(entry, message, systemPrompt) {
  switch (entry.provider) {
    case 'gemini': return callGemini(entry, message, systemPrompt)
    case 'groq':   return callGroq(entry, message, systemPrompt)
    case 'openai': return callOpenAI(entry, message, systemPrompt)
    default: throw new Error(`Proveedor desconocido: ${entry.provider}`)
  }
}

async function callGemini({ key, model }, message, systemPrompt) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: message }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 300 }
      })
    }
  )
  if (res.status === 429) throw new RateLimitError('Gemini rate limit')
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No pude procesar tu mensaje.'
}

async function callGroq({ key, model }, message, systemPrompt) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: message }],
      temperature: 0.7,
      max_tokens: 300,
    })
  })
  if (res.status === 429) throw new RateLimitError('Groq rate limit')
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return data.choices?.[0]?.message?.content || 'No pude procesar tu mensaje.'
}

async function callOpenAI({ key, model }, message, systemPrompt) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: message }],
      temperature: 0.7,
      max_tokens: 300,
    })
  })
  if (res.status === 429) throw new RateLimitError('OpenAI rate limit')
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return data.choices?.[0]?.message?.content || 'No pude procesar tu mensaje.'
}

// ============================================
// HELPERS
// ============================================

class RateLimitError extends Error {
  constructor(msg) { super(msg); this.name = 'RateLimitError' }
}

function isRateLimit(err) {
  return err instanceof RateLimitError || err.message?.includes('rate') || err.message?.includes('quota')
}
