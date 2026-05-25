'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Globe2,
  Lock,
  MessageCircle,
  MessageSquare,
  Settings,
  TrendingUp,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { useDashboard } from './DashboardContext'
import { SectionCard, StatusPill, MiniLineChart } from '@/components/dashboard/ui'
import { PLAN_ORDER, PLANS, normalizePlan } from '@/lib/plans'

const TRIAL_LIMIT = 50

function RealChart({ days }: { days: { label: string; inbound: number; outbound: number }[] }) {
  const maxVal = Math.max(...days.flatMap(d => [d.inbound, d.outbound]), 1)
  const width = 220
  const height = 68
  const pad = 8
  const xs = days.map((_, i) => pad + (i / Math.max(1, days.length - 1)) * (width - pad * 2))
  const y = (value: number) => height - pad - (value / maxVal) * (height - pad * 2)
  const path = (values: number[]) => values.map((value, i) => `${i === 0 ? 'M' : 'L'}${xs[i]},${y(value)}`).join(' ')

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-24 w-full">
        <path d="M8 52H212" stroke="#E5E7EB" strokeWidth="1" strokeDasharray="4 4" />
        <path d={path(days.map(d => d.outbound))} fill="none" stroke="#6C4DFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d={path(days.map(d => d.inbound))} fill="none" stroke="#A855F7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
        {days.map((d, i) => <circle key={i} cx={xs[i]} cy={y(d.outbound)} r="3.5" fill="#fff" stroke="#6C4DFF" strokeWidth="2.5" />)}
      </svg>
      <div className="mt-1 flex justify-between px-1">
        {days.map((d, i) => <span key={i} className="text-[10px] text-slate-400">{d.label}</span>)}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { business, loading, loadError } = useDashboard()
  const [waStatus, setWaStatus] = useState<'connected' | 'disconnected' | 'reconnecting' | null>(null)
  const [recentContacts, setRecentContacts] = useState<{ number: string; msg: string; time: string; pushName?: string }[]>([])
  const [statDays, setStatDays] = useState<{ label: string; inbound: number; outbound: number }[]>([])
  const [activeChannelsCount, setActiveChannelsCount] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/whatsapp/status')
      .then(r => r.json())
      .then(data => setWaStatus(data.status))
      .catch(() => setWaStatus('disconnected'))

    fetch('/api/conversations')
      .then(r => r.json())
      .then(({ messages }) => {
        if (!messages?.length) return
        const map: Record<string, { msg: string; time: string; pushName?: string }> = {}
        for (const message of messages) {
          const number = message.from_number.replace(/@[^@]+$/, '').replace(/[^0-9+]/g, '')
          if (!map[number]) map[number] = { msg: message.message, time: message.created_at, pushName: message.push_name ?? undefined }
          else if (!map[number].pushName && message.push_name) map[number].pushName = message.push_name
        }
        setRecentContacts(Object.entries(map).slice(0, 4).map(([number, value]) => ({ number, ...value })))
      })
      .catch(() => {})

    fetch('/api/stats')
      .then(r => r.json())
      .then(({ days }) => { if (days?.length) setStatDays(days) })
      .catch(() => {})

    fetch('/api/channels')
      .then(r => r.json())
      .then(({ channels }) => {
        if (Array.isArray(channels)) {
          const active = channels.filter((c: { status: string }) => c.status === 'active').length
          setActiveChannelsCount(active)
        }
      })
      .catch(() => {})
    // note: activeChannelsCount is later adjusted +1 for webchat and +1 for whatsapp if connected
  }, [])

  const planData = useMemo(() => {
    const currentPlan = business?.plan === 'lifetime' ? 'gold' : normalizePlan(business?.plan_tier || business?.plan)
    const nextPlan = PLAN_ORDER.find(plan => PLAN_ORDER.indexOf(plan) > PLAN_ORDER.indexOf(currentPlan))
    return { currentPlan, nextPlan }
  }, [business])

  if (loading) return (
    <div className="animate-pulse space-y-3">
      <div className="h-8 w-56 rounded-xl bg-slate-200" />
      <div className="grid gap-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-24 rounded-2xl border border-slate-200 bg-white" />)}
      </div>
      <div className="h-32 rounded-2xl border border-slate-200 bg-white" />
    </div>
  )

  // Error de servidor (5xx o red) — NO mostrar onboarding, mostrar error real
  if (loadError) return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <SectionCard className="max-w-md p-6 text-center border-red-100 bg-red-50">
        <h2 className="text-xl font-semibold text-red-800">Error al cargar datos</h2>
        <p className="mt-2 text-sm text-red-600">Hubo un problema al conectar con el servidor. Tus datos están intactos.</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-5 inline-flex rounded-xl bg-gradient-to-r from-[#6C4DFF] to-[#A855F7] px-4 py-2.5 text-sm font-semibold text-white"
        >
          Reintentar
        </button>
      </SectionCard>
    </div>
  )

  if (!business) return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <SectionCard className="max-w-md p-6 text-center">
        <h2 className="text-xl font-semibold text-slate-950">Completa tu configuracion</h2>
        <p className="mt-2 text-sm text-slate-500">Necesitamos los datos del negocio para activar Responbot.</p>
        <Link href="/dashboard/onboarding" className="mt-5 inline-flex rounded-xl bg-gradient-to-r from-[#6C4DFF] to-[#A855F7] px-4 py-2.5 text-sm font-semibold text-white">
          Configurar ahora
        </Link>
      </SectionCard>
    </div>
  )

  const messagesUsed = business.messages_used ?? 0
  const currentPlan = planData.currentPlan
  const nextPlan = planData.nextPlan
  // gmail is a sub-provider of email, not a standalone channel card
  const allowedChannels = PLANS[currentPlan].channels.filter(c => c !== 'gmail')
  const totalInbound = statDays.reduce((sum, day) => sum + day.inbound, 0)
  const totalOutbound = statDays.reduce((sum, day) => sum + day.outbound, 0)

  const quickActions = [
    { href: '/dashboard/connect', icon: Wifi, title: 'Canales', desc: currentPlan === 'whatsapp' ? 'WhatsApp y Web Chat' : 'Conexiones del plan' },
    { href: '/dashboard/conversations', icon: MessageSquare, title: 'Conversaciones', desc: 'Mensajes y contactos' },
    { href: '/dashboard/settings', icon: Settings, title: 'Bot', desc: 'Prompt y precios' },
    { href: '/dashboard/billing', icon: CreditCard, title: 'Plan', desc: PLANS[currentPlan].name },
  ]

  return (
    <div className="space-y-2.5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Hola</h1>
          <p className="text-base font-medium text-slate-500">{business.name}</p>
        </div>
        <StatusPill tone="violet">{PLANS[currentPlan].name}</StatusPill>
      </div>

      {!business.is_paid && (
        <SectionCard className="p-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-950">Prueba gratuita - {messagesUsed}/{TRIAL_LIMIT} mensajes usados</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#F1EDFF]">
                <div className="h-full rounded-full bg-gradient-to-r from-[#6C4DFF] to-[#A855F7]" style={{ width: `${Math.min(100, (messagesUsed / TRIAL_LIMIT) * 100)}%` }} />
              </div>
            </div>
            <Link href="/dashboard/billing" className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#6C4DFF] to-[#A855F7] px-4 py-2 text-sm font-semibold text-white">
              <CreditCard className="h-4 w-4" /> Activar plan
            </Link>
          </div>
        </SectionCard>
      )}

      {waStatus === 'disconnected' && (
        <SectionCard className="border-red-200 bg-red-50 p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <WifiOff className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-semibold text-red-800">WhatsApp desconectado</p>
                <p className="text-xs text-red-600">El canal principal no esta respondiendo.</p>
              </div>
            </div>
            <Link href="/dashboard/connect" className="rounded-xl bg-gradient-to-r from-[#6C4DFF] to-[#A855F7] px-4 py-2 text-sm font-semibold text-white">
              Conectar
            </Link>
          </div>
        </SectionCard>
      )}

      <div className="grid gap-2 lg:grid-cols-3">
        <SectionCard className="p-3">
          <div className="flex items-center justify-between gap-3">
            <MessageSquare className="h-5 w-5 text-[#6C4DFF]" />
            <MiniLineChart className="h-7 w-20" />
          </div>
          <p className="mt-2 text-xs font-semibold text-slate-500">Total respondidos</p>
          <p className="text-2xl font-semibold text-slate-950">{messagesUsed}</p>
        </SectionCard>
        <SectionCard className="p-3">
          <Globe2 className="h-5 w-5 text-emerald-600" />
          <p className="mt-2 text-xs font-semibold text-slate-500">Canales activos</p>
          <p className="text-2xl font-semibold text-slate-950">
            {activeChannelsCount !== null
              ? (activeChannelsCount + 1 /* webchat */ + (waStatus === 'connected' ? 1 : 0))
              : '—'
            }<span className="text-sm text-slate-400">/{allowedChannels.length}</span>
          </p>
        </SectionCard>
        <SectionCard className="p-3">
          <TrendingUp className="h-5 w-5 text-[#6C4DFF]" />
          <p className="mt-2 text-xs font-semibold text-slate-500">Últimos 7 días</p>
          <p className="text-2xl font-semibold text-slate-950">{totalInbound > 0 ? `${totalOutbound}/${totalInbound}` : '—'}</p>
          <p className="text-[10px] text-slate-400">respondidos/recibidos</p>
        </SectionCard>
      </div>

      <SectionCard className="relative overflow-hidden p-3">
        <div className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_50%_50%,rgba(108,77,255,0.14),transparent_45%)]" />
        <div className="relative flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${waStatus === 'connected' ? 'bg-[#EAFBF1]' : 'bg-slate-100'}`}>
              <MessageCircle className={`h-6 w-6 ${waStatus === 'connected' ? 'text-[#22C55E]' : 'text-slate-400'}`} />
              {waStatus === 'connected' && <CheckCircle2 className="absolute right-0 top-0 h-4 w-4 rounded-full bg-white text-[#22C55E]" />}
            </span>
            <div>
              <h2 className="text-base font-semibold text-slate-950">Bot {business.ai_enabled ? 'activo' : 'pausado'}</h2>
              <p className="text-sm text-slate-500">Responde desde los canales incluidos en tu plan.</p>
            </div>
          </div>
          <Link href="/dashboard/conversations" className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#6C4DFF] to-[#A855F7] px-4 py-2 text-sm font-semibold text-white">
            Ver conversaciones <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </SectionCard>

      <div>
        <h2 className="mb-2 text-base font-semibold text-slate-950">Acciones rapidas</h2>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {quickActions.map(({ href, icon: Icon, title, desc }) => (
            <Link key={href} href={href}>
              <SectionCard className="group flex h-full items-center gap-2.5 p-2.5 transition hover:-translate-y-0.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F1EDFF] text-[#6C4DFF]">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-950">{title}</p>
                  <p className="truncate text-xs text-slate-500">{desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:text-[#6C4DFF]" />
              </SectionCard>
            </Link>
          ))}
        </div>
      </div>

      {nextPlan && (
        <SectionCard className="flex flex-col gap-2 border-violet-100 bg-[#F8F5FF] p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Lock className="h-4 w-4 text-[#6C4DFF]" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Siguiente nivel: {PLANS[nextPlan].name}</p>
              <p className="text-xs text-slate-500">{PLANS[nextPlan].description}</p>
            </div>
          </div>
          <Link href="/dashboard/billing" className="inline-flex items-center justify-center rounded-xl bg-white px-3 py-2 text-xs font-semibold text-[#6C4DFF]">
            Ver {PLANS[nextPlan].priceLabel}
          </Link>
        </SectionCard>
      )}

      <div className="grid gap-2 xl:grid-cols-[1fr_1fr]">
        <SectionCard className="p-3">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-950">Actividad</h2>
              <p className="text-xs text-slate-500">Ultimos 7 dias</p>
            </div>
            <StatusPill tone="violet">7 dias</StatusPill>
          </div>
          <div className="mb-2 grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-500">Recibidos</p>
              <p className="text-xl font-semibold text-slate-950">{totalInbound}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Respondidos</p>
              <p className="text-xl font-semibold text-slate-950">{totalOutbound}</p>
            </div>
          </div>
          {statDays.length > 0 ? <RealChart days={statDays} /> : <MiniLineChart className="h-20 w-full" />}
        </SectionCard>

        <SectionCard className="p-3">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-950">Conversaciones recientes</h2>
            <Link href="/dashboard/conversations" className="text-sm font-semibold text-[#6C4DFF]">Ver todas</Link>
          </div>
          <div className="divide-y divide-slate-100">
            {recentContacts.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">Sin conversaciones todavia</p>
            ) : recentContacts.map(({ number, msg, time, pushName }) => {
              const date = new Date(time)
              const today = new Date()
              const timeLabel = date.toDateString() === today.toDateString()
                ? date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
                : date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
              const isLid = number.replace(/\D/g, '').length > 13
              const displayName = isLid ? (pushName ?? 'Cliente') : `+${number}`
              return (
                <div key={number} className="flex items-center gap-3 py-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-100 to-emerald-100 text-xs font-semibold text-[#6C4DFF]">
                    {number.slice(-2)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-950">{displayName}</p>
                    <p className="truncate text-xs text-slate-500">{msg}</p>
                  </div>
                  <p className="text-xs font-semibold text-slate-500">{timeLabel}</p>
                </div>
              )
            })}
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
