'use client'
import { useState, useEffect } from 'react'
import { Save, Loader2, ToggleLeft, ToggleRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function SettingsPage() {
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [business, setBusiness] = useState<any>(null)
  const [form, setForm] = useState({ name: '', ai_prompt: '', ai_enabled: true })

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { session: _s } } = await supabase.auth.getSession(); const user = _s?.user ?? null
      const { data } = await supabase.from('businesses').select('*').eq('user_id', user!.id).single()
      if (data) { setBusiness(data); setForm({ name: data.name, ai_prompt: data.ai_prompt || '', ai_enabled: data.ai_enabled }) }
    }
    load()
  }, [])

  const save = async () => {
    setLoading(true)
    const supabase = createClient()
    await supabase.from('businesses').update(form).eq('id', business.id)
    setLoading(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!business) return <div className="p-8 text-gray-400">Cargando...</div>

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">Configuración del bot</h1>
        <p className="text-gray-500">Editá cómo responde tu asistente de WhatsApp</p>
      </div>

      <div className="space-y-6">
        {/* Toggle IA */}
        <div className="card flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-900">Bot activo</p>
            <p className="text-sm text-gray-500">Si lo desactivás, los mensajes llegan pero el bot no responde</p>
          </div>
          <button onClick={() => setForm({...form, ai_enabled: !form.ai_enabled})}>
            {form.ai_enabled
              ? <ToggleRight className="w-10 h-10 text-indigo-500" />
              : <ToggleLeft className="w-10 h-10 text-gray-300" />}
          </button>
        </div>

        {/* Nombre */}
        <div className="card">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre del negocio</label>
          <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
        </div>

        {/* Prompt */}
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-gray-700">Prompt del asistente</label>
            <span className="text-xs text-gray-400">Define cómo habla el bot</span>
          </div>
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 mb-3">
            <p className="text-xs text-indigo-600">💡 Incluí: cómo se llama el negocio, qué hace, preguntas frecuentes, horarios, precios, etc.</p>
          </div>
          <textarea value={form.ai_prompt} onChange={e => setForm({...form, ai_prompt: e.target.value})}
            rows={12} placeholder="Ej: Sos el asistente de Clínica San Martín. Atendemos de lunes a viernes de 9 a 18hs..."
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none font-mono" />
        </div>

        <button onClick={save} disabled={loading}
          className="btn-primary w-full flex items-center justify-center gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saved ? '¡Guardado!' : loading ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}
