'use client'
import { useState, useEffect } from 'react'
import { Save, Loader2, ToggleLeft, ToggleRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useDashboard } from '../DashboardContext'

export default function SettingsForm() {
  const { business, loading, reload } = useDashboard()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [name, setName] = useState('')
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiEnabled, setAiEnabled] = useState(true)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!loading && business && !ready) {
      setName(business.name ?? '')
      setAiPrompt(business.ai_prompt ?? '')
      setAiEnabled(business.ai_enabled ?? true)
      setReady(true)
    }
  }, [loading, business, ready])

  if (!ready) return (
    <div className="space-y-4">
      {/* DEBUG — borrar después */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm font-mono text-red-700">
        loading: {String(loading)} | business: {business ? business.id : 'null'} | ready: {String(ready)}
      </div>
      <div className="animate-pulse space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 h-20" />
        <div className="bg-white rounded-2xl border border-gray-100 h-20" />
        <div className="bg-white rounded-2xl border border-gray-100 h-64" />
        <div className="bg-indigo-200 rounded-2xl h-12 opacity-40" />
      </div>
    </div>
  )

  const save = async () => {
    if (!business) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('businesses').update({ name, ai_prompt: aiPrompt, ai_enabled: aiEnabled }).eq('id', business.id)
    setSaving(false)
    setSaved(true)
    reload()
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div className="card flex items-center justify-between">
        <div>
          <p className="font-semibold text-gray-900">Bot activo</p>
          <p className="text-sm text-gray-500">Si lo desactivás, los mensajes llegan pero el bot no responde</p>
        </div>
        <button onClick={() => setAiEnabled(!aiEnabled)}>
          {aiEnabled ? <ToggleRight className="w-10 h-10 text-indigo-500" /> : <ToggleLeft className="w-10 h-10 text-gray-300" />}
        </button>
      </div>

      <div className="card">
        <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre del negocio</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold text-gray-700">Prompt del asistente</label>
          <span className="text-xs text-gray-400">Define cómo habla el bot</span>
        </div>
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 mb-3">
          <p className="text-xs text-indigo-600">💡 Incluí: nombre del negocio, qué hace, preguntas frecuentes, horarios, precios</p>
        </div>
        <textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
          rows={12} placeholder="Ej: Sos el asistente de Clínica San Martín. Atendemos de lunes a viernes de 9 a 18hs..."
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none font-mono" />
      </div>

      <button onClick={save} disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {saved ? '¡Guardado!' : saving ? 'Guardando...' : 'Guardar cambios'}
      </button>
    </div>
  )
}
