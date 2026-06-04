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

// Contador round-robin — avanza con cada llamada exitosa para distribuir carga entre keys
let rrIndex = 0

const ESCALATION_KEYWORDS = [
  'reclamo', 'queja', 'problema grave', 'estafa', 'denuncia', 'robo', 'fraude',
  'devolucion', 'devolución', 'reembolso', 'no funciona', 'no me respondieron',
  'muy enojad', 'estoy harto', 'pesimo', 'pésimo', 'horrible', 'vergonzoso',
  'hablar con una persona', 'quiero hablar con alguien', 'atencion humana',
]

export function needsEscalation(text) {
  const lower = text.toLowerCase()
  return ESCALATION_KEYWORDS.some(k => lower.includes(k))
}

export async function generateAIResponse(userMessage, business, history = []) {
  // Inyectar lista de precios si existe
  let priceBlock = ''
  if (business.price_list && business.price_list.length > 0) {
    const lines = business.price_list
      .filter(p => p.name?.trim())
      .map(p => `- ${p.name.trim()}: ${p.price?.trim() || 'consultar'}`)
      .join('\n')
    if (lines) priceBlock = `\n\nLISTA DE PRECIOS (EXACTA, usá solo estos valores):\n${lines}\nSi te preguntan por algo que no está en esta lista, decí que ese precio se maneja por consulta.`
  }

  // Inyectar archivos disponibles si existen
  let filesBlock = ''
  if (business.files && business.files.length > 0) {
    const list = business.files.map(f => `- [FILE:${f.id}] "${f.name}"${f.description ? ` — mandalo ${f.description}` : ''}`).join('\n')
    filesBlock = `\n\nARCHIVOS QUE PODÉS ENVIAR AL CLIENTE:
Cuando el cliente pida uno de estos archivos o su descripción coincida con lo indicado, respondé ÚNICAMENTE con la etiqueta exacta [FILE:id] en tu respuesta, sin texto adicional:
${list}
Ejemplo: si el cliente pide la lista de precios y hay un archivo para eso, respondé solo: [FILE:abc-123]`
  }

  // Inyectar link de seña/pago si está configurado
  let paymentBlock = ''
  if (business.mp_payment_link) {
    const desc = business.mp_payment_description || 'Para reservar tu turno o dejar una seña'
    paymentBlock = `\n\nPAGO ANTICIPADO (SEÑA):
${desc}. Cuando el cliente quiera reservar, confirmar un turno, dejar una seña o realizar un pago, compartí este link de Mercado Pago: ${business.mp_payment_link}
El pago es opcional. No lo ofrezcas proactivamente, solo cuando el cliente lo pida o pregunte cómo reservar.`
  }

  const basePrompt = (business.ai_prompt ||
    `Sos el asistente de ${business.name}. Respondé consultas de clientes de forma amable y concisa. No des información que no tenés. Si no podés ayudar, decí que se comunicarán a la brevedad.`) + priceBlock + filesBlock + paymentBlock

  const WHATSAPP_FORMAT_RULE = `\n\nFORMATO WHATSAPP (OBLIGATORIO, NO IGNORAR):
- Máximo 2-3 oraciones por mensaje. Nunca más.
- Sin listas, sin bullets, sin numeración, sin asteriscos, sin títulos.
- Escribí como una persona real por WhatsApp: natural, directo, breve.
- Si tenés mucho para decir, elegí lo más importante y dejá lo demás para cuando el cliente pregunte.
- Nunca hagas preguntas múltiples en el mismo mensaje. Solo una pregunta a la vez.
- PRECIOS: NUNCA inventes ni estimes precios. Si no tenés el precio exacto en tu información, respondé: "Los precios los manejamos por consulta, mandame una foto o contame qué tenés en mente y te doy un presupuesto." Nunca des rangos de precio inventados.
- TURNOS Y DISPONIBILIDAD: NUNCA menciones turnos disponibles, fechas libres, horarios específicos disponibles ni confirmes turnos. No tenés acceso a la agenda. Si el cliente pide turno, respondé que lo van a contactar para coordinar o que se comuniquen por el canal indicado. Nunca digas "tenemos lugar el lunes" ni nada similar.`

  const systemPrompt = (business.ai_prompt ? basePrompt : `${basePrompt}\n\nRespondé siempre en menos de 3 oraciones. Sé conciso y directo.`) + WHATSAPP_FORMAT_RULE
  const tokenMatch = basePrompt.match(/Tokens máximos:\s*(\d+)/)
  const maxTokens = tokenMatch ? parseInt(tokenMatch[1]) : 200

  const now = Date.now()
  const API_POOL = await getPool()

  // Armar el orden de intento empezando desde el índice round-robin actual.
  // Si la key elegida falla, pasa a la siguiente en orden, y así hasta probar todas.
  const available = API_POOL.filter(e => e.key)
  const n = available.length
  const orderedPool = Array.from({ length: n }, (_, i) => available[(rrIndex + i) % n])

  for (const entry of orderedPool) {
    // Saltear si está en cooldown por rate limit
    if (blockedUntil[entry.label] && blockedUntil[entry.label] > now) {
      console.log(`[AI] ${entry.label} en cooldown, saltando...`)
      continue
    }

    try {
      console.log(`[AI] Usando ${entry.label} | historial: ${history.length} msgs`)
      const response = await callProvider(entry, userMessage, systemPrompt, maxTokens, history)
      // Avanzar el índice solo cuando la llamada fue exitosa
      rrIndex = (rrIndex + 1) % n
      return response
    } catch (err) {
      if (isRateLimit(err)) {
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
// TRANSCRIPCIÓN DE AUDIO (Groq Whisper)
// ============================================

export async function transcribeAudio(buffer, mimetype = 'audio/ogg') {
  const pool = await getPool()
  const groqKey = pool.find(e => e.provider === 'groq' && e.key)?.key
  if (!groqKey) {
    console.warn('[Whisper] No hay key de Groq disponible para transcripción')
    return null
  }

  try {
    // Determinar extensión según mimetype
    const ext = mimetype.includes('mp4') ? 'mp4'
      : mimetype.includes('mp3') ? 'mp3'
      : mimetype.includes('webm') ? 'webm'
      : 'ogg'

    const form = new FormData()
    form.append('file', new Blob([buffer], { type: mimetype }), `audio.${ext}`)
    form.append('model', 'whisper-large-v3-turbo')
    form.append('response_format', 'text')
    form.append('language', 'es')

    const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${groqKey}` },
      body: form,
    })

    if (!res.ok) {
      console.warn(`[Whisper] Error ${res.status}: ${await res.text()}`)
      return null
    }

    const text = (await res.text()).trim()
    console.log(`[Whisper] Transcripción: "${text.slice(0, 80)}..."`)
    return text || null
  } catch (e) {
    console.error('[Whisper] Error:', e.message)
    return null
  }
}

// ============================================
// DESCRIPCIÓN DE IMAGEN (Groq Vision primero, Gemini como fallback)
// ============================================

export async function describeImage(buffer, mimetype = 'image/jpeg') {
  const pool = await getPool()
  const cleanMime = mimetype.split(';')[0].trim() || 'image/jpeg'
  const base64 = buffer.toString('base64')
  const dataUrl = `data:${cleanMime};base64,${base64}`
  const prompt = 'Describí brevemente qué muestra esta imagen en español. Sé conciso y objetivo. Si es texto o números, transcribílos exactamente. Si es un producto, describí qué es. Si es un diseño o tatuaje, describí el estilo y elementos.'

  console.log(`[Vision] Procesando imagen | mime: ${cleanMime} | tamaño: ${buffer.length} bytes`)

  // --- Intentar con Groq Vision (llama-3.2-11b-vision-preview) ---
  const groqKeys = pool.filter(e => e.provider === 'groq' && e.key)
  for (const groq of groqKeys) {
    try {
      console.log(`[Vision] Probando Groq Vision con ${groq.label}`)
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groq.key}` },
        body: JSON.stringify({
          model: 'meta-llama/llama-4-scout-17b-16e-instruct',
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: dataUrl } }
            ]
          }],
          max_tokens: 200
        })
      })

      const body = await res.text()
      if (!res.ok) {
        console.warn(`[Vision] Groq ${groq.label} → Error ${res.status}: ${body.slice(0, 300)}`)
        continue
      }

      const data = JSON.parse(body)
      const description = data.choices?.[0]?.message?.content?.trim()
      if (description) {
        console.log(`[Vision] OK con Groq ${groq.label}: "${description.slice(0, 80)}..."`)
        return description
      }
      console.warn(`[Vision] Groq ${groq.label} → respuesta vacía`)
    } catch (e) {
      console.error(`[Vision] Groq ${groq.label} → excepción: ${e.message}`)
    }
  }

  // --- Fallback: Gemini Vision ---
  const geminiKeys = pool.filter(e => e.provider === 'gemini' && e.key)
  for (const gemini of geminiKeys) {
    try {
      console.log(`[Vision] Probando Gemini Vision con ${gemini.label}`)
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${gemini.key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [
              { text: prompt },
              { inlineData: { mimeType: cleanMime, data: base64 } }
            ]}],
            generationConfig: { maxOutputTokens: 200 }
          })
        }
      )

      const body = await res.text()
      if (!res.ok) {
        console.warn(`[Vision] Gemini ${gemini.label} → Error ${res.status}: ${body.slice(0, 300)}`)
        continue
      }

      const data = JSON.parse(body)
      const description = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
      if (description) {
        console.log(`[Vision] OK con Gemini ${gemini.label}: "${description.slice(0, 80)}..."`)
        return description
      }
      console.warn(`[Vision] Gemini ${gemini.label} → respuesta vacía:`, body.slice(0, 200))
    } catch (e) {
      console.error(`[Vision] Gemini ${gemini.label} → excepción: ${e.message}`)
    }
  }

  console.error('[Vision] Todos los proveedores fallaron')
  return null
}

// ============================================
// LLAMADAS POR PROVEEDOR
// ============================================

async function callProvider(entry, message, systemPrompt, maxTokens = 250, history = []) {
  switch (entry.provider) {
    case 'gemini': return callGemini(entry, message, systemPrompt, maxTokens, history)
    case 'groq':   return callGroq(entry, message, systemPrompt, maxTokens, history)
    case 'openai': return callOpenAI(entry, message, systemPrompt, maxTokens, history)
    default: throw new Error(`Proveedor desconocido: ${entry.provider}`)
  }
}

// Convierte historial [{direction, message}] a array de mensajes multi-turn
function buildMessages(systemPrompt, history, currentMessage) {
  const msgs = [{ role: 'system', content: systemPrompt }]
  for (const h of history) {
    msgs.push({ role: h.direction === 'inbound' ? 'user' : 'assistant', content: h.message })
  }
  msgs.push({ role: 'user', content: currentMessage })
  return msgs
}

async function callGemini({ key, model }, message, systemPrompt, maxTokens = 250, history = []) {
  // Gemini usa formato contents con roles alternados
  const contents = []
  for (const h of history) {
    contents.push({ role: h.direction === 'inbound' ? 'user' : 'model', parts: [{ text: h.message }] })
  }
  contents.push({ role: 'user', parts: [{ text: message }] })

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: maxTokens }
      })
    }
  )
  if (res.status === 429) throw new RateLimitError('Gemini rate limit')
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No pude procesar tu mensaje.'
}

async function callGroq({ key, model }, message, systemPrompt, maxTokens = 250, history = []) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: buildMessages(systemPrompt, history, message),
      temperature: 0.7,
      max_tokens: maxTokens,
    })
  })
  if (res.status === 429) throw new RateLimitError('Groq rate limit')
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return data.choices?.[0]?.message?.content || 'No pude procesar tu mensaje.'
}

async function callOpenAI({ key, model }, message, systemPrompt, maxTokens = 250, history = []) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: buildMessages(systemPrompt, history, message),
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
