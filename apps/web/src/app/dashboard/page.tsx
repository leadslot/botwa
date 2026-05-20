'use client'

import { useDashboard } from './DashboardContext'
import { SectionCard, StatusPill, MiniLineChart } from '@/components/dashboard/ui'

function RealChart({ days }: { days: { label: string; inbound: number; outbound: number }[] }) {
  const maxVal = Math.max(...days.flatMap(d => [d.inbound, d.outbound]), 1)
  const W = 220, H = 80, pad = 8
  const xs = days.map((_, i) => pad + (i / (days.length - 1)) * (W - pad * 2))
  const y = (v: number) => H - pad - (v / maxVal) * (H - pad * 2)
  const path = (vals: number[]) => vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${xs[i]},${y(v)}`).join(' ')
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-28 w-full">
        <path d="M8 60H212" stroke="#E5E7EB" strokeWidth="1" strokeDasharray="4 4" />
        <path d={path(days.map(d => d.outbound))} fill="none" stroke="#6C4DFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d={path(days.map(d => d.inbound))} fill="none" stroke="#A855F7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
        {days.map((d, i) => <circle key={i} cx={xs[i]} cy={y(d.outbound)} r="3.5" fill="#fff" stroke="#6C4DFF" strokeWidth="2.5" />)}
      </svg>
      <div className="mt-2 flex justify-between px-1">
        {days.map((d, i) => <span key={i} className="text-[10px] text-slate-400">{d.label}</span>)}
      </div>
      <div className="mt-3 flex gap-4">
        <span className="flex items-center gap-1.5 text-xs text-slate-500"><span className="h-2 w-4 rounded-full bg-[#6C4DFF]" />Respondidos</span>
        <span className="flex items-center gap-1.5 text-xs text-slate-500"><span className="h-2 w-4 rounded-full bg-[#A855F7] opacity-60" />Recibidos</span>
      </div>
    </div>
  )
}
import {
  Bot,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  MessageCircle,
  MessageSquare,
  Settings,
  Wifi,
  WifiOff,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

const TRIAL_LIMIT = 50

export default function DashboardPage() {
  const { business, loading } = useDashboard()
  const [waStatus, setWaStatus] = useState<'connected' | 'disconnected' | 'reconnecting' | null>(null)
  const [recentContacts, setRecentContacts] = useState<{number:string;msg:string;time:string;pushName?:string}[]>([])
  const [statDays, setStatDays] = useState<{label:string;inbound:number;outbound:number}[]>([])

  useEffect(() => {
    fetch('/api/whatsapp/status')
      .then(r => r.json())
      .then(d => setWaStatus(d.status))
      .catch(() => setWaStatus('disconnected'))
    fetch('/api/conversations')
      .then(r => r.json())
      .then(({ messages }) => {
        if (!messages?.length) return
        const map: Record<string, {msg:string;time:string;pushName?:string}> = {}
        for (const m of messages) {
          const n = m.from_number.replace(/@[^@]+$/, '').replace(/[^0-9+]/g, '')
          if (!map[n]) map[n] = { msg: m.message, time: m.created_at, pushName: m.push_name ?? undefined }
          else if (!map[n].pushName && m.push_name) map[n].pushName = m.push_name
        }
        setRecentContacts(Object.entries(map).slice(0, 4).map(([number, v]) => ({ number, ...v })))
      })
      .catch(() => {})
    fetch('/api/stats')
      .then(r => r.json())
      .then(({ days }) => { if (days?.length) setStatDays(days) })
      .catch(() => {})
  }, [])

  if (loading) return (
    <div className="animate-pulse space-y-6">
      <div className="h-10 w-56 rounded-2xl bg-slate-200" />
      <div className="grid gap-5 lg:grid-cols-3">
        {[1, 2, 3].map(i => <div key={i} className="h-36 rounded-[24px] border border-slate-200 bg-white" />)}
      </div>
      <div className="h-48 rounded-[24px] border border-slate-200 bg-white" />
    </div>
  )

  if (!business) return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <SectionCard className="max-w-md p-8 text-center">
        <h2 className="text-2xl font-black text-slate-950">Completá tu configuración</h2>
        <p className="mt-2 text-slate-500">Necesitamos algunos datos de tu negocio para activar Responbot.</p>
        <Link href="/dashboard/onboarding" className="mt-6 inline-flex rounded-2xl bg-gradient-to-r from-[#6C4DFF] to-[#A855F7] px-5 py-3 text-sm font-black text-white shadow-lg shadow-violet-200">
          Configurar ahora
        </Link>
      </SectionCard>
    </div>
  )

  const waLabel = waStatus === 'connected' ? 'Conectado' : waStatus === 'reconnecting' ? 'Reconectando' : 'Desconectado'
  const waTone = waStatus === 'connected' ? 'green' : waStatus === 'reconnecting' ? 'amber' : 'red'
  const messagesUsed = business.messages_used ?? 0

  return (
    <div className="h-[calc(100vh-64px-40px)] overflow-y-auto space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950">Hola 👋</h1>
          <p className="mt-1 text-lg font-medium text-slate-500">{business.name}</p>
        </div>
      </div>

      {!business.is_paid && (
        <SectionCard className="p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1">
              <p className="font-black text-slate-950">Prueba gratuita · {messagesUsed}/{TRIAL_LIMIT} mensajes usados</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#F1EDFF]">
                <div className="h-full rounded-full bg-gradient-to-r from-[#6C4DFF] to-[#A855F7]" style={{ width: `${Math.min(100, (messagesUsed / TRIAL_LIMIT) * 100)}%` }} />
              </div>
              <p className="mt-2 text-sm text-slate-500">{TRIAL_LIMIT - messagesUsed} mensajes restantes</p>
            </div>
            <Link href="/dashboard/billing" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#6C4DFF] to-[#A855F7] px-5 py-3 text-sm font-black text-white shadow-lg shadow-violet-200">
              <CreditCard className="h-4 w-4" /> Activar plan
            </Link>
          </div>
        </SectionCard>
      )}

      {waStatus === 'disconnected' && (
        <SectionCard className="border-red-200 bg-red-50 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <WifiOff className="h-5 w-5 text-red-500" />
              <div>
                <p className="font-black text-red-800">WhatsApp desconectado</p>
                <p className="text-sm text-red-600">El bot no está respondiendo mensajes.</p>
              </div>
            </div>
            <Link href="/dashboard/connect" className="rounded-2xl bg-gradient-to-r from-[#6C4DFF] to-[#A855F7] px-5 py-3 text-sm font-black text-white">
              Conectar
            </Link>
          </div>
        </SectionCard>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard className="overflow-hidden p-5">
          <div className="flex items-start justify-between gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6C4DFF] to-[#A855F7] text-white shadow-lg shadow-violet-200">
              <MessageSquare className="h-6 w-6" />
            </span>
            <MiniLineChart className="h-14 w-32" />
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-500">Mensajes respondidos</p>
          <p className="mt-1 text-3xl font-black text-slate-950">{messagesUsed}</p>
          <p className="mt-2 text-sm font-semibold text-slate-400">Total acumulado</p>
        </SectionCard>

        <SectionCard className="relative overflow-hidden p-5">
          <span className="absolute right-6 top-6 h-24 w-24 rounded-full border border-emerald-100 bg-emerald-50" />
          <span className="absolute right-14 top-14 h-8 w-8 rounded-full border-4 border-emerald-500 bg-white" />
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#22C55E] to-emerald-600 text-white shadow-lg shadow-emerald-100">
            <Wifi className="h-6 w-6" />
          </span>
          <p className="mt-3 text-sm font-semibold text-slate-500">Estado de WhatsApp</p>
          <p className={`mt-1 text-2xl font-black ${waStatus === 'connected' ? 'text-emerald-600' : 'text-slate-950'}`}>{waLabel}</p>
          <div className="mt-3"><StatusPill tone={waTone}>{waStatus === null ? 'Verificando' : waLabel}</StatusPill></div>
        </SectionCard>

        <SectionCard className="p-5">
          <div className="flex items-start justify-between gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6C4DFF] to-[#A855F7] text-white shadow-lg shadow-violet-200">
              <Bot className="h-6 w-6" />
            </span>
            <span className={`relative h-8 w-14 rounded-full ${business.ai_enabled ? 'bg-gradient-to-r from-[#6C4DFF] to-[#A855F7]' : 'bg-slate-200'}`}>
              <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow ${business.ai_enabled ? 'right-1' : 'left-1'}`} />
            </span>
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-500">Bot activo</p>
          <p className="mt-1 text-2xl font-black text-slate-950">{business.ai_enabled ? 'Activo' : 'Pausado'}</p>
          <p className="mt-2 text-sm font-semibold text-slate-500">Respondiendo 24/7</p>
        </SectionCard>
      </div>

      <SectionCard className="relative overflow-hidden p-5">
        <div className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_50%_50%,rgba(108,77,255,0.16),transparent_45%)]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            <span className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[#EAFBF1]">
              <span className="absolute h-28 w-28 rounded-full bg-emerald-100/60" />
              <MessageCircle className="relative h-11 w-11 text-[#22C55E]" />
              <CheckCircle2 className="absolute right-0 top-1 h-6 w-6 rounded-full bg-white text-[#22C55E]" />
            </span>
            <div>
              <h2 className="text-2xl font-black text-slate-950">WhatsApp conectado</h2>
              <p className="mt-1 text-slate-500">Tu bot está activo y respondiendo mensajes.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <StatusPill tone="green">En línea</StatusPill>
                <StatusPill tone="slate">Última actividad: ahora mismo</StatusPill>
              </div>
            </div>
          </div>
          <Link href="/dashboard/conversations" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#6C4DFF] to-[#A855F7] px-7 py-4 text-sm font-black text-white shadow-lg shadow-violet-200">
            Ver conversaciones <ChevronRight className="h-5 w-5" />
          </Link>
        </div>
      </SectionCard>

      <div>
        <h2 className="mb-4 text-lg font-black text-slate-950">Acciones rápidas</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            { href: '/dashboard/connect', icon: Wifi, title: 'Conectar WhatsApp', desc: 'Escaneá el QR o revisá el estado de conexión.' },
            { href: '/dashboard/conversations', icon: MessageSquare, title: 'Ver conversaciones', desc: 'Leé todos los mensajes recibidos y respondidos.' },
            { href: '/dashboard/settings', icon: Settings, title: 'Configurar bot', desc: 'Editá el prompt, precios y comportamiento.' },
            { href: '/dashboard/billing', icon: CreditCard, title: 'Suscripción', desc: 'Activá tu plan o revisá el estado de pago.' },
          ].map(({ href, icon: Icon, title, desc }) => (
            <Link key={href} href={href}>
              <SectionCard className="group flex h-full items-center gap-3 p-4 transition hover:-translate-y-0.5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F1EDFF] text-[#6C4DFF]">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-black text-slate-950">{title}</p>
                  <p className="mt-1 text-sm leading-5 text-slate-500">{desc}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400 transition group-hover:text-[#6C4DFF]" />
              </SectionCard>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <SectionCard className="p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-950">Actividad de mensajes</h2>
              <p className="text-sm text-slate-500">Últimos 7 días</p>
            </div>
            <StatusPill tone="violet">Últimos 7 días</StatusPill>
          </div>
          <div className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-500">Recibidos</p>
              <p className="text-3xl font-black text-slate-950">{statDays.reduce((s,d)=>s+d.inbound,0) || 0}</p>
              <p className="text-sm font-semibold text-slate-400">últimos 7 días</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500">Respondidos</p>
              <p className="text-3xl font-black text-slate-950">{statDays.reduce((s,d)=>s+d.outbound,0) || 0}</p>
              <p className="text-sm font-semibold text-slate-400">últimos 7 días</p>
            </div>
          </div>
          {statDays.length > 0 ? (
            <RealChart days={statDays} />
          ) : (
            <MiniLineChart className="h-36 w-full" />
          )}
        </SectionCard>

        <SectionCard className="p-5">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-950">Conversaciones recientes</h2>
            <Link href="/dashboard/conversations" className="text-sm font-black text-[#6C4DFF]">Ver todas</Link>
          </div>
          <div className="divide-y divide-slate-100">
            {recentContacts.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">Sin conversaciones todavía</p>
            ) : recentContacts.map(({ number, msg, time, pushName }) => {
              const d = new Date(time)
              const today = new Date()
              const timeLabel = d.toDateString() === today.toDateString()
                ? d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
                : d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
              const isLid = number.replace(/\D/g, '').length > 13
              const displayName = isLid ? (pushName ?? 'Cliente') : `+${number}`
              return (
                <div key={number} className="flex items-center gap-4 py-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-100 to-emerald-100 text-sm font-black text-[#6C4DFF]">
                    {number.slice(-2)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-black text-slate-950">{displayName}</p>
                    <p className="truncate text-sm text-slate-500">{msg}</p>
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
