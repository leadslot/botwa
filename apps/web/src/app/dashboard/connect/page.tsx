'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ElementType } from 'react'
import Link from 'next/link'
import {
  Camera,
  CheckCircle2,
  Clock3,
  Copy,
  Globe2,
  Lock,
  LogOut,
  Mail,
  MessageCircle,
  MessagesSquare,
  Pause,
  Play,
  QrCode,
  RefreshCw,
  Send,
  Smartphone,
  WifiOff,
} from 'lucide-react'
import { useDashboard } from '../DashboardContext'
import { createClient as createSupabaseClient } from '@/lib/supabase/client'

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await createSupabaseClient().auth.getSession()
  if (session?.access_token) return { Authorization: `Bearer ${session.access_token}` }
  return {}
}
import { SectionCard, StatusPill } from '@/components/dashboard/ui'
import { CHANNELS, ChannelId, PLAN_ORDER, PLANS, normalizePlan, planAllows } from '@/lib/plans'

type WAStatus = 'disconnected' | 'waiting_qr' | 'connected' | 'reconnecting' | null
type WhatsAppSignupMessage = {
  event?: string
  data?: {
    waba_id?: string
    phone_number_id?: string
  }
}
type WindowWithPolling = Window & {
  __startWAPolling?: () => void
  FB?: {
    init: (options: { appId: string; autoLogAppEvents: boolean; xfbml: boolean; version: string }) => void
    login: (
      callback: (response: { authResponse?: { code?: string } }) => void,
      options: Record<string, unknown>
    ) => void
  }
  fbAsyncInit?: () => void
}
type ChannelConnection = { id?: string; channel: string; status: string; display_name?: string | null; external_id?: string | null; metadata?: Record<string, string | null | boolean> | null }

const channelIcons: Record<ChannelId, ElementType> = {
  whatsapp: MessageCircle,
  whatsapp_api: Smartphone,
  webchat: Globe2,
  email: Mail,
  telegram: Send,
  instagram: Camera,
  facebook: MessagesSquare,
}

export default function ConnectPage() {
  const { business } = useDashboard()
  const [status, setStatus] = useState<WAStatus>(() => {
    if (typeof window !== 'undefined') return (sessionStorage.getItem('wa_status') as WAStatus) ?? null
    return null
  })
  const [qr, setQR] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [pairPhone, setPairPhone] = useState('')
  const [pairCode, setPairCode] = useState<string | null>(null)
  const [pairLoading, setPairLoading] = useState(false)
  const [pairError, setPairError] = useState<string | null>(null)
  const [channels, setChannels] = useState<ChannelConnection[]>([])
  const [telegramToken, setTelegramToken] = useState('')
  const [telegramLoading, setTelegramLoading] = useState(false)
  const [telegramError, setTelegramError] = useState<string | null>(null)
  const [waApiLoading, setWaApiLoading] = useState(false)
  const [waApiError, setWaApiError] = useState<string | null>(null)
  const [metaLoading, setMetaLoading] = useState(false)
  const [metaError, setMetaError] = useState<string | null>(null)
  const [emailLoading, setEmailLoading] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [icloudEmail, setIcloudEmail] = useState('')
  const [icloudPassword, setIcloudPassword] = useState('')
  const [imapEmail, setImapEmail] = useState('')
  const [imapPassword, setImapPassword] = useState('')
  const [imapHost, setImapHost] = useState('')
  const [imapPort, setImapPort] = useState('993')
  const [smtpHost, setSmtpHost] = useState('')
  const [smtpPort, setSmtpPort] = useState('587')
  const [imapPreset, setImapPreset] = useState('')
  const [copiedWidget, setCopiedWidget] = useState<string | null>(null)
  const [activeTool, setActiveTool] = useState<ChannelId>('whatsapp')

  const currentPlan = business?.plan === 'lifetime' ? 'social' : normalizePlan(business?.plan_tier || business?.plan)
  const includedChannels = PLAN_ORDER
    .slice(0, PLAN_ORDER.indexOf(currentPlan) + 1)
    .flatMap(plan => PLANS[plan].channels)
    .filter((channel, index, list) => list.indexOf(channel) === index)
  const lockedChannels = (Object.keys(CHANNELS) as ChannelId[]).filter(channel => !includedChannels.includes(channel))
  const nextPlan = PLAN_ORDER.find(plan => PLAN_ORDER.indexOf(plan) > PLAN_ORDER.indexOf(currentPlan))
  const [origin, setOrigin] = useState('')
  useEffect(() => { setOrigin(window.location.origin) }, [])
  const widgetUrl = business?.id && origin ? `${origin}/widget/${business.id}` : ''
  const widgetCode = widgetUrl ? `<iframe src="${widgetUrl}" style="position:fixed;right:20px;bottom:20px;width:380px;height:620px;border:0;border-radius:24px;z-index:9999;"></iframe>` : ''

  const connected = status === 'connected'
  const whatsappApi = getConnection('whatsapp_api')
  const telegram = getConnection('telegram')
  const instagram = getConnection('instagram')
  const facebook = getConnection('facebook')
  const emailConnections = channels.filter(item => item.channel === 'email' && item.status !== 'disconnected')

  function getConnection(channel: ChannelId) {
    return channels.find(item => item.channel === channel && item.status !== 'disconnected')
  }

  function isPaused(channel: ChannelId) {
    return getConnection(channel)?.status === 'paused'
  }

  function channelState(channel: ChannelId) {
    if (!planAllows(currentPlan, channel)) return { label: 'Bloqueado', tone: 'slate' as const }
    if (isPaused(channel)) return { label: 'Pausado', tone: 'slate' as const }
    if (channel === 'whatsapp') return connected ? { label: 'Conectado', tone: 'green' as const } : { label: status === 'reconnecting' ? 'Reconectando' : 'Pendiente', tone: status === 'reconnecting' ? 'amber' as const : 'amber' as const }
    if (channel === 'whatsapp_api') return whatsappApi?.status === 'active' ? { label: 'Oficial activo', tone: 'green' as const } : { label: 'Por conectar', tone: 'amber' as const }
    if (channel === 'webchat') return business?.id ? { label: 'Activo', tone: 'green' as const } : { label: 'Pendiente', tone: 'amber' as const }
    if (channel === 'email') return emailConnections.some(item => item.status === 'active') ? { label: 'Conectado', tone: 'green' as const } : { label: 'Por conectar', tone: 'amber' as const }
    if (channel === 'telegram') return telegram?.status === 'active' ? { label: 'Conectado', tone: 'green' as const } : { label: 'Falta token', tone: 'amber' as const }
    if (channel === 'instagram') return instagram?.status === 'active' ? { label: 'Conectado', tone: 'green' as const } : { label: 'Meta pendiente', tone: 'amber' as const }
    if (channel === 'facebook') return facebook?.status === 'active' ? { label: 'Conectado', tone: 'green' as const } : { label: 'Meta pendiente', tone: 'amber' as const }
    return { label: 'Pendiente', tone: 'amber' as const }
  }

  const visibleTools = useMemo(() => {
    const tools: ChannelId[] = ['whatsapp', 'webchat']
    if (planAllows(currentPlan, 'whatsapp_api')) tools.push('whatsapp_api')
    if (planAllows(currentPlan, 'telegram')) tools.push('telegram')
    if (planAllows(currentPlan, 'facebook') || planAllows(currentPlan, 'instagram')) tools.push('facebook')
    if (planAllows(currentPlan, 'email')) tools.push('email')
    return tools
  }, [currentPlan])

  useEffect(() => {
    if (!visibleTools.includes(activeTool)) setActiveTool(visibleTools[0])
  }, [activeTool, visibleTools])

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null

    const startPolling = () => {
      if (interval) clearInterval(interval)
      interval = setInterval(checkStatus, 3000)
    }

    const checkStatus = async () => {
      try {
        const res = await fetch('/api/whatsapp/status', { headers: await getAuthHeaders() })
        const data = await res.json()
        setStatus(data.status)
        if (data.status) sessionStorage.setItem('wa_status', data.status)
        setQR(data.qr)
        if (data.status === 'connected' && interval) {
          clearInterval(interval)
          interval = null
        } else if ((data.status === 'reconnecting' || data.status === 'waiting_qr') && !interval) {
          startPolling()
        }
      } catch {}
    }

    checkStatus()
    reloadChannels().catch(() => {})
    ;(window as WindowWithPolling).__startWAPolling = startPolling

    return () => {
      if (interval) clearInterval(interval)
      delete (window as WindowWithPolling).__startWAPolling
    }
  }, [])

  const startConnection = async () => {
    setLoading(true)
    try {
      await fetch('/api/whatsapp/start', { method: 'POST', headers: await getAuthHeaders() })
      ;(window as WindowWithPolling).__startWAPolling?.()
    } finally {
      setLoading(false)
    }
  }

  const resetAndConnect = async () => {
    setResetting(true)
    try {
      await fetch('/api/whatsapp/reset', { method: 'POST', headers: await getAuthHeaders() })
      setStatus('disconnected')
      setQR(null)
      setTimeout(() => startConnection(), 1000)
    } finally {
      setResetting(false)
    }
  }

  const requestPairCode = async () => {
    if (!pairPhone.trim()) return
    setPairLoading(true)
    setPairError(null)
    setPairCode(null)
    try {
      const res = await fetch('/api/whatsapp/pair-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...await getAuthHeaders() },
        body: JSON.stringify({ phone: pairPhone.replace(/\D/g, '') }),
      })
      const data = await res.json()
      if (data.code) {
        setPairCode(data.code)
        ;(window as WindowWithPolling).__startWAPolling?.()
      } else {
        setPairError(data.error || 'Error al solicitar codigo')
      }
    } finally {
      setPairLoading(false)
    }
  }

  const disconnectBot = async () => {
    if (!confirm('Desconectar el bot? Dejara de responder mensajes.')) return
    setDisconnecting(true)
    try {
      await fetch('/api/whatsapp/disconnect', { method: 'POST', headers: await getAuthHeaders() })
      setStatus('disconnected')
      setQR(null)
    } finally {
      setDisconnecting(false)
    }
  }

  async function reloadChannels() {
    const res = await fetch('/api/channels', { headers: await getAuthHeaders() })
    const data = await res.json()
    setChannels(data.channels ?? [])
  }

  const connectTelegram = async () => {
    if (!telegramToken.trim()) return
    setTelegramLoading(true)
    setTelegramError(null)
    try {
      const res = await fetch('/api/telegram/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: telegramToken }),
      })
      const data = await res.json()
      if (!res.ok) setTelegramError(data.error || 'No se pudo conectar Telegram')
      else {
        setTelegramToken('')
        await reloadChannels()
      }
    } finally {
      setTelegramLoading(false)
    }
  }

  const disconnectTelegram = async () => {
    setTelegramLoading(true)
    setTelegramError(null)
    try {
      await fetch('/api/telegram/connect', { method: 'DELETE' })
      await reloadChannels()
    } finally {
      setTelegramLoading(false)
    }
  }

  const loadFacebookSdk = async (appId: string, version: string) => {
    const fbWindow = window as WindowWithPolling
    if (fbWindow.FB) return
    await new Promise<void>((resolve, reject) => {
      fbWindow.fbAsyncInit = () => {
        fbWindow.FB?.init({ appId, autoLogAppEvents: true, xfbml: false, version })
        resolve()
      }
      const existing = document.getElementById('facebook-jssdk')
      if (existing) return resolve()
      const script = document.createElement('script')
      script.id = 'facebook-jssdk'
      script.src = 'https://connect.facebook.net/es_LA/sdk.js'
      script.async = true
      script.defer = true
      script.onerror = () => reject(new Error('No se pudo cargar Meta SDK'))
      document.body.appendChild(script)
    })
  }

  const connectWhatsAppApi = () => {
    if (!business?.id) return
    window.location.href = `/api/whatsapp-business/connect/start?bid=${business.id}`
  }


  const disconnectWhatsAppApi = async () => {
    setWaApiLoading(true)
    setWaApiError(null)
    try {
      await fetch('/api/whatsapp-business/connect', { method: 'DELETE', headers: await getAuthHeaders() })
      await reloadChannels()
    } finally {
      setWaApiLoading(false)
    }
  }

  const toggleChannelPause = async (channel: ChannelId, paused: boolean) => {
    await fetch('/api/channels/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel, paused }),
    })
    await reloadChannels()
  }

  const copyText = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value)
    setCopiedWidget(label)
    setTimeout(() => setCopiedWidget(null), 1800)
  }

  const connectMeta = async () => {
    setMetaLoading(true)
    setMetaError(null)
    window.location.href = `/api/meta/connect/start?bid=${business?.id ?? ''}`
  }

  const connectEmail = async (provider: 'gmail' | 'outlook') => {
    setEmailLoading(provider)
    setEmailError(null)
    try {
      const res = await fetch(`/api/email/${provider}/start`)
      const data = await res.json()
      if (!res.ok) {
        setEmailError(data.error || `Falta configurar ${provider === 'gmail' ? 'Google' : 'Microsoft'}`)
        return
      }
      window.location.href = data.url
    } finally {
      setEmailLoading(null)
    }
  }

  const disconnectEmail = async (provider?: 'gmail' | 'outlook' | 'icloud' | 'imap') => {
    setEmailLoading(provider ?? 'all')
    setEmailError(null)
    try {
      const suffix = provider ? `?provider=${provider}` : ''
      await fetch(`/api/email/connect${suffix}`, { method: 'DELETE' })
      await reloadChannels()
    } finally {
      setEmailLoading(null)
    }
  }

  const connectIcloud = async () => {
    setEmailLoading('icloud')
    setEmailError(null)
    try {
      const res = await fetch('/api/email/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'icloud', email: icloudEmail, appPassword: icloudPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        setEmailError(data.error || 'No se pudo conectar iCloud')
        return
      }
      setIcloudEmail('')
      setIcloudPassword('')
      await reloadChannels()
    } finally {
      setEmailLoading(null)
    }
  }

  const IMAP_PRESETS: Record<string, { label: string; imap_host: string; imap_port: string; smtp_host: string; smtp_port: string }> = {
    yahoo: { label: 'Yahoo Mail', imap_host: 'imap.mail.yahoo.com', imap_port: '993', smtp_host: 'smtp.mail.yahoo.com', smtp_port: '465' },
    zoho: { label: 'Zoho Mail', imap_host: 'imap.zoho.com', imap_port: '993', smtp_host: 'smtp.zoho.com', smtp_port: '465' },
    titan: { label: 'Titan Mail', imap_host: 'imap.titan.email', imap_port: '993', smtp_host: 'smtp.titan.email', smtp_port: '465' },
    hostinger: { label: 'Hostinger Mail', imap_host: 'imap.hostinger.com', imap_port: '993', smtp_host: 'smtp.hostinger.com', smtp_port: '465' },
    custom: { label: 'Dominio propio / otro', imap_host: '', imap_port: '993', smtp_host: '', smtp_port: '587' },
  }

  const applyImapPreset = (key: string) => {
    setImapPreset(key)
    const p = IMAP_PRESETS[key]
    if (p) {
      setImapHost(p.imap_host)
      setImapPort(p.imap_port)
      setSmtpHost(p.smtp_host)
      setSmtpPort(p.smtp_port)
    }
  }

  const connectImap = async () => {
    setEmailLoading('imap')
    setEmailError(null)
    try {
      const res = await fetch('/api/email/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'imap',
          email: imapEmail,
          password: imapPassword,
          imapHost,
          imapPort: Number(imapPort),
          smtpHost,
          smtpPort: Number(smtpPort),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setEmailError(data.error || 'No se pudo conectar')
        return
      }
      setImapEmail('')
      setImapPassword('')
      setImapHost('')
      setSmtpHost('')
      setImapPreset('')
      await reloadChannels()
    } finally {
      setEmailLoading(null)
    }
  }

  function ChannelButton({ channel, locked = false }: { channel: ChannelId; locked?: boolean }) {
    const Icon = channelIcons[channel]
    const state = channelState(channel)
    return (
      <button
        onClick={() => !locked && setActiveTool(channel === 'instagram' ? 'facebook' : channel)}
        className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition ${
          activeTool === channel && !locked ? 'border-violet-300 bg-[#F8F5FF]' : 'border-slate-200 bg-white hover:border-violet-200'
        } ${locked ? 'opacity-75' : ''}`}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F1EDFF] text-[#6C4DFF]">
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-slate-950">{CHANNELS[channel].shortName}</span>
          <span className="block truncate text-xs text-slate-500">{CHANNELS[channel].description}</span>
        </span>
        {locked ? <Lock className="h-4 w-4 text-slate-400" /> : <StatusPill tone={state.tone}>{state.label}</StatusPill>}
      </button>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Canales</h1>
          <p className="mt-1 text-sm text-slate-500">
            Mostramos primero lo que incluye tu plan. El resto queda como desbloqueo, sin tapar la operacion diaria.
          </p>
        </div>
        <StatusPill tone="violet">{PLANS[currentPlan].name} - {PLANS[currentPlan].priceLabel}</StatusPill>
      </div>

      <SectionCard className="p-3">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-950">Incluidos en tu plan</h2>
          <span className="text-xs text-slate-500">{includedChannels.length} canales</span>
        </div>
        <div className="grid gap-2 grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {includedChannels.map(channel => <ChannelButton key={channel} channel={channel} />)}
        </div>
        {lockedChannels.length > 0 && (
          <>
            <div className="my-3 flex items-center gap-2">
              <div className="h-px flex-1 bg-slate-100" />
              <span className="text-xs text-slate-400 font-medium">Disponibles en planes superiores</span>
              <div className="h-px flex-1 bg-slate-100" />
              {nextPlan && <Link href="/dashboard/billing" className="text-xs font-semibold text-[#6C4DFF] shrink-0">Ver planes →</Link>}
            </div>
            <div className="grid gap-2 grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {lockedChannels.map(channel => <ChannelButton key={channel} channel={channel} locked />)}
            </div>
          </>
        )}
      </SectionCard>

      {metaError && <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">{metaError}</p>}
      {copiedWidget && <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">Widget copiado: {copiedWidget === 'link' ? 'link directo' : 'codigo embebido'}</p>}

      {activeTool === 'whatsapp' && (
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_520px]">
          <SectionCard className="relative min-h-[250px] overflow-hidden p-4 text-center">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_26%,rgba(34,197,94,0.14),transparent_30%),radial-gradient(circle_at_0%_90%,rgba(108,77,255,0.10),transparent_32%)]" />
            <div className="relative mx-auto max-w-2xl">
              {status === null && (
                <div className="py-8">
                  <RefreshCw className="mx-auto mb-3 h-8 w-8 animate-spin text-[#6C4DFF]" />
                  <p className="font-semibold text-slate-500">Verificando conexion...</p>
                </div>
              )}
              {connected && (
                <div className="py-4">
                  <div className="relative mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#EAFBF1]">
                    <Smartphone className="h-7 w-7 text-[#22C55E]" />
                    <CheckCircle2 className="absolute -right-1 -top-1 h-5 w-5 rounded-full bg-[#22C55E] text-white" />
                  </div>
                  <h2 className="text-xl font-semibold text-slate-950">WhatsApp conectado</h2>
                  <p className="mt-1 text-sm text-slate-500">El bot esta activo en el canal principal.</p>
                  <div className="mt-2"><StatusPill tone="green">En linea</StatusPill></div>
                  <p className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-600">
                    <Clock3 className="h-4 w-4 text-[#22C55E]" />
                    Ultima sincronizacion: <span className="font-semibold text-[#22C55E]">hace unos segundos</span>
                  </p>
                </div>
              )}
              {status === 'waiting_qr' && qr && (
                <div className="py-3">
                  <StatusPill tone="amber"><RefreshCw className="h-3 w-3 animate-spin" /> Esperando escaneo</StatusPill>
                  <div className="mx-auto mt-4 inline-block rounded-2xl border border-violet-200 bg-white p-3 shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qr} alt="QR WhatsApp" className="h-48 w-48 rounded-xl" />
                  </div>
                </div>
              )}
              {status === 'reconnecting' && (
                <div className="py-14">
                  <RefreshCw className="mx-auto mb-4 h-9 w-9 animate-spin text-[#6C4DFF]" />
                  <h2 className="text-xl font-semibold text-slate-950">Reconectando...</h2>
                  <p className="mt-2 text-sm text-slate-500">Estamos levantando tu sesion automaticamente.</p>
                </div>
              )}
              {status !== null && (status === 'disconnected' || (status as string) === 'no_business' || (!['connected','waiting_qr','reconnecting'].includes(status as string))) && (
                <div className="py-10">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                    <WifiOff className="h-7 w-7 text-slate-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-slate-950">Sin conexion</h2>
                  <p className="mt-2 text-sm text-slate-500">Tu bot no esta activo todavia.</p>
                  <button onClick={startConnection} disabled={loading} className="mt-5 inline-flex rounded-xl bg-gradient-to-r from-[#6C4DFF] to-[#A855F7] px-5 py-2.5 text-sm font-semibold text-white">
                    {loading ? 'Iniciando...' : 'Conectar WhatsApp'}
                  </button>
                </div>
              )}
              {status === 'waiting_qr' && !qr && (
                <div className="py-10">
                  <RefreshCw className="mx-auto mb-4 h-9 w-9 animate-spin text-[#6C4DFF]" />
                  <p className="font-semibold text-slate-500">Generando codigo QR...</p>
                </div>
              )}
            </div>
          </SectionCard>

          <div className="grid gap-3 sm:grid-cols-2">
            <ToolCard icon={CheckCircle2} title="Estado" desc={connected ? 'WhatsApp conectado' : status === 'reconnecting' ? 'Reconectando' : 'Sin conexion'}>
              <StatusPill tone={connected ? 'green' : status === 'reconnecting' ? 'amber' : 'red'}>{connected ? 'Conectado' : status === 'reconnecting' ? 'Reconectando' : 'Desconectado'}</StatusPill>
            </ToolCard>
            <ToolCard icon={QrCode} title="Vincular por QR" desc="Genera un nuevo codigo.">
              <button onClick={resetAndConnect} disabled={resetting} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#6C4DFF] to-[#A855F7] px-4 py-2 text-sm font-semibold text-white">
                <QrCode className="h-4 w-4" /> {resetting ? 'Reiniciando...' : 'Nuevo QR'}
              </button>
            </ToolCard>
            <ToolCard icon={Pause} title="Pausar bot" desc="Pausa solo WhatsApp.">
              <button onClick={disconnectBot} disabled={!connected || disconnecting} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 disabled:opacity-50">
                <LogOut className="h-4 w-4" /> {disconnecting ? 'Desconectando...' : 'Pausar bot'}
              </button>
            </ToolCard>
            <ToolCard icon={Smartphone} title="Vincular sin QR" desc="Recibi un codigo en tu telefono.">
              {!pairCode ? (
                <div className="space-y-2">
                  <input value={pairPhone} onChange={event => setPairPhone(event.target.value)} placeholder="Ej: 5491137549016" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-400" />
                  {pairError && <p className="text-xs text-red-500">{pairError}</p>}
                  <button onClick={requestPairCode} disabled={pairLoading || !pairPhone.trim()} className="w-full rounded-xl bg-gradient-to-r from-[#6C4DFF] to-[#A855F7] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                    {pairLoading ? 'Solicitando...' : 'Obtener codigo'}
                  </button>
                </div>
              ) : (
                <div className="rounded-xl bg-[#F1EDFF] px-4 py-3 text-center text-xl font-semibold tracking-[0.3em] text-[#6C4DFF]">{pairCode}</div>
              )}
            </ToolCard>
          </div>
        </div>
      )}

      {activeTool === 'webchat' && (
        <SectionCard className="p-4">
          <h2 className="text-lg font-semibold text-slate-950">Web Chat</h2>
          <p className="mt-1 text-sm text-slate-500">Es un widget propio para pegar en cualquier web del cliente. No depende de una red social.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Link href={business?.id ? `/widget/${business.id}` : '#'} target="_blank" className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-[#6C4DFF]">Abrir widget</Link>
            <button onClick={() => copyText(widgetUrl, 'link')} className="rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700"><Copy className="mr-2 inline h-4 w-4" />Copiar link</button>
            <button onClick={() => copyText(widgetCode, 'codigo')} className="rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700"><Copy className="mr-2 inline h-4 w-4" />Copiar codigo</button>
          </div>
        </SectionCard>
      )}

      {activeTool === 'whatsapp_api' && (
        <SectionCard className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">WhatsApp Business API oficial</h2>
              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                Canal oficial de Meta. Responbot solo responde mensajes entrantes dentro de la ventana de atencion; plantillas, campañas o mensajes iniciados por el negocio quedan desactivados por defecto y corren por cuenta del cliente.
              </p>
            </div>
            <StatusPill tone={whatsappApi?.status === 'active' ? 'green' : 'amber'}>
              {whatsappApi?.status === 'active' ? 'API conectada' : 'Por conectar'}
            </StatusPill>
          </div>

          {whatsappApi && (
            <div className="mt-4 grid gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm md:grid-cols-3">
              <div>
                <p className="font-semibold text-slate-950">Nombre</p>
                <p className="text-slate-600">{whatsappApi.display_name || 'WhatsApp Business'}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-950">Phone Number ID</p>
                <p className="text-slate-600">{whatsappApi.external_id}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-950">Modo</p>
                <p className="text-slate-600">Solo respuestas entrantes</p>
              </div>
            </div>
          )}

          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-semibold">Requiere habilitacion de Meta para Responbot</p>
            <p className="mt-1">
              Para activar este canal en produccion, Responbot necesita completar la verificacion como proveedor tecnologico de Meta (Business Verification + aprobacion de permisos avanzados). Mientras no este aprobado, el boton puede fallar con error de Meta.
            </p>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-950">Como funciona cuando este habilitado</p>
            <p className="mt-1">El cliente toca Conectar, inicia sesion en Meta, elige su numero de WhatsApp Business y Responbot lo registra automaticamente. Solo responde mensajes entrantes; no envios masivos ni plantillas desde este panel.</p>
          </div>

          {whatsappApi && (
            <div className="mt-4 flex flex-wrap gap-3">
              <button onClick={connectWhatsAppApi} disabled={waApiLoading} className="rounded-xl bg-gradient-to-r from-[#6C4DFF] to-[#A855F7] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
                {waApiLoading ? 'Abriendo Meta...' : 'Reconectar WhatsApp oficial'}
              </button>
              <button onClick={disconnectWhatsAppApi} disabled={waApiLoading} className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-600">Desactivar API</button>
            </div>
          )}
          {!whatsappApi && (
            <div className="mt-4 flex flex-wrap gap-3">
              <button onClick={connectWhatsAppApi} disabled={waApiLoading} className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 disabled:opacity-60">
                {waApiLoading ? 'Abriendo Meta...' : 'Conectar con Meta'}
              </button>
              <button onClick={() => {}} className="rounded-xl border border-violet-200 bg-violet-50 px-5 py-3 text-sm font-semibold text-violet-700 hidden">
                Ingresar IDs manualmente
              </button>
            </div>
          )}
          {waApiError && <p className="mt-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{waApiError}</p>}
        </SectionCard>
      )}

      {activeTool === 'telegram' && (
        <SectionCard className="p-4">
          <h2 className="text-lg font-semibold text-slate-950">Telegram por negocio</h2>
          <p className="mt-1 text-sm text-slate-500">{telegram ? `Activo: ${telegram.display_name || 'Telegram'}` : 'Pega el token de BotFather para activar este canal.'}</p>
          <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto_auto]">
            <input value={telegramToken} onChange={event => setTelegramToken(event.target.value)} placeholder="Token de BotFather" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-violet-400" />
            <button onClick={connectTelegram} disabled={telegramLoading || !telegramToken.trim()} className="rounded-xl bg-gradient-to-r from-[#6C4DFF] to-[#A855F7] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
              {telegramLoading ? 'Guardando...' : telegram ? 'Actualizar' : 'Conectar'}
            </button>
            {telegram && <button onClick={disconnectTelegram} disabled={telegramLoading} className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-600">Desactivar</button>}
          </div>
          {telegramError && <p className="mt-2 text-sm font-semibold text-red-600">{telegramError}</p>}
        </SectionCard>
      )}

      {activeTool === 'facebook' && (
        <SectionCard className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Facebook Messenger e Instagram Direct</h2>
              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                Requieren permisos avanzados de Meta: <code className="rounded bg-slate-100 px-1 text-xs">pages_messaging</code> e <code className="rounded bg-slate-100 px-1 text-xs">instagram_manage_messages</code>. Disponibles cuando la app de Responbot complete la verificacion de Meta.
              </p>
            </div>
            <StatusPill tone="amber">Pendiente de Meta</StatusPill>
          </div>

          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-semibold">Estado actual: en revision</p>
            <p className="mt-1">Responbot esta completando la verificacion de negocio con Meta para obtener los permisos necesarios. Una vez aprobado, el flujo de conexion queda habilitado para todos los usuarios del plan Completo.</p>
          </div>

          {(facebook?.status === 'active' || instagram?.status === 'active') && (
            <div className="mt-4 flex flex-wrap gap-3">
              <StatusPill tone={facebook?.status === 'active' ? 'green' : 'slate'}>Facebook: {facebook?.status === 'active' ? 'Conectado' : 'Pendiente'}</StatusPill>
              <StatusPill tone={instagram?.status === 'active' ? 'green' : 'slate'}>Instagram: {instagram?.status === 'active' ? 'Conectado' : 'Pendiente'}</StatusPill>
              <button onClick={connectMeta} disabled={metaLoading} className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 disabled:opacity-60">
                {metaLoading ? 'Abriendo...' : 'Reconectar Meta'}
              </button>
            </div>
          )}
        </SectionCard>
      )}

      {activeTool === 'email' && (
        <SectionCard className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Email: Gmail, Outlook, iCloud y cualquier proveedor</h2>
              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                Conecta casillas para leer, clasificar, detectar prioridad y preparar borradores. Por seguridad, el envio automatico queda apagado hasta definir reglas.
              </p>
            </div>
            <StatusPill tone={emailConnections.some(item => item.status === 'active') ? 'green' : 'amber'}>
              {emailConnections.some(item => item.status === 'active') ? 'Conectado' : 'Por conectar'}
            </StatusPill>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-950">Gmail</h3>
                  <p className="mt-1 text-sm text-slate-500">Lectura, clasificacion, etiquetas y borradores sugeridos.</p>
                </div>
                <Mail className="h-5 w-5 text-[#6C4DFF]" />
              </div>
              <button onClick={() => connectEmail('gmail')} disabled={emailLoading === 'gmail'} className="mt-4 w-full rounded-xl bg-gradient-to-r from-[#6C4DFF] to-[#A855F7] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                {emailLoading === 'gmail' ? 'Abriendo Google...' : 'Conectar Gmail'}
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-950">Outlook / Microsoft 365</h3>
                  <p className="mt-1 text-sm text-slate-500">Microsoft Graph para bandeja, prioridad y borradores.</p>
                </div>
                <Mail className="h-5 w-5 text-[#6C4DFF]" />
              </div>
              <button onClick={() => connectEmail('outlook')} disabled={emailLoading === 'outlook'} className="mt-4 w-full rounded-xl bg-gradient-to-r from-[#6C4DFF] to-[#A855F7] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                {emailLoading === 'outlook' ? 'Abriendo Microsoft...' : 'Conectar Outlook'}
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-950">iCloud Mail</h3>
                  <p className="mt-1 text-sm text-slate-500">Conexion IMAP/SMTP con contrasena especifica de app.</p>
                </div>
                <Mail className="h-5 w-5 text-[#6C4DFF]" />
              </div>
              <div className="mt-4 space-y-2">
                <input value={icloudEmail} onChange={event => setIcloudEmail(event.target.value)} placeholder="tu-cuenta@icloud.com" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-400" />
                <input value={icloudPassword} onChange={event => setIcloudPassword(event.target.value)} type="password" placeholder="Contrasena especifica de app" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-400" />
                <p className="text-xs text-slate-500">Se crea en appleid.apple.com, seccion Inicio de sesion y seguridad.</p>
                <button onClick={connectIcloud} disabled={emailLoading === 'icloud' || !icloudEmail.trim() || !icloudPassword.trim()} className="w-full rounded-xl bg-gradient-to-r from-[#6C4DFF] to-[#A855F7] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                  {emailLoading === 'icloud' ? 'Guardando...' : 'Conectar iCloud'}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-violet-100 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-950">Otro correo (IMAP)</h3>
                  <p className="mt-1 text-sm text-slate-500">Yahoo, Zoho, dominio propio, Titan, Hostinger y mas.</p>
                </div>
                <Mail className="h-5 w-5 text-[#6C4DFF]" />
              </div>
              <div className="mt-4 space-y-2">
                <select value={imapPreset} onChange={e => applyImapPreset(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-400 bg-white">
                  <option value="">-- Elegir proveedor --</option>
                  {Object.entries(IMAP_PRESETS).map(([key, p]) => (
                    <option key={key} value={key}>{p.label}</option>
                  ))}
                </select>
                <input value={imapEmail} onChange={e => setImapEmail(e.target.value)} placeholder="tu@dominio.com" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-400" />
                <input value={imapPassword} onChange={e => setImapPassword(e.target.value)} type="password" placeholder="Contrasena (o contrasena de app)" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-400" />
                <div className="flex gap-2">
                  <div className="flex-1">
                    <p className="mb-1 text-xs text-slate-400">IMAP Host</p>
                    <input value={imapHost} onChange={e => setImapHost(e.target.value)} placeholder="imap.dominio.com" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-violet-400" />
                  </div>
                  <div className="w-20">
                    <p className="mb-1 text-xs text-slate-400">Puerto</p>
                    <input value={imapPort} onChange={e => setImapPort(e.target.value)} placeholder="993" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-violet-400" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <p className="mb-1 text-xs text-slate-400">SMTP Host</p>
                    <input value={smtpHost} onChange={e => setSmtpHost(e.target.value)} placeholder="smtp.dominio.com" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-violet-400" />
                  </div>
                  <div className="w-20">
                    <p className="mb-1 text-xs text-slate-400">Puerto</p>
                    <input value={smtpPort} onChange={e => setSmtpPort(e.target.value)} placeholder="587" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-violet-400" />
                  </div>
                </div>
                <button
                  onClick={connectImap}
                  disabled={emailLoading === 'imap' || !imapEmail.trim() || !imapPassword.trim() || !imapHost.trim() || !smtpHost.trim()}
                  className="w-full rounded-xl bg-gradient-to-r from-[#6C4DFF] to-[#A855F7] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {emailLoading === 'imap' ? 'Conectando...' : 'Conectar'}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-violet-200 bg-[#F8F5FF] p-4">
            <h3 className="font-semibold text-slate-950">Reglas iniciales del modulo</h3>
            <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
              <p className="rounded-xl bg-white px-3 py-2">Clasificar: venta, reclamo, soporte, presupuesto o urgente.</p>
              <p className="rounded-xl bg-white px-3 py-2">Crear borradores sugeridos antes de enviar.</p>
              <p className="rounded-xl bg-white px-3 py-2">Alertar correos importantes en el panel.</p>
              <p className="rounded-xl bg-white px-3 py-2">No auto-enviar sin reglas aprobadas.</p>
            </div>
          </div>

          {emailConnections.length > 0 && (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-slate-950">Casillas conectadas</h3>
                <button onClick={() => disconnectEmail()} disabled={emailLoading === 'all'} className="text-sm font-semibold text-red-600">Desconectar todas</button>
              </div>
              <div className="space-y-2">
                {emailConnections.map(connection => {
                  const provider = connection.external_id?.startsWith('gmail:') ? 'gmail' : connection.external_id?.startsWith('outlook:') ? 'outlook' : connection.external_id?.startsWith('icloud:') ? 'icloud' : connection.external_id?.startsWith('imap:') ? 'imap' : undefined
                  return (
                    <div key={connection.id} className="flex flex-col gap-2 rounded-xl bg-white px-3 py-3 text-sm md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-semibold text-slate-950">{connection.display_name || 'Email conectado'}</p>
                        <p className="text-slate-500">Modo: borradores primero · envio automatico apagado</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <StatusPill tone={connection.status === 'active' ? 'green' : 'slate'}>{connection.status === 'active' ? 'Activo' : 'Pausado'}</StatusPill>
                        <button onClick={() => toggleChannelPause('email', connection.status === 'active')} className="rounded-xl border border-slate-200 px-3 py-1.5 font-semibold text-slate-700">
                          {connection.status === 'active' ? 'Pausar' : 'Activar'}
                        </button>
                        {provider && <button onClick={() => disconnectEmail(provider)} className="rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 font-semibold text-red-600">Desconectar</button>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {emailError && <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{emailError}</p>}
        </SectionCard>
      )}
    </div>
  )
}

function ToolCard({
  icon: Icon,
  title,
  desc,
  children,
}: {
  icon: ElementType
  title: string
  desc: string
  children: React.ReactNode
}) {
  return (
    <SectionCard className="p-4">
      <div className="mb-3 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F1EDFF] text-[#6C4DFF]">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-slate-950">{title}</h3>
          <p className="text-xs text-slate-500">{desc}</p>
        </div>
      </div>
      {children}
    </SectionCard>
  )
}
