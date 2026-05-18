// ============================================
// CONFIGURACIÓN IA — CAMBIAR SOLO AQUÍ
// ============================================
const AI_CONFIG = {
  provider: process.env.AI_PROVIDER || 'gemini',
  model: process.env.AI_MODEL || 'gemini-2.0-flash',
  temperature: 0.7,
  maxTokens: 300,
}

export async function generateAIResponse(userMessage, business) {
  const systemPrompt = business.ai_prompt ||
    `Sos el asistente de ${business.name}. Respondé consultas de clientes de forma amable y concisa. No des información que no tenés. Si no podés ayudar, decí que se comunicarán a la brevedad.`

  switch (AI_CONFIG.provider) {
    case 'gemini': return callGemini(userMessage, systemPrompt)
    case 'openai': return callOpenAI(userMessage, systemPrompt)
    case 'mistral': return callMistral(userMessage, systemPrompt)
    default: throw new Error(`Proveedor no soportado: ${AI_CONFIG.provider}`)
  }
}

async function callGemini(message, systemPrompt) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${AI_CONFIG.model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: message }] }],
        generationConfig: { temperature: AI_CONFIG.temperature, maxOutputTokens: AI_CONFIG.maxTokens }
      })
    }
  )
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No pude procesar tu mensaje.'
}

async function callOpenAI(message, systemPrompt) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: AI_CONFIG.model,
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: message }],
      temperature: AI_CONFIG.temperature,
      max_tokens: AI_CONFIG.maxTokens,
    })
  })
  const data = await res.json()
  return data.choices?.[0]?.message?.content || 'No pude procesar tu mensaje.'
}

async function callMistral(message, systemPrompt) {
  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.MISTRAL_API_KEY}` },
    body: JSON.stringify({
      model: AI_CONFIG.model,
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: message }],
      temperature: AI_CONFIG.temperature,
      max_tokens: AI_CONFIG.maxTokens,
    })
  })
  const data = await res.json()
  return data.choices?.[0]?.message?.content || 'No pude procesar tu mensaje.'
}
