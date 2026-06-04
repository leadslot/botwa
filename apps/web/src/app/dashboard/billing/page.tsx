'use client'

import { useState, useEffect } from 'react'
import { useDashboard } from '../DashboardContext'
import { CheckCircle2, HelpCircle, Infinity as InfinityIcon, Loader2, ShieldCheck, Zap } from 'lucide-react'
import CouponForm from './CouponForm'
import { SectionCard, StatusPill } from '@/components/dashboard/ui'
import { PLANS, ADDON_CATALOG, normalizePlan, getTotalLimit, getUsageStatus } from '@/lib/plans'

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
      {status === 'limit' && (
        <p className="text-xs text-red-600">Llegaste al límite del plan. Comprá un pack adicional para seguir respondiendo.</p>
      )}
    </div>
  )
}

export default function BillingPage() {
  const { business, loading, reload } = useDashboard()
  const [subscribing, setSubscribing] = useState(false)
  const [packing, setPacking] = useState<string | null>(null)

  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    if (q.get('suscripcion') === 'ok' || q.get('pago') === 'ok' || q.get('pack') === 'ok') reload()
  }, [reload])

  const handleSubscribe = async () => {
    setSubscribing(true)
    try {
      const endpoint = business?.first_month_paid ? '/api/mp/subscribe' : '/api/mp/first-month'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_tier: 'whatsapp' }),
      })
      const data = await res.json()
      if (data.init_point) window.location.href = data.init_point
    } finally {
      setSubscribing(false)
    }
  }

  const handlePack = async (addon_type: string) => {
    setPacking(addon_type)
    try {
      const res = await fetch('/api/mp/pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addon_type }),
      })
      const data = await res.json()
      if (data.init_point) window.location.href = data.init_point
    } finally {
      setPacking(null)
    }
  }

  if (loading) return (
    <div className="max-w-2xl animate-pulse space-y-4">
      <div className="h-8 w-40 rounded-xl bg-slate-200" />
      <div className="h-40 rounded-2xl border border-slate-200 bg-white" />
    </div>
  )

  const isLifetime = business?.plan === 'lifetime'
  const isPaid = business?.is_paid && !isLifetime
  const currentTier = normalizePlan(business?.plan_tier)
  const plan = PLANS.whatsapp

  // Calcular consumo
  const planTier = normalizePlan(business?.plan_tier)
  const { responses: responsesLimit, emails: emailsLimit } = getTotalLimit(
    planTier,
    business?.extra_responses ?? 0,
    business?.extra_emails ?? 0,
    business?.bonus_responses ?? 0,
    business?.bonus_emails ?? 0,
  )
  const responsesUsed = business?.monthly_responses_used ?? 0
  const emailsUsed = business?.monthly_emails_used ?? 0

  const responsePacks = ADDON_CATALOG.filter(a => a.type.startsWith('responses'))

  return (
    <div className="mx-auto max-w-2xl space-y-5">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Suscripción</h1>
          <p className="text-sm text-slate-500">Gestioná tu plan desde Mercado Pago</p>
        </div>
        <a
          href="https://www.mercadopago.com.ar/subscriptions"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
        >
          <HelpCircle className="h-4 w-4" /> Mis suscripciones en MP →
        </a>
      </div>

      {/* Estado del plan */}
      {isLifetime && (
        <SectionCard className="relative overflow-hidden p-5">
          <div className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_50%_50%,rgba(34,197,94,0.10),transparent_42%)]" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-50">
                <CheckCircle2 className="h-7 w-7 text-emerald-500" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Plan actual</p>
                <h2 className="text-xl font-semibold text-slate-950">Acceso de por vida</h2>
                <p className="text-sm text-slate-500">Código: <span className="font-semibold text-emerald-600">{business?.coupon_used ?? ''}</span></p>
              </div>
            </div>
            <StatusPill tone="green"><InfinityIcon className="h-4 w-4" /> Activo para siempre</StatusPill>
          </div>
        </SectionCard>
      )}

      {isPaid && (
        <SectionCard className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50">
                <CheckCircle2 className="h-7 w-7 text-emerald-500" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Plan activo</p>
                <h2 className="text-xl font-semibold text-slate-950">{PLANS[currentTier].name}</h2>
                <p className="text-sm text-slate-500">{PLANS[currentTier].priceLabel}</p>
              </div>
            </div>
            <StatusPill tone="green"><Zap className="h-4 w-4" /> Activo</StatusPill>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Para cancelar, ingresá a{' '}
            <a href="https://www.mercadopago.com.ar/subscriptions" target="_blank" rel="noopener noreferrer" className="font-medium text-violet-600 hover:underline">
              Mercado Pago → Mis suscripciones
            </a>.
          </p>
        </SectionCard>
      )}

      {/* Consumo mensual */}
      {(isPaid || isLifetime) && business && (
        <SectionCard className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Consumo mensual</h3>
            {business.cycle_start_date && (
              <span className="text-xs text-slate-400">
                Ciclo desde {new Date(business.cycle_start_date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
              </span>
            )}
          </div>
          <UsageBar label="Respuestas asistidas" used={responsesUsed} limit={responsesLimit} />
          {emailsLimit > 0 && (
            <UsageBar label="Correos procesados" used={emailsUsed} limit={emailsLimit} />
          )}
        </SectionCard>
      )}

      {/* Plan a contratar — solo para usuarios sin plan activo */}
      {!isPaid && !isLifetime && (
        <SectionCard className="p-6 border-emerald-200 bg-emerald-50/40 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">{plan.name}</h2>
              <p className="mt-1 text-sm text-slate-600">{plan.description}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs text-slate-500">{plan.firstMonthLabel}</p>
              <p className="text-lg font-bold text-slate-950">{plan.priceLabel}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {plan.features.slice(0, 6).map(f => (
              <div key={f} className="flex items-start gap-2 text-sm text-slate-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                {f}
              </div>
            ))}
          </div>

          <button
            onClick={handleSubscribe}
            disabled={subscribing}
            className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors"
          >
            {subscribing
              ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Redirigiendo a Mercado Pago...</span>
              : business?.first_month_paid
                ? `Suscribirme · ${plan.priceLabel}`
                : <span>Empezar · <span className="line-through opacity-60">{plan.priceLabel}</span> <span className="font-bold">{plan.firstMonthLabel}</span></span>
            }
          </button>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="h-4 w-4 text-slate-400" />
            Sin permanencia. Podés cancelar en cualquier momento desde Mercado Pago.
          </div>
        </SectionCard>
      )}

      {/* Código de acceso */}
      {!isPaid && !isLifetime && (
        <SectionCard className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <ShieldCheck className="h-5 w-5 text-slate-400" />
            <h3 className="font-semibold text-slate-700">¿Tenés un código de acceso?</h3>
          </div>
          <CouponForm />
        </SectionCard>
      )}

      {/* Packs de respuestas — solo para usuarios activos */}
      {(isPaid || isLifetime) && (
        <SectionCard className="p-5 space-y-4">
          <div>
            <h3 className="font-semibold text-slate-900">Packs de respuestas adicionales</h3>
            <p className="text-xs text-slate-500 mt-0.5">Pago único. El crédito se activa al confirmar el pago en Mercado Pago.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {responsePacks.map(addon => (
              <div key={addon.type} className="rounded-xl border border-slate-100 bg-slate-50 p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium text-slate-800">{addon.label}</span>
                  <span className="shrink-0 text-sm font-semibold text-violet-700">
                    ${addon.price.toLocaleString()}<span className="text-xs font-normal text-slate-400"> único</span>
                  </span>
                </div>
                <button
                  onClick={() => handlePack(addon.type)}
                  disabled={!!packing}
                  className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60 hover:bg-violet-700 transition-colors"
                >
                  {packing === addon.type
                    ? <span className="flex items-center justify-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Redirigiendo...</span>
                    : 'Comprar pack'
                  }
                </button>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

    </div>
  )
}
