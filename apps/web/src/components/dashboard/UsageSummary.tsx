'use client'

import { PLANS, ADDON_CATALOG, getUsageStatus, getTotalLimit, normalizePlan, type PlanTier } from '@/lib/plans'
import { useState } from 'react'

type Business = {
  plan_tier?: string
  monthly_responses_used?: number
  monthly_emails_used?: number
  extra_responses?: number
  extra_emails?: number
  bonus_responses?: number
  bonus_emails?: number
  cycle_start_date?: string
}

type AddonRequest = {
  id: string
  addon_type: string
  addon_label: string
  price: number
  status: string
  created_at: string
}

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  if (limit === 0) return null
  const status = getUsageStatus(used, limit)
  const pct = Math.min(100, Math.round((used / limit) * 100))

  const barColor = status === 'limit' ? 'bg-red-400' : status === 'warning' ? 'bg-amber-400' : 'bg-violet-500'
  const textColor = status === 'limit' ? 'text-red-600' : status === 'warning' ? 'text-amber-600' : 'text-slate-600'

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className={`font-semibold ${textColor}`}>{used.toLocaleString()} / {limit.toLocaleString()}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100">
        <div className={`h-2 rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      {status === 'warning' && (
        <p className="text-xs text-amber-600">Ya usaste el {pct}% de tu uso incluido. Podés seguir usando el servicio; si superás el límite te vamos a sugerir ampliar tu plan.</p>
      )}
      {status === 'limit' && (
        <p className="text-xs text-red-600">Llegaste al límite incluido de tu plan. Podés agregar un pack adicional para mayor volumen.</p>
      )}
    </div>
  )
}

export default function UsageSummary({ business, addonRequests, onRequestAddon }: {
  business: Business
  addonRequests: AddonRequest[]
  onRequestAddon: (type: string) => Promise<void>
}) {
  const [requesting, setRequesting] = useState<string | null>(null)
  const planTier = normalizePlan(business.plan_tier) as PlanTier
  const plan = PLANS[planTier]
  const responsesUsed = business.monthly_responses_used ?? 0
  const emailsUsed = business.monthly_emails_used ?? 0
  const extraResponses = business.extra_responses ?? 0
  const extraEmails = business.extra_emails ?? 0
  const bonusResponses = business.bonus_responses ?? 0
  const bonusEmails = business.bonus_emails ?? 0
  const { responses: responsesLimit, emails: emailsLimit } = getTotalLimit(planTier, extraResponses, extraEmails, bonusResponses, bonusEmails)

  const pendingTypes = new Set(addonRequests.filter(r => r.status === 'pendiente').map(r => r.addon_type))

  const handleRequest = async (type: string) => {
    setRequesting(type)
    try { await onRequestAddon(type) } finally { setRequesting(null) }
  }

  const relevantAddons = ADDON_CATALOG.filter(a => {
    if (a.type.startsWith('responses') && plan.monthlyResponses === 0) return false
    if (a.type.startsWith('emails') && plan.monthlyEmails === 0) return false
    if (a.type === 'agenda' || a.type === 'reminders') return false
    return true
  })

  return (
    <div className="space-y-6">
      {/* Consumo mensual */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Consumo mensual</h3>
          {business.cycle_start_date && (
            <span className="text-xs text-slate-400">Ciclo desde {new Date(business.cycle_start_date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}</span>
          )}
        </div>
        <UsageBar label="Respuestas asistidas" used={responsesUsed} limit={responsesLimit} />
        <UsageBar label="Correos procesados" used={emailsUsed} limit={emailsLimit} />
        {responsesLimit === 0 && emailsLimit === 0 && (
          <p className="text-sm text-slate-400">Tu plan no incluye límites de uso en este período.</p>
        )}
      </div>

      {/* Packs adicionales */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
        <h3 className="font-semibold text-slate-900">Ampliar plan</h3>
        <p className="text-xs text-slate-500">Los planes incluyen un volumen mensual de uso asistido. Nunca se cobrará un adicional sin tu aprobación previa.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {relevantAddons.map(addon => {
            const isPending = pendingTypes.has(addon.type)
            return (
              <div key={addon.type} className="rounded-xl border border-slate-100 bg-slate-50 p-4 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium text-slate-800">{addon.label}</span>
                  <span className="shrink-0 text-sm font-semibold text-violet-700">${addon.price.toLocaleString()}<span className="text-xs font-normal text-slate-400">/mes</span></span>
                </div>
                {isPending ? (
                  <span className="text-xs text-amber-600 font-medium">Solicitud enviada — pendiente de aprobación</span>
                ) : (
                  <button
                    onClick={() => handleRequest(addon.type)}
                    disabled={requesting === addon.type}
                    className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60 hover:bg-violet-700 transition-colors"
                  >
                    {requesting === addon.type ? 'Enviando...' : 'Solicitar pack'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
