'use client'

import { useState, useEffect } from 'react'
import { useDashboard } from '../DashboardContext'
import { CheckCircle2, CreditCard, HelpCircle, Infinity as InfinityIcon, KeyRound, Loader2, ShieldCheck, Sparkles, Zap } from 'lucide-react'
import CouponForm from './CouponForm'
import { SectionCard, StatusPill, CheckRow } from '@/components/dashboard/ui'
import { PLANS } from '@/lib/plans'

const entryPlans = ['whatsapp', 'email'] as const
const growthPlans = ['social'] as const

export default function BillingPage() {
  const { business, loading, reload } = useDashboard()
  const [paying, setPaying] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('pago=ok')) {
      reload()
    }
  }, [reload])

  const handlePrimerMes = async () => {
    setPaying(true)
    try {
      const res = await fetch('/api/mp/create-preference', { method: 'POST' })
      const data = await res.json()
      if (data.init_point) window.location.href = data.init_point
    } catch { setPaying(false) }
  }

  if (loading) return (
    <div className="max-w-7xl animate-pulse space-y-6">
      <div className="h-10 w-48 rounded-2xl bg-slate-200" />
      <div className="h-56 rounded-[24px] border border-slate-200 bg-white" />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="h-72 rounded-[24px] border border-slate-200 bg-white" />
        <div className="h-72 rounded-[24px] border border-slate-200 bg-white" />
      </div>
    </div>
  )

  const isLifetime = business?.plan === 'lifetime'
  const isPaid = business?.is_paid && !isLifetime
  const messagesUsed = business?.messages_used || 0
  const trialPct = Math.min(100, Math.round((messagesUsed / 50) * 100))

  return (
    <div className="mx-auto max-w-7xl space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Suscripción</h1>
          <p className="text-sm text-slate-500">Tu plan actual y opciones de activación</p>
        </div>
        <button className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm">
          <HelpCircle className="h-5 w-5" /> ¿Tenés dudas? Ver preguntas frecuentes
        </button>
      </div>

      {isLifetime ? (
        <>
          <SectionCard className="relative overflow-hidden p-5">
            <div className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_50%_50%,rgba(34,197,94,0.13),transparent_42%)]" />
            <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-5">
                <span className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-[#EAFBF1]">
                  <span className="absolute h-32 w-32 rounded-full border border-emerald-100" />
                  <CheckCircle2 className="h-14 w-14 text-[#22C55E]" />
                </span>
                <div>
                  <p className="font-semibold text-[#22C55E]">Plan actual</p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Acceso de por vida</h2>
                  <p className="mt-2 text-base text-slate-500">Código: <span className="font-semibold text-[#22C55E]">{business?.coupon_used || 'RUNAS'}</span></p>
                  <p className="text-base text-slate-500">Tu cuenta nunca vence.</p>
                </div>
              </div>
              <StatusPill tone="green"><InfinityIcon className="h-5 w-5" /> Activo para siempre</StatusPill>
            </div>
          </SectionCard>

          <div className="grid gap-3 lg:grid-cols-[0.85fr_1.15fr]">
            <SectionCard className="p-5">
              <div className="mb-3 flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F1EDFF] text-[#6C4DFF]">
                  <ShieldCheck className="h-6 w-6" />
                </span>
                <h2 className="text-xl font-semibold text-slate-950">Estado del plan</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {[
                  ['Estado', 'Activo'],
                  ['Tipo de plan', 'Acceso de por vida'],
                  ['Código', business?.coupon_used || 'RUNAS'],
                  ['Activado el', '20 abr 2024, 11:32 a. m.'],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between py-2.5 text-sm">
                    <span className="font-semibold text-slate-500">{label}</span>
                    <span className="font-semibold text-slate-800">{value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded-2xl border border-emerald-200 bg-[#EAFBF1] p-3">
                <p className="font-semibold text-slate-950">Tu plan está activo de por vida.</p>
                <p className="text-sm text-slate-600">No requiere renovación ni pagos recurrentes.</p>
              </div>
            </SectionCard>

            <SectionCard className="relative overflow-hidden p-5">
              <div className="absolute right-8 top-10 hidden h-32 w-32 rounded-full bg-emerald-100/70 lg:block" />
              <div className="relative">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F1EDFF] text-[#6C4DFF]">
                    <Sparkles className="h-6 w-6" />
                  </span>
                  <h2 className="text-xl font-semibold text-slate-950">Beneficios incluidos</h2>
                </div>
                <div className="space-y-2">
                  {[
                    'Bot activo 24/7 por canal',
                    'WhatsApp, Web Chat, Telegram, Meta y Email',
                    'CRM de contactos y seguimiento',
                    'Panel de conversaciones completo',
                    'Plan Completo disponible para redes, mails y CRM simple',
                  ].map(item => <CheckRow key={item}>{item}</CheckRow>)}
                </div>
                <p className="mt-3 text-sm text-slate-500">Dentro de las políticas de WhatsApp.</p>
              </div>
            </SectionCard>
          </div>

          <SectionCard className="p-4">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F1EDFF] text-[#6C4DFF]">
                  <KeyRound className="h-7 w-7" />
                </span>
                <div>
                  <h2 className="text-2xl font-semibold text-slate-950">Gestionar tu cuenta</h2>
                  <p className="mt-1 text-slate-500">Usá estas opciones para administrar tu suscripción o activar otro código.</p>
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button className="rounded-2xl border border-violet-200 bg-white px-6 py-3 text-sm font-semibold text-[#6C4DFF]">Activar otro código</button>
                <button className="rounded-2xl bg-gradient-to-r from-[#6C4DFF] to-[#A855F7] px-6 py-3 text-sm font-semibold text-white shadow-sm shadow-violet-200">Gestionar plan</button>
              </div>
            </div>
          </SectionCard>

          <SectionCard className="p-5">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Planes y modulos</h2>
                <p className="text-sm text-slate-500">Entrada clara: WhatsApp o Mails. Despues escalas al plan Completo.</p>
              </div>
              <StatusPill tone="violet">Tu acceso actual queda activo</StatusPill>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600">Planes de entrada</p>
              <div className="grid gap-3 lg:grid-cols-2">
                {entryPlans.map((tier) => (
                  <div key={tier} className={`rounded-[22px] border p-4 ${
                    tier === 'whatsapp' ? 'border-emerald-200 bg-emerald-50/80' : 'border-violet-100 bg-white'
                  }`}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-semibold text-slate-950">{PLANS[tier].name}</p>
                          <StatusPill tone={tier === 'whatsapp' ? 'green' : 'violet'}>{tier === 'whatsapp' ? 'Entrada recomendada' : 'Mails'}</StatusPill>
                        </div>
                        <p className="mt-1 text-sm text-slate-500">{PLANS[tier].description}</p>
                      </div>
                      <div className="rounded-2xl bg-white px-4 py-3 text-left sm:text-right">
                        <p className="text-xs font-semibold text-slate-400">{PLANS[tier].firstMonthLabel}</p>
                        <p className="text-sm font-semibold text-slate-950">{PLANS[tier].priceLabel}</p>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {[...PLANS[tier].features.slice(0, 4), PLANS[tier].limit, PLANS[tier].users].map(feature => (
                        <span key={feature} className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#6C4DFF]">Plan completo</p>
              <div className="grid gap-3">
                {growthPlans.map((tier) => (
                  <div key={tier} className={`rounded-[22px] border p-4 ${
                    'border-violet-200 bg-[#F7F3FF]'
                  }`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-slate-950">{PLANS[tier].name}</p>
                          {PLANS[tier].badge && <StatusPill tone="green">{PLANS[tier].badge}</StatusPill>}
                        </div>
                        <p className="mt-1 text-sm text-slate-500">{PLANS[tier].description}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-slate-400">{PLANS[tier].firstMonthLabel}</p>
                        <p className="text-sm font-semibold text-slate-950">{PLANS[tier].priceLabel}</p>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2">
                      {[...PLANS[tier].features.slice(0, 3), PLANS[tier].limit, PLANS[tier].users].map(feature => (
                        <span key={feature} className="rounded-full bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </SectionCard>
        </>
      ) : isPaid ? (
        <SectionCard className="p-7">
          <div className="flex items-center gap-4">
            <Zap className="h-10 w-10 text-[#6C4DFF]" />
            <div>
              <h2 className="text-2xl font-semibold text-slate-950">Plan activo</h2>
              <p className="text-slate-500">Uso amplio incluido · Bot activo 24/7 por canal</p>
            </div>
          </div>
          <div className="mt-6 rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">
            <p className="font-semibold text-slate-800">¿Querés cancelar?</p>
            <p className="mt-1">Podés dar de baja la suscripción directamente desde Mercado Pago → <strong>Mis suscripciones</strong>. Una vez cancelada, el bot seguirá activo hasta el fin del período ya pago.</p>
            <a href="https://www.mercadopago.com.ar/subscriptions" target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex text-[#6C4DFF] hover:underline font-semibold">
              Ir a Mis suscripciones en MP →
            </a>
          </div>
        </SectionCard>
      ) : (
        <SectionCard className="p-6">
          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr] xl:items-start">
            <div>
              <div className="flex items-start justify-between gap-5">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-950">Período de prueba</h2>
                  <StatusPill tone="amber">{messagesUsed}/50 mensajes usados</StatusPill>
                </div>
                <CreditCard className="h-7 w-7 text-[#6C4DFF]" />
              </div>
              <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${trialPct >= 80 ? 'bg-red-400' : 'bg-gradient-to-r from-[#6C4DFF] to-[#A855F7]'}`} style={{ width: `${Math.max(2, trialPct)}%` }} />
              </div>
              <div className="mt-5 rounded-3xl bg-[#F1EDFF] p-6">
                <p className="text-sm font-semibold uppercase tracking-wide text-[#6C4DFF]">Para continuar sin límites</p>
                <div className="mt-2 flex items-end gap-2">
                  <span className="text-4xl font-semibold text-slate-950">$49.000</span>
                  <span className="mb-2 text-slate-500">ARS primer mes</span>
                </div>
                <p className="mt-1 text-slate-500">Luego <strong className="text-slate-700">$79.000/mes</strong></p>
                <p className="mt-2 text-sm text-slate-500">Respuestas asistidas incluidas segun plan. Si el uso escala mucho, te avisamos antes de cualquier ajuste.</p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white/80 p-5">
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                {['Bot activo 24/7','IA con tu tono y negocio','Panel multicanal','Pausa por canal','Escala simple: WhatsApp, Mails o Completo'].map(f => (
                  <li key={f}><CheckRow>{f}</CheckRow></li>
                ))}
              </ul>
              <button onClick={handlePrimerMes} disabled={paying} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#6C4DFF] to-[#A855F7] px-5 py-4 text-sm font-semibold text-white shadow-sm shadow-violet-200">
                {paying ? <><Loader2 className="w-4 h-4 animate-spin" /> Redirigiendo...</> : 'Pagar primer mes · $49.000'}
              </button>
              <p className="mt-3 text-center text-xs text-slate-400">Pago seguro · Tarjeta, débito o transferencia</p>
              <div className="mt-2"><CouponForm /></div>
            </div>
          </div>
        </SectionCard>
      )}
    </div>
  )
}
