import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { HELP_SYSTEM_PROMPT } from '@/lib/help-prompt'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

async function getApiKey(): Promise<{ provider: string; key: string; model: string } | null> {
  try {
    const { data } = await admin
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
    const { messages } = await req.json()
    if (!messages?.length) return NextResponse.json({ error: 'sin mensajes' }, { status: 400 })

    const apiKey = await getApiKey()
    if (!apiKey) return NextResponse.json({ reply: 'No hay servicio de IA disponible en este momento. Escribinos a maxijrodriguez09@gmail.com' })

    const payload = {
      model: apiKey.model,
      messages: [
        { role: 'system', content: HELP_SYSTEM_PROMPT },
        ...messages.slice(-10), // últimos 10 mensajes para no pasarse de contexto
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
