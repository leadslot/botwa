'use client'

import { useState } from 'react'

type Business = {
  id: string
  name: string
  plan_tier: string | null
  bonus_responses: number
  bonus_emails: number
  bonus_note: string | null
  monthly_responses_used: number
  monthly_emails_used: number
}

export default function AdminBonusPanel({ businesses }: { businesses: Business[] }) {
  const [open, setOpen] = useState<string | null>(null)
  const [form, setForm] = useState({ bonus_responses: '', bonus_emails: '', bonus_note: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const handleSave = async (businessId: string, reset = false) => {
    setSaving(true)
    setMsg(null)
    const body = reset
      ? { reset: true }
      : {
          bonus_responses: form.bonus_responses ? parseInt(form.bonus_responses) : undefined,
          bonus_emails: form.bonus_emails ? parseInt(form.bonus_emails) : undefined,
          bonus_note: form.bonus_note || undefined,
        }

    const res = await fetch(`/api/admin/businesses/${businessId}/bonus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      setMsg(reset ? 'Bonificación limpiada' : 'Bonificación aplicada')
      setForm({ bonus_responses: '', bonus_emails: '', bonus_note: '' })
      setTimeout(() => { setMsg(null); window.location.reload() }, 1200)
    } else {
      setMsg('Error al guardar')
    }
    setSaving(false)
  }

  if (!businesses.length) return null

  return (
    <div className="mt-8 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-gray-100">
        <h2 className="font-bold text-gray-900">Bonificaciones por negocio</h2>
        <p className="text-xs text-gray-400 mt-0.5">Agregar créditos extra sin cobro. Útil para compensar fallos o premiar clientes.</p>
      </div>
      <div className="divide-y divide-gray-50">
        {businesses.map(b => {
          const hasBonus = (b.bonus_responses || 0) > 0 || (b.bonus_emails || 0) > 0
          const isOpen = open === b.id
          return (
            <div key={b.id}>
              <button
                onClick={() => setOpen(isOpen ? null : b.id)}
                className="w-full flex items-center gap-4 px-5 py-3 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{b.name}</p>
                  <p className="text-xs text-gray-400">{b.plan_tier ?? 'sin plan'}</p>
                </div>
                {hasBonus && (
                  <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full shrink-0">
                    +{b.bonus_responses}R +{b.bonus_emails}E bonif.
                  </span>
                )}
                <span className="text-gray-400 text-xs">{isOpen ? '▲' : '▼'}</span>
              </button>

              {isOpen && (
                <div className="px-5 pb-4 bg-slate-50 space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-xs text-gray-600 pt-2">
                    <div>Respuestas usadas: <strong>{b.monthly_responses_used}</strong></div>
                    <div>Emails usados: <strong>{b.monthly_emails_used}</strong></div>
                    {hasBonus && <>
                      <div>Bonus respuestas: <strong className="text-amber-700">+{b.bonus_responses}</strong></div>
                      <div>Bonus emails: <strong className="text-amber-700">+{b.bonus_emails}</strong></div>
                    </>}
                    {b.bonus_note && <div className="col-span-2 text-gray-400">Nota: {b.bonus_note}</div>}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-500">+ Respuestas</label>
                      <input
                        type="number"
                        value={form.bonus_responses}
                        onChange={e => setForm(f => ({ ...f, bonus_responses: e.target.value }))}
                        placeholder="ej: 500"
                        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">+ Emails</label>
                      <input
                        type="number"
                        value={form.bonus_emails}
                        onChange={e => setForm(f => ({ ...f, bonus_emails: e.target.value }))}
                        placeholder="ej: 100"
                        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Nota interna (opcional)</label>
                    <input
                      type="text"
                      value={form.bonus_note}
                      onChange={e => setForm(f => ({ ...f, bonus_note: e.target.value }))}
                      placeholder="ej: compensación por caída del 23/5"
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSave(b.id)}
                      disabled={saving}
                      className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
                    >
                      {saving ? 'Guardando...' : 'Aplicar bonificación'}
                    </button>
                    {hasBonus && (
                      <button
                        onClick={() => handleSave(b.id, true)}
                        disabled={saving}
                        className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-200 disabled:opacity-60"
                      >
                        Limpiar bonus
                      </button>
                    )}
                  </div>
                  {msg && <p className="text-xs text-emerald-600 font-medium">{msg}</p>}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
