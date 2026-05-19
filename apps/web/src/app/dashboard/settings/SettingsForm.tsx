'use client'
import { useState, useEffect } from 'react'
import { Save, Loader2, ToggleLeft, ToggleRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useDashboard } from '../DashboardContext'

export default function SettingsForm() {
  const { business, loading, reload } = useDashboard()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState<{ name: string; ai_prompt: string; ai_enabled: boolean } | null>(null)

  useEffect(() => {
    if (business && !form) {
      setForm({ name: business.name, ai_prompt: business.ai_prompt || '', ai_enabled: business.ai_enabled })
    }
  }, [business])

  const save = async () => {
    if (!form || !business) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('businesses').update(form).eq('id', business.id)
    setSaving(false)
    setSaved(true)
    reload()
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading || !form) return (
    <div className="space-y-4 animate-pulse">
      <div className="bg-white rounded-2xl border border-gray-100 h-20" />
      <div className="bg-white rounded-2xl border border-gray-100 h-20" />
      <div className="bg-white rounded-2xl border border-gray-100 h-64" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="card flex items-center justify-between">
        <div>
          <p className="font-semibold text-gray-900">Bot activo</p>
          <p className="text-sm text-gray-500">Si lo desactivás, los mensajes llegan pero el bot no responde</p>
        </div>
        <button onClick={() => setForm({ ...form, ai_enabled: !form.ai_enabled })}>
          {form.ai_enabled ? <ToggleRight className="w-10 h-10 text-indigo-500" /> : <ToggleLeft className="w-10 h-10 text-gray-300" />}
        </button>
      </div>

      <div className="card">
        <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre del negocio</label>
        <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
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
        <textarea value={form.ai_prompt} onChange={e => setForm({ ...form, ai_prompt: e.target.value })}
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
