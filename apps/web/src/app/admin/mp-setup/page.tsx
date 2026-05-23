'use client'

import { useState, useEffect } from 'react'
import { PLANS, PLAN_ORDER } from '@/lib/plans'

type MpPlan = { plan_tier: string; mp_plan_id: string; mp_plan_url: string; created_at: string }

export default function MpSetupPage() {
  const [plans, setPlans] = useState<MpPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [result, setResult] = useState<Record<string, { ok: boolean; plan_id?: string; error?: string }> | null>(null)

  const load = () => {
    fetch('/api/admin/mp-setup')
      .then(r => r.json())
      .then(d => { if (d.plans) setPlans(d.plans) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    setCreating(true)
    setResult(null)
    const res = await fetch('/api/admin/mp-setup', { method: 'POST' })
    const data = await res.json()
    setResult(data.results)
    load()
    setCreating(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Planes de Mercado Pago</h1>
            <p className="text-gray-500 text-sm">Planes de suscripción pre-creados en MP</p>
          </div>
          <div className="flex gap-2">
            <a href="/admin" className="btn-secondary text-sm">← Admin</a>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="btn-primary text-sm"
            >
              {creating ? 'Creando...' : '+ Crear / Sincronizar planes'}
            </button>
          </div>
        </div>

        {result && (
          <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-5">
            <h2 className="font-bold text-gray-900 mb-3">Resultado</h2>
            {PLAN_ORDER.map(tier => {
              const r = result[tier]
              if (!r) return null
              return (
                <div key={tier} className={`flex items-center gap-3 py-2 text-sm ${r.ok ? 'text-emerald-700' : 'text-red-600'}`}>
                  <span>{r.ok ? '✅' : '❌'}</span>
                  <span className="font-semibold">{PLANS[tier].name}</span>
                  {r.plan_id && <span className="font-mono text-xs text-gray-400">{r.plan_id}</span>}
                  {r.error && <span className="text-xs">{r.error}</span>}
                </div>
              )
            })}
          </div>
        )}

        <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">Planes activos</h2>
          </div>
          {loading ? (
            <div className="p-6 text-gray-400 text-sm">Cargando...</div>
          ) : plans.length === 0 ? (
            <div className="p-6 text-gray-400 text-sm">No hay planes creados. Hacé clic en "Crear / Sincronizar planes".</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {plans.map(p => {
                const plan = PLANS[p.plan_tier as keyof typeof PLANS]
                return (
                  <div key={p.plan_tier} className="flex items-center gap-4 px-5 py-4">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{plan?.name ?? p.plan_tier}</p>
                      <p className="text-xs font-mono text-gray-400 mt-0.5">{p.mp_plan_id}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-700">{plan?.priceLabel}</p>
                      <p className="text-xs text-gray-400">{new Date(p.created_at).toLocaleDateString('es-AR')}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <p className="mt-4 text-xs text-gray-400">
          Los IDs se guardan en Supabase y se usan automáticamente cuando un cliente elige un plan.
          Solo necesitás ejecutar esto una vez por entorno (producción).
        </p>
      </div>
    </div>
  )
}
