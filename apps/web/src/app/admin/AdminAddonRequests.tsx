'use client'

import { useEffect, useState } from 'react'

type AddonRequest = {
  id: string
  business_id: string
  addon_type: string
  addon_label: string
  responses_added: number
  emails_added: number
  price: number
  status: string
  created_at: string
  businesses?: { name: string }
}

export default function AdminAddonRequests() {
  const [requests, setRequests] = useState<AddonRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)

  const load = () => {
    fetch('/api/admin/addon-requests')
      .then(r => r.json())
      .then(d => { if (d.requests) setRequests(d.requests) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const approve = async (id: string) => {
    setActing(id)
    await fetch(`/api/admin/addon-requests/${id}/approve`, { method: 'POST' })
    load()
    setActing(null)
  }

  const reject = async (id: string) => {
    setActing(id)
    await fetch(`/api/admin/addon-requests/${id}/approve`, { method: 'DELETE' })
    load()
    setActing(null)
  }

  const pending = requests.filter(r => r.status === 'pendiente')
  const recent = requests.filter(r => r.status !== 'pendiente').slice(0, 10)

  if (loading) return null

  return (
    <div className="mt-8 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-bold text-gray-900">Solicitudes de packs adicionales</h2>
        {pending.length > 0 && (
          <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
            {pending.length} pendiente{pending.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {pending.length === 0 && recent.length === 0 && (
        <p className="p-6 text-sm text-gray-400">No hay solicitudes todavía.</p>
      )}

      {pending.length > 0 && (
        <div className="divide-y divide-gray-50">
          {pending.map(r => (
            <div key={r.id} className="flex items-center gap-4 px-5 py-4 bg-amber-50/40">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{r.addon_label}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Negocio: {r.business_id.slice(0, 8)}… · ${r.price.toLocaleString()} · {new Date(r.created_at).toLocaleDateString('es-AR')}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => approve(r.id)}
                  disabled={acting === r.id}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {acting === r.id ? '...' : 'Aprobar'}
                </button>
                <button
                  onClick={() => reject(r.id)}
                  disabled={acting === r.id}
                  className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-200 disabled:opacity-50"
                >
                  Rechazar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {recent.length > 0 && (
        <div className="divide-y divide-gray-50">
          {recent.map(r => (
            <div key={r.id} className="flex items-center gap-4 px-5 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700">{r.addon_label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{r.business_id.slice(0, 8)}… · ${r.price.toLocaleString()}</p>
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                r.status === 'activo' ? 'bg-emerald-50 text-emerald-700'
                : r.status === 'rechazado' ? 'bg-red-50 text-red-600'
                : 'bg-gray-100 text-gray-500'
              }`}>
                {r.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
