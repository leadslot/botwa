'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, ToggleLeft, ToggleRight, Loader2, Tag, Copy, Check, ArrowLeft } from 'lucide-react'

function generateCode() {
  const words = ['GABY', 'VALE', 'AMIGO', 'VIP', 'BETA', 'EARLY', 'PRO', 'LAUNCH']
  const word = words[Math.floor(Math.random() * words.length)]
  const num = Math.floor(Math.random() * 900) + 100
  return `${word}${num}`
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [form, setForm] = useState({ code: generateCode(), note: '', max_uses: '' })
  const supabase = createClient()

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false })
    setCoupons(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const addCoupon = async () => {
    if (!form.code.trim()) return
    setSaving(true)
    await supabase.from('coupons').insert({
      code: form.code.toUpperCase().trim(),
      type: 'lifetime',
      value: 100,
      max_uses: form.max_uses ? parseInt(form.max_uses) : null,
      note: form.note || null,
      is_active: true,
    })
    setForm({ code: generateCode(), note: '', max_uses: '' })
    setShowForm(false)
    setSaving(false)
    load()
  }

  const toggle = async (id: string, current: boolean) => {
    await supabase.from('coupons').update({ is_active: !current }).eq('id', id)
    load()
  }

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar este código?')) return
    await supabase.from('coupons').delete().eq('id', id)
    load()
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">

        <a href="/admin" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 mb-6">
          <ArrowLeft className="w-4 h-4" /> Volver al panel
        </a>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Códigos de activación</h1>
            <p className="text-gray-500 text-sm">Otorgan acceso de por vida sin pago. Perfectos para amigos, beta testers o influencers.</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Nuevo código
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-indigo-200 p-6 mb-6 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4">Nuevo código de activación</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Código</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={form.code}
                    onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={() => setForm({ ...form, code: generateCode() })}
                    className="btn-secondary text-xs px-3"
                  >
                    Generar
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nota interna (opcional)</label>
                <input
                  type="text"
                  placeholder="Ej: Para Gaby, Para Vale del restaurante..."
                  value={form.note}
                  onChange={e => setForm({ ...form, note: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Límite de usos (opcional)</label>
                <input
                  type="number"
                  placeholder="Dejar vacío = usos ilimitados"
                  value={form.max_uses}
                  onChange={e => setForm({ ...form, max_uses: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={addCoupon} disabled={saving || !form.code.trim()} className="btn-primary flex items-center gap-2 text-sm">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Crear código
                </button>
                <button onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancelar</button>
              </div>
            </div>
          </div>
        )}

        {/* Lista */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
              Cargando...
            </div>
          ) : coupons.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <Tag className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No hay códigos todavía</p>
              <p className="text-sm mt-1">Creá uno para dárselo a tus primeros usuarios</p>
            </div>
          ) : (
            <div>
              {coupons.map(c => (
                <div key={c.id} className={`flex items-center gap-4 px-5 py-4 border-b border-gray-50 last:border-0 ${!c.is_active ? 'opacity-50' : ''}`}>
                  {/* Code */}
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-lg text-sm tracking-widest">
                      {c.code}
                    </span>
                    <button onClick={() => copyCode(c.code)} className="text-gray-300 hover:text-gray-600 p-1">
                      {copied === c.code ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    {c.note && <p className="text-sm text-gray-600 font-medium">{c.note}</p>}
                    <p className="text-xs text-gray-400">
                      {c.used_count} uso{c.used_count !== 1 ? 's' : ''}
                      {c.max_uses ? ` / ${c.max_uses} máx` : ' · ilimitados'}
                      {' · '}
                      <span className="font-semibold text-emerald-600">De por vida</span>
                    </p>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggle(c.id, c.is_active)}>
                      {c.is_active
                        ? <ToggleRight className="w-8 h-8 text-indigo-500" />
                        : <ToggleLeft className="w-8 h-8 text-gray-300" />}
                    </button>
                    <button onClick={() => remove(c.id)} className="text-gray-300 hover:text-red-500 p-1 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400 mt-4 text-center">
          Cuando alguien ingresa un código de por vida, su cuenta queda activa permanentemente sin ningún cobro.
        </p>
      </div>
    </div>
  )
}
