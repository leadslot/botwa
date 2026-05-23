'use client'

import { useState, useEffect } from 'react'
import { useDashboard } from '../DashboardContext'
import { CheckCircle2, HelpCircle, Infinity as InfinityIcon, Loader2, ShieldCheck, Sparkles, Zap } from 'lucide-react'
import CouponForm from './CouponForm'
import { SectionCard, StatusPill, CheckRow } from '@/components/dashboard/ui'
import { PLANS, ADDON_CATALOG, normalizePlan, type PlanTier } from '@/lib/plans'
import UsageSummary from '@/components/dashboard/UsageSummary'

type AddonRequest = { id: string; addon_type: string; addon_label: string; price: number; status: string; created_at: string }

const PLAN_ORDER: PlanTier[] = ['whatsapp', 'email', 'social', 'gold']

const PLAN_COLORS: Record<PlanTier, { border: string; bg: string; badge: string; btn: string }> = {
  whatsapp: { border: 'border-emerald-200', bg: 'bg-emerald-50/60', badge: 'bg-emerald-100 text-emerald-700', btn: 'bg-emerald-600 hover:bg-emerald-700' },
  email:    { border: 'border-violet-100',  bg: 'bg-white',         badge: 'bg-violet-100 text-violet-700',   btn: 'bg-violet-600 hover:bg-violet-700' },
  social:   { border: 'border-violet-200',  bg: 'bg-[#F7F3FF]',    badge: 'bg-violet-200 text-violet-800',   btn: 'bg-violet-700 hover:bg-violet-800' },
  gold:     { border: 'border-amber-200',   bg: 'bg-amber-50/60',  badge: 'bg-amber-100 text-amber-800',     btn: 'bg-amber-600 hover:bg-amber-700' },
}

export default function BillingPage() {
  const { business, loading, reload } = useDashboard()
  const [subscribing, setSubscribing] = useState<string | null>(null)
  const [packing, setPacking] = useState<string | null>(null)
  const [addonRequests, setAddonRequests] = useState<AddonRequest[]>([])

  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    if (q.get('suscripcion') === 'ok' || q.get('pago') === 'ok' || q.get('pack') === 'ok') reload()
  }, [reload])

  useEffect(() => {
    fetch('/api/addon-requests')
      .then(r => r.json())
      .then(d => { if (d.requests) setAddonRequests(d.requests) })
      .catch(() => {})
  }, [])

  const handleSubscribe = async (tier: PlanTier) => {
    setSubscribing(tier)
    try {
      // Usar primer mes con descuento si no pagó antes, suscripción normal si ya tiene historial
      const endpoint = business?.first_month_paid ? '/api/mp/subscribe' : '/api/mp/first-month'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_tier: tier }),
      })
      const data = await res.json()
      if (data.init_point) window.location.href = data.init_point
    } finally {
      setSubscribing(null)
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
    <div className="max-w-7xl animate-pulse space-y-6">
      <div className="h-10 w-48 rounded-2xl bg-slate-200" />
      <div className="h-56 rounded-[24px] border border-slate-200 bg-white" />
    </div>
  )

  const isLifetime = business?.plan === 'lifetime'
  const isPaid = business?.is_paid && !isLifetime
  const currentTier = normalizePlan(business?.plan_tier) as PlanTier
  const currentPlan = PLANS[currentTier]

  return (
    <div className="mx-auto max-w-5xl space-y-5">

      {/* Header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
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

      {/* Plan activo */}
      {isPaid && (
        <SectionCard className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50">
                <CheckCircle2 className="h-7 w-7 text-emerald-500" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Plan activo</p>
                <h2 className="text-xl font-semibold text-slate-950">{currentPlan.name}</h2>
                <p className="text-sm text-slate-500">{currentPlan.priceLabel} · {currentPlan.limit}</p>
              </div>
            </div>
            <StatusPill tone="green"><Zap className="h-4 w-4" /> Activo</StatusPill>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Para cambiar de plan o cancelar, ingresá a{' '}
            <a href="https://www.mercadopago.com.ar/subscriptions" target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline font-medium">
              Mercado Pago → Mis suscripciones
            </a>.
            Al cancelar, el bot sigue activo hasta el fin del período ya pago.
          </p>
        </SectionCard>
      )}

      {/* Lifetime */}
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
                <p className="text-sm text-slate-500">Código: <span className="font-semibold text-emerald-600">{business?.coupon_used || 'RUNAS'}</span></p>
              </div>
            </div>
            <StatusPill tone="green"><InfinityIcon className="h-4 w-4" /> Activo para siempre</StatusPill>
          </div>
        </SectionCard>
      )}

      {/* Consumo mensual — solo para pagos activos */}
      {(isPaid || isLifetime) && business && (
        <UsageSummary
          business={business as Parameters<typeof UsageSummary>[0]['business']}
          addonRequests={addonRequests}
          onRequestAddon={async (type) => {
            setPacking(type)
            try {
              const res = await fetch('/api/mp/pack', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ addon_type: type }),
              })
              const d = await res.json()
              if (d.init_point) window.location.href = d.init_point
            } finally { setPacking(null) }
          }}
        />
      )}

      {/* Planes — siempre visibles (para elegir o cambiar) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Planes disponibles</h2>
          {!isPaid && !isLifetime && (
            <div className="mt-1"><CouponForm /></div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {PLAN_ORDER.map((tier) => {
            const plan = PLANS[tier]
            const colors = PLAN_COLORS[tier]
            const isCurrent = isPaid && currentTier === tier
            const isLoading = subscribing === tier

            return (
              <div
                key={tier}
                className={`rounded-2xl border p-5 flex flex-col gap-4 ${colors.border} ${colors.bg} ${isCurrent ? 'ring-2 ring-violet-400 ring-offset-1' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-900">{plan.name}</h3>
                      {plan.badge && (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors.badge}`}>
                          {plan.badge}
                        </span>
                      )}
                      {isCurrent && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
                          Tu plan
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{plan.description}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-slate-400">{plan.firstMonthLabel}</p>
                    <p className="text-sm font-semibold text-slate-800">{plan.priceLabel}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {plan.features.slice(0, 4).map(f => (
                    <span key={f} className="rounded-full bg-white/80 px-2.5 py-1 text-xs text-slate-600 border border-slate-100">
                      {f}
                    </span>
                  ))}
                  <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-medium text-slate-700 border border-slate-100">
                    {plan.limit}
                  </span>
                </div>

                {isCurrent ? (
                  <div className="rounded-xl bg-white/60 px-3 py-2 text-center text-xs font-medium text-emerald-700">
                    ✓ Plan activo
                  </div>
                ) : (
                  <button
                    onClick={() => handleSubscribe(tier)}
                    disabled={!!subscribing}
                    className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-60 ${colors.btn}`}
                  >
                    {isLoading
                    ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Redirigiendo...</span>
                    : isPaid
                      ? `Cambiar a ${plan.name}`
                      : business?.first_month_paid
                        ? `Suscribirme · ${plan.priceLabel}`
                        : <span>Empezar · <span className="line-through opacity-60">{plan.priceLabel}</span> <span className="font-bold">{plan.firstMonthLabel}</span></span>
                  }
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Packs adicionales — solo para pagos activos */}
      {(isPaid || isLifetime) && (
        <SectionCard className="p-5 space-y-4">
          <div>
            <h3 className="font-semibold text-slate-900">Packs adicionales</h3>
            <p className="text-xs text-slate-500 mt-0.5">Se cobran por única vez desde Mercado Pago. El crédito se activa automáticamente al confirmar el pago.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {ADDON_CATALOG.filter(a => a.type !== 'agenda' && a.type !== 'reminders').map(addon => (
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

      {/* Funcionalidades extras (agenda/recordatorios) */}
      {(isPaid || isLifetime) && (
        <SectionCard className="p-5 space-y-4">
          <div>
            <h3 className="font-semibold text-slate-900">Módulos adicionales</h3>
            <p className="text-xs text-slate-500 mt-0.5">Funcionalidades extra que se suman a tu plan.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {ADDON_CATALOG.filter(a => a.type === 'agenda' || a.type === 'reminders').map(addon => (
              <div key={addon.type} className="rounded-xl border border-slate-100 bg-slate-50 p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium text-slate-800">{addon.label}</span>
                  <span className="shrink-0 text-sm font-semibold text-violet-700">
                    ${addon.price.toLocaleString()}<span className="text-xs font-normal text-slate-400">/mes</span>
                  </span>
                </div>
                <button
                  onClick={() => handleSubscribe(`${addon.type}` as PlanTier)}
                  disabled={!!subscribing}
                  className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60 hover:bg-violet-700 transition-colors"
                >
                  Agregar módulo
                </button>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Sin plan — solo coupon */}
      {!isPaid && !isLifetime && (
        <SectionCard className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <ShieldCheck className="h-5 w-5 text-slate-400" />
            <h3 className="font-semibold text-slate-700">¿Tenés un código de acceso?</h3>
          </div>
          <CouponForm />
        </SectionCard>
      )}

    </div>
  )
}
