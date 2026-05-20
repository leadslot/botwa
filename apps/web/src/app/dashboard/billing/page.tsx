'use client'

import { useState, useEffect } from 'react'
import { useDashboard } from '../DashboardContext'
import { CheckCircle2, CreditCard, HelpCircle, Infinity as InfinityIcon, KeyRound, Loader2, ShieldCheck, Sparkles, Zap } from 'lucide-react'
import CouponForm from './CouponForm'
import { SectionCard, StatusPill, CheckRow } from '@/components/dashboard/ui'

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
    <div className="mx-auto max-w-7xl max-h-[calc(100vh-64px-40px)] overflow-y-auto space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-950">Suscripción</h1>
          <p className="mt-1 text-lg text-slate-500">Tu plan actual y opciones de activación</p>
        </div>
        <button className="inline-flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-600 shadow-sm">
          <HelpCircle className="h-5 w-5" /> ¿Tenés dudas? Ver preguntas frecuentes
        </button>
      </div>

      {isLifetime ? (
        <>
          <SectionCard className="relative overflow-hidden p-8">
            <div className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_50%_50%,rgba(34,197,94,0.13),transparent_42%)]" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-7">
                <span className="relative flex h-40 w-40 shrink-0 items-center justify-center rounded-full bg-[#EAFBF1]">
                  <span className="absolute h-52 w-52 rounded-full border border-emerald-100" />
                  <CheckCircle2 className="h-24 w-24 text-[#22C55E]" />
                </span>
                <div>
                  <p className="font-black text-[#22C55E]">Plan actual</p>
                  <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950">Acceso de por vida</h2>
                  <p className="mt-5 text-xl text-slate-500">Código: <span className="font-black text-[#22C55E]">{business?.coupon_used || 'RUNAS'}</span></p>
                  <p className="mt-3 text-xl text-slate-500">Tu cuenta nunca vence.</p>
                </div>
              </div>
              <StatusPill tone="green"><InfinityIcon className="h-5 w-5" /> Activo para siempre</StatusPill>
            </div>
          </SectionCard>

          <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
            <SectionCard className="p-7">
              <div className="mb-6 flex items-center gap-4">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F1EDFF] text-[#6C4DFF]">
                  <ShieldCheck className="h-7 w-7" />
                </span>
                <h2 className="text-2xl font-black text-slate-950">Estado del plan</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {[
                  ['Estado', 'Activo'],
                  ['Tipo de plan', 'Acceso de por vida'],
                  ['Código', business?.coupon_used || 'RUNAS'],
                  ['Activado el', '20 abr 2024, 11:32 a. m.'],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between py-4 text-sm">
                    <span className="font-semibold text-slate-500">{label}</span>
                    <span className="font-black text-slate-800">{value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-[#EAFBF1] p-5">
                <p className="font-black text-slate-950">Tu plan está activo de por vida.</p>
                <p className="mt-1 text-sm text-slate-600">No requiere renovación ni pagos recurrentes.</p>
              </div>
            </SectionCard>

            <SectionCard className="relative overflow-hidden p-7">
              <div className="absolute right-8 top-10 hidden h-44 w-44 rounded-full bg-emerald-100/70 lg:block" />
              <div className="relative">
                <div className="mb-6 flex items-center gap-4">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F1EDFF] text-[#6C4DFF]">
                    <Sparkles className="h-7 w-7" />
                  </span>
                  <h2 className="text-2xl font-black text-slate-950">Beneficios incluidos</h2>
                </div>
                <div className="space-y-4">
                  {[
                    'Bot activo 24/7 en tu WhatsApp',
                    'Respuestas automáticas en segundos',
                    'Soporte directo por WhatsApp',
                    'Panel de conversaciones completo',
                    'Sin límites en contactos ni mensajes',
                  ].map(item => <CheckRow key={item}>{item}</CheckRow>)}
                </div>
                <p className="mt-4 text-sm text-slate-500">Dentro de las políticas de WhatsApp.</p>
              </div>
            </SectionCard>
          </div>

          <SectionCard className="p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F1EDFF] text-[#6C4DFF]">
                  <KeyRound className="h-7 w-7" />
                </span>
                <div>
                  <h2 className="text-2xl font-black text-slate-950">Gestionar tu cuenta</h2>
                  <p className="mt-1 text-slate-500">Usá estas opciones para administrar tu suscripción o activar otro código.</p>
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button className="rounded-2xl border border-violet-200 bg-white px-6 py-3 text-sm font-black text-[#6C4DFF]">Activar otro código</button>
                <button className="rounded-2xl bg-gradient-to-r from-[#6C4DFF] to-[#A855F7] px-6 py-3 text-sm font-black text-white shadow-lg shadow-violet-200">Gestionar plan</button>
              </div>
            </div>
          </SectionCard>
        </>
      ) : isPaid ? (
        <SectionCard className="p-7">
          <div className="flex items-center gap-4">
            <Zap className="h-10 w-10 text-[#6C4DFF]" />
            <div>
              <h2 className="text-2xl font-black text-slate-950">Plan activo</h2>
              <p className="text-slate-500">Mensajes ilimitados · Bot activo 24/7</p>
            </div>
          </div>
          <div className="mt-6 rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">
            <p className="font-black text-slate-800">¿Querés cancelar?</p>
            <p className="mt-1">Podés dar de baja la suscripción directamente desde Mercado Pago → <strong>Mis suscripciones</strong>. Una vez cancelada, el bot seguirá activo hasta el fin del período ya pago.</p>
            <a href="https://www.mercadopago.com.ar/subscriptions" target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex text-[#6C4DFF] hover:underline font-black">
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
                  <h2 className="text-2xl font-black text-slate-950">Período de prueba</h2>
                  <StatusPill tone="amber">{messagesUsed}/50 mensajes usados</StatusPill>
                </div>
                <CreditCard className="h-7 w-7 text-[#6C4DFF]" />
              </div>
              <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${trialPct >= 80 ? 'bg-red-400' : 'bg-gradient-to-r from-[#6C4DFF] to-[#A855F7]'}`} style={{ width: `${Math.max(2, trialPct)}%` }} />
              </div>
              <div className="mt-5 rounded-3xl bg-[#F1EDFF] p-6">
                <p className="text-sm font-black uppercase tracking-wide text-[#6C4DFF]">Para continuar sin límites</p>
                <div className="mt-2 flex items-end gap-2">
                  <span className="text-5xl font-black text-slate-950">$40.000</span>
                  <span className="mb-2 text-slate-500">ARS primer mes</span>
                </div>
                <p className="mt-1 text-slate-500">Luego <strong className="text-slate-700">$60.000/mes</strong></p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white/80 p-5">
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                {['Bot activo 24/7','IA con tu tono y negocio','Panel de conversaciones','Sin límite de mensajes','Soporte por WhatsApp'].map(f => (
                  <li key={f}><CheckRow>{f}</CheckRow></li>
                ))}
              </ul>
              <button onClick={handlePrimerMes} disabled={paying} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#6C4DFF] to-[#A855F7] px-5 py-4 text-sm font-black text-white shadow-lg shadow-violet-200">
                {paying ? <><Loader2 className="w-4 h-4 animate-spin" /> Redirigiendo...</> : 'Pagar primer mes · $40.000'}
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
