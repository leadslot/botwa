'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, ToggleLeft, ToggleRight, Eye, EyeOff, Loader2, GripVertical } from 'lucide-react'

const PROVIDERS = [
  { id: 'groq',   label: 'Groq',   model: 'llama-3.3-70b-versatile', hint: 'console.groq.com — Gratis 14.400 req/día' },
  { id: 'gemini', label: 'Gemini', model: 'gemini-3.1-flash-lite',   hint: 'aistudio.google.com — Free Tier multimodal' },
  { id: 'openai', label: 'OpenAI', model: 'gpt-4o-mini',             hint: 'platform.openai.com — Pago, fallback final' },
]

type ApiKeyRow = {
  id: string
  provider: string
  label: string
  key_value: string
  model: string
  is_active: boolean
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [visible, setVisible] = useState<Record<string, boolean>>({})
  const [form, setForm] = useState({ provider: 'groq', label: '', key_value: '', model: '' })

  const supabase = useMemo(() => createClient(), [])

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('api_keys')
      .select('*')
      .order('priority', { ascending: true })
    setKeys(data || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    const timer = window.setTimeout(() => { void load() }, 0)
    return () => window.clearTimeout(timer)
  }, [load])

  const addKey = async () => {
    if (!form.label || !form.key_value) return
    setSaving(true)
    const provider = PROVIDERS.find(p => p.id === form.provider)!
    await supabase.from('api_keys').insert({
      provider: form.provider,
      label: form.label,
      key_value: form.key_value,
      model: form.model || provider.model,
      is_active: true,
      priority: keys.length,
    })
    setForm({ provider: 'groq', label: '', key_value: '', model: '' })
    setShowForm(false)
    setSaving(false)
    load()
  }

  const toggle = async (id: string, current: boolean) => {
    await supabase.from('api_keys').update({ is_active: !current }).eq('id', id)
    load()
  }

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar esta key?')) return
    await supabase.from('api_keys').delete().eq('id', id)
    load()
  }

  const moveUp = async (index: number) => {
    if (index === 0) return
    const updated = [...keys]
    ;[updated[index - 1], updated[index]] = [updated[index], updated[index - 1]]
    for (let i = 0; i < updated.length; i++) {
      await supabase.from('api_keys').update({ priority: i }).eq('id', updated[i].id)
    }
    load()
  }

  const providerColors: Record<string, string> = {
    groq: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    gemini: 'bg-blue-50 text-blue-700 border-blue-200',
    openai: 'bg-violet-50 text-violet-700 border-violet-200',
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Gestión de APIs</h1>
            <p className="text-gray-500 text-sm">El bot usa las keys en orden de arriba hacia abajo. Si una falla, pasa a la siguiente.</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Agregar key
          </button>
        </div>

        {/* Info de providers */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {PROVIDERS.map(p => (
            <div key={p.id} className={`rounded-xl border p-3 text-xs ${providerColors[p.id]}`}>
              <p className="font-bold text-sm">{p.label}</p>
              <p className="mt-0.5 opacity-80">{p.hint}</p>
            </div>
          ))}
        </div>

        {/* Formulario agregar */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-indigo-200 p-6 mb-6 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4">Nueva API Key</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Proveedor</label>
                <div className="grid grid-cols-3 gap-2">
                  {PROVIDERS.map(p => (
                    <button key={p.id} onClick={() => setForm({...form, provider: p.id, model: ''})}
                      className={`py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                        form.provider === p.id ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600'
                      }`}>
                      {p.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">{PROVIDERS.find(p => p.id === form.provider)?.hint}</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Etiqueta</label>
                <input type="text" placeholder="Ej: Groq cuenta Santi, Gemini Gaby..."
                  value={form.label} onChange={e => setForm({...form, label: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">API Key</label>
                <input type="password" placeholder="gsk_... / AIza... / sk-..."
                  value={form.key_value} onChange={e => setForm({...form, key_value: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono" />
              </div>
              <div className="flex gap-3">
                <button onClick={addKey} disabled={saving || !form.label || !form.key_value}
                  className="btn-primary flex items-center gap-2 text-sm">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Guardar key
                </button>
                <button onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancelar</button>
              </div>
            </div>
          </div>
        )}

        {/* Lista de keys */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
              Cargando keys...
            </div>
          ) : keys.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <p className="font-medium">No hay keys configuradas</p>
              <p className="text-sm mt-1">Agregá al menos una key activa de Gemini, Groq u OpenAI para que el bot funcione</p>
            </div>
          ) : (
            <div>
              {keys.map((k, i) => (
                <div key={k.id} className={`flex items-center gap-4 px-5 py-4 border-b border-gray-50 last:border-0 ${!k.is_active ? 'opacity-50' : ''}`}>
                  {/* Orden */}
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => moveUp(i)} disabled={i === 0}
                      className="text-gray-300 hover:text-gray-500 disabled:opacity-20 text-xs font-bold">▲</button>
                    <span className="text-xs text-gray-300 text-center">{i + 1}</span>
                    <GripVertical className="w-3 h-3 text-gray-300" />
                  </div>

                  {/* Badge provider */}
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${providerColors[k.provider]}`}>
                    {k.provider}
                  </span>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{k.label}</p>
                    <p className="text-xs text-gray-400 font-mono">
                      {visible[k.id]
                        ? k.key_value
                        : k.key_value.slice(0, 8) + '••••••••••••••••••••' + k.key_value.slice(-4)}
                    </p>
                  </div>

                  {/* Modelo */}
                  <span className="text-xs text-gray-400 hidden md:block">{k.model}</span>

                  {/* Acciones */}
                  <div className="flex items-center gap-2">
                    <button onClick={() => setVisible({...visible, [k.id]: !visible[k.id]})}
                      className="text-gray-300 hover:text-gray-500 p-1">
                      {visible[k.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button onClick={() => toggle(k.id, k.is_active)}>
                      {k.is_active
                        ? <ToggleRight className="w-8 h-8 text-indigo-500" />
                        : <ToggleLeft className="w-8 h-8 text-gray-300" />}
                    </button>
                    <button onClick={() => remove(k.id)}
                      className="text-gray-300 hover:text-red-500 p-1 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400 mt-4 text-center">
          Los cambios se aplican en el próximo reinicio del servidor bot (Railway).
        </p>
      </div>
    </div>
  )
}
