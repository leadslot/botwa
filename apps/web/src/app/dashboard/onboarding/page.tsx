'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageCircle, Loader2, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const CATEGORIES = [
  'Salud y bienestar', 'Gastronomía', 'Servicios profesionales',
  'Comercio / Tienda', 'Educación', 'Belleza y estética',
  'Inmobiliaria', 'Tecnología', 'Otro'
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    category: '',
    description: '',
    ai_prompt: ''
  })

  const handleFinish = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const defaultPrompt = `Sos el asistente virtual de ${form.name}, un negocio de ${form.category}.
${form.description ? `Descripción del negocio: ${form.description}` : ''}
Tu función es responder consultas de clientes de forma amable y concisa.
Respondé siempre en el mismo idioma que el cliente.
Si no podés ayudar con algo, decí que un agente se comunicará pronto.`

    await supabase
      .from('businesses')
      .insert({
        user_id: user.id,
        name: form.name,
        category: form.category,
        description: form.description,
        ai_prompt: form.ai_prompt || defaultPrompt,
        ai_enabled: true,
      })

    setLoading(false)
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          {[1,2,3].map(n => (
            <div key={n} className={`h-2 rounded-full transition-all duration-300 ${n <= step ? 'bg-indigo-500 w-12' : 'bg-gray-200 w-8'}`} />
          ))}
        </div>

        <div className="card">
          {step === 1 && (
            <div className="">
              <h2 className="text-2xl font-black text-gray-900 mb-1">¿Cómo se llama tu negocio?</h2>
              <p className="text-gray-500 text-sm mb-6">El bot se presentará con este nombre</p>
              <input type="text" placeholder="Ej: Clínica San Martín, Peluquería Luna..."
                value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-6 transition-all"
                autoFocus />
              <button onClick={() => form.name && setStep(2)} disabled={!form.name}
                className="btn-primary w-full flex items-center justify-center gap-2">
                Continuar <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="">
              <h2 className="text-2xl font-black text-gray-900 mb-1">¿Qué tipo de negocio es?</h2>
              <p className="text-gray-500 text-sm mb-6">Esto ayuda a la IA a responder mejor</p>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => setForm({...form, category: cat})}
                    className={`text-left px-4 py-3 rounded-xl text-sm font-medium border-2 transition-all ${
                      form.category === cat
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-100 hover:border-gray-200 text-gray-700'
                    }`}>
                    {cat}
                  </button>
                ))}
              </div>
              <textarea placeholder="Opcional: describí brevemente tu negocio y qué preguntas suelen hacer tus clientes..."
                value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-6 transition-all resize-none" />
              <button onClick={() => form.category && setStep(3)} disabled={!form.category}
                className="btn-primary w-full flex items-center justify-center gap-2">
                Continuar <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="">
              <h2 className="text-2xl font-black text-gray-900 mb-1">Personalizá el bot</h2>
              <p className="text-gray-500 text-sm mb-2">Este es el prompt que la IA va a seguir. Podés editarlo o dejarlo como está.</p>
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 mb-3">
                <p className="text-xs text-indigo-600 font-medium">💡 Tip: cuanto más detallado, mejor responde el bot</p>
              </div>
              <textarea
                value={form.ai_prompt || `Sos el asistente virtual de ${form.name}, un negocio de ${form.category}.\n${form.description ? `Descripción: ${form.description}\n` : ''}Tu función es responder consultas de clientes de forma amable y concisa.\nRespondé siempre en el mismo idioma que el cliente.\nSi no podés ayudar, decí que un agente se comunicará pronto.`}
                onChange={e => setForm({...form, ai_prompt: e.target.value})}
                rows={8}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-6 transition-all resize-none font-mono" />
              <button onClick={handleFinish} disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? 'Configurando...' : '¡Listo! Ir al panel'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
