// ============================================
// POOL DE APIs — cargado desde Supabase
// Se puede gestionar desde el panel admin sin tocar código.
// Fallback a env vars si Supabase no tiene keys cargadas.
// ============================================

import { createClient } from '@supabase/supabase-js'
const _supabaseAI = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

let _apiPool = []
let _poolLoadedAt = 0
const POOL_TTL = 5 * 60 * 1000 // refresca cada 5 minutos

async function getPool() {
  const now = Date.now()
  if (_apiPool.length > 0 && now - _poolLoadedAt < POOL_TTL) return _apiPool

  try {
    const { data } = await _supabaseAI
      .from('api_keys')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: true })

    if (data && data.length > 0) {
      _apiPool = data.map(k => ({ provider: k.provider, key: k.key_value, model: k.model, label: k.label }))
      _poolLoadedAt = now
      console.log(`[AI] Pool cargado desde Supabase: ${_apiPool.map(k => k.label).join(', ')}`)
      return _apiPool
    }
  } catch (e) {
    console.warn('[AI] No se pudo cargar pool desde Supabase, usando env vars')
  }

  // Fallback a variables de entorno
  _apiPool = [
    { provider: 'groq',   key: process.env.GROQ_API_KEY_1,   model: 'llama-3.3-70b-versatile', label: 'Groq-1 (env)' },
    { provider: 'groq',   key: process.env.GROQ_API_KEY_2,   model: 'llama-3.3-70b-versatile', label: 'Groq-2 (env)' },
    { provider: 'gemini', key: process.env.GEMINI_API_KEY_1, model: 'gemini-2.0-flash',         label: 'Gemini-1 (env)' },
    { provider: 'gemini', key: process.env.GEMINI_API_KEY_2, model: 'gemini-2.0-flash',         label: 'Gemini-2 (env)' },
    { provider: 'openai', key: process.env.OPENAI_API_KEY,   model: 'gpt-4o-mini',              label: 'GPT-mini (env)' },
  ].filter(e => e.key)
  _poolLoadedAt = now
  return _apiPool
}

// Keys bloqueadas temporalmente (rate limit). Se resetean solos al reiniciar.
const blockedUntil = {}

export async function generateAIResponse(userMessage, business) {
  const basePrompt = business.ai_prompt ||
    `Sos el asistente de ${business.name}. Respondé consultas de clientes de forma amable y concisa. No des información que no tenés. Si no podés ayudar, decí que se comunicarán a la brevedad.`

  const WHATSAPP_FORMAT_RULE = `\n\nFORMATO WHATSAPP (OBLIGATORIO, NO IGNORAR):
- Máximo 2-3 oraciones por mensaje. Nunca más.
- Sin listas, sin bullets, sin numeración, sin asteriscos, sin títulos.
- Escribí como una persona real por WhatsApp: natural, directo, breve.
- Si tenés mucho para decir, elegí lo más importante y dejá lo demás para cuando el cliente pregunte.
- Nunca hagas preguntas múltiples en el mismo mensaje. Solo una pregunta a la vez.
- PRECIOS: NUNCA inventes ni estimes precios. Si no tenés el precio exacto en tu información, respondé: "Los precios los manejamos por consulta, mandame una foto o contame qué tenés en mente y te doy un presupuesto." Nunca des rangos de precio inventados.`

  const systemPrompt = (business.ai_prompt ? basePrompt : `${basePrompt}\n\nRespondé siempre en menos de 3 oraciones. Sé conciso y directo.`) + WHATSAPP_FORMAT_RULE
  const tokenMatch = basePrompt.match(/Tokens máximos:\s*(\d+)/)
  const maxTokens = tokenMatch ? parseInt(tokenMatch[1]) : 200

  const now = Date.now()
  const API_POOL = await getPool()

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
      const response = await callProvider(entry, userMessage, systemPrompt, maxTokens)
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

async function callProvider(entry, message, systemPrompt, maxTokens = 250) {
  switch (entry.provider) {
    case 'gemini': return callGemini(entry, message, systemPrompt, maxTokens)
    case 'groq':   return callGroq(entry, message, systemPrompt, maxTokens)
    case 'openai': return callOpenAI(entry, message, systemPrompt, maxTokens)
    default: throw new Error(`Proveedor desconocido: ${entry.provider}`)
  }
}

async function callGemini({ key, model }, message, systemPrompt, maxTokens = 250) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: message }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: maxTokens }
      })
    }
  )
  if (res.status === 429) throw new RateLimitError('Gemini rate limit')
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No pude procesar tu mensaje.'
}

async function callGroq({ key, model }, message, systemPrompt, maxTokens = 250) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: message }],
      temperature: 0.7,
      max_tokens: maxTokens,
    })
  })
  if (res.status === 429) throw new RateLimitError('Groq rate limit')
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return data.choices?.[0]?.message?.content || 'No pude procesar tu mensaje.'
}

async function callOpenAI({ key, model }, message, systemPrompt, maxTokens = 250) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: message }],
      temperature: 0.7,
      max_tokens: maxTokens,
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
