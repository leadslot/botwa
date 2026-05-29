'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ElementType } from 'react'
import Link from 'next/link'
import {
  CalendarDays,
  Camera,
  CheckCircle2,
  Clock3,
  Copy,
  Globe2,
  Loader2,
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
  calendar_google: CalendarDays,
  gmail: Mail,
}

function ReconnectingPanel({ reconnectingSince, onForce, resetting }: { reconnectingSince: number | null; onForce: () => void; resetting: boolean }) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    setElapsed(0)
    if (!reconnectingSince) return
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - reconnectingSince) / 1000)), 1000)
    return () => clearInterval(t)
  }, [reconnectingSince])
  // auto-force after 10s
  useEffect(() => {
    if (elapsed === 10 && !resetting) onForce()
  }, [elapsed, resetting, onForce])
  const stuck = elapsed > 5
  return (
    <div className="py-10">
      <RefreshCw className="mx-auto mb-4 h-9 w-9 animate-spin text-[#6C4DFF]" />
      <h2 className="text-xl font-semibold text-slate-950">Reconectando...</h2>
      {stuck ? (
        <>
          <p className="mt-2 text-sm text-amber-600 font-medium">Tardando más de lo normal ({elapsed}s). Forzá la reconexión:</p>
          <button onClick={onForce} disabled={resetting} className="mt-4 inline-flex rounded-xl bg-gradient-to-r from-[#6C4DFF] to-[#A855F7] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
            {resetting ? 'Reiniciando...' : 'Forzar reconexión'}
          </button>
        </>
      ) : (
        <p className="mt-2 text-sm text-slate-500">Levantando tu sesion automaticamente...</p>
      )}
    </div>
  )
}

export default function ConnectPage() {
  const { business } = useDashboard()
  const [status, setStatus] = useState<WAStatus>(null)
  const [qr, setQR] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [reconnectingSince, setReconnectingSince] = useState<number | null>(null)
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
  const [waManual, setWaManual] = useState(false)
  const [waManualWabaId, setWaManualWabaId] = useState('')
  const [waManualPhoneId, setWaManualPhoneId] = useState('')
  const [waManualToken, setWaManualToken] = useState('')
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

  const currentPlan = business?.plan === 'lifetime' ? 'gold' : normalizePlan(business?.plan_tier || business?.plan)
  const includedChannels = PLAN_ORDER
    .slice(0, PLAN_ORDER.indexOf(currentPlan) + 1)
    .flatMap(plan => PLANS[plan].channels)
    .filter((channel, index, list) => list.indexOf(channel) === index)
  // gmail is a sub-provider of email, not a standalone channel card
  // Canales no disponibles aún — se ocultan completamente de la UI
  const HIDDEN_CHANNEL_CARDS: ChannelId[] = ['gmail', 'whatsapp_api', 'instagram', 'facebook', 'calendar_google']
  const lockedChannels = (Object.keys(CHANNELS) as ChannelId[]).filter(channel => !includedChannels.includes(channel) && !HIDDEN_CHANNEL_CARDS.includes(channel))
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
    if (channel === 'calendar_google') return getConnection('calendar_google')?.status === 'active' ? { label: 'Conectado', tone: 'green' as const } : { label: 'Por conectar', tone: 'amber' as const }
    if (channel === 'gmail') return emailConnections.some(item => item.status === 'active' && item.external_id?.startsWith('gmail:')) ? { label: 'Conectado', tone: 'green' as const } : { label: 'Por conectar', tone: 'amber' as const }
    return { label: 'Pendiente', tone: 'amber' as const }
  }

  const visibleTools = useMemo(() => {
    const tools: ChannelId[] = ['whatsapp', 'webchat']
    if (planAllows(currentPlan, 'whatsapp_api')) tools.push('whatsapp_api')
    if (planAllows(currentPlan, 'telegram')) tools.push('telegram')
    if (planAllows(currentPlan, 'facebook') || planAllows(currentPlan, 'instagram')) tools.push('facebook')
    if (planAllows(currentPlan, 'email')) tools.push('email')
    if (planAllows(currentPlan, 'calendar_google')) tools.push('calendar_google')
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
        setStatus(prev => {
          if (data.status === 'reconnecting' && prev !== 'reconnecting') {
            setReconnectingSince(Date.now())
          } else if (data.status !== 'reconnecting') {
            setReconnectingSince(null)
          }
          return data.status
        })
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

  const connectWhatsAppApi = async () => {
    setWaApiLoading(true)
    setWaApiError(null)
    try {
      const setupRes = await fetch('/api/whatsapp-business/connect', { headers: await getAuthHeaders() })
      const setup = await setupRes.json()
      if (!setupRes.ok) {
        setWaApiError(setup.error || 'Error al iniciar conexión con Meta')
        return
      }

      await loadFacebookSdk(setup.appId, setup.version)

      const signupData: NonNullable<WhatsAppSignupMessage['data']> = {}
      const onMessage = (event: MessageEvent) => {
        if (!event.origin.endsWith('facebook.com')) return
        try {
          const payload = typeof event.data === 'string' ? JSON.parse(event.data) as WhatsAppSignupMessage : event.data as WhatsAppSignupMessage
          if (payload.event === 'FINISH' || payload.event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING') {
            Object.assign(signupData, payload.data ?? {})
          }
        } catch {}
      }
      window.addEventListener('message', onMessage)

      const authCode = await new Promise<string>((resolve, reject) => {
        const loginOptions: Record<string, unknown> = {
          response_type: 'code',
          override_default_response_type: true,
          extras: { setup: {}, featureType: 'whatsapp_business_app_onboarding', sessionInfoVersion: '3' },
        }
        if (setup.configId) loginOptions.config_id = setup.configId
        ;(window as WindowWithPolling).FB?.login((response) => {
          const code = response.authResponse?.code
          if (code) resolve(code)
          else reject(new Error('Meta no devolvio autorizacion'))
        }, loginOptions)
      })

      window.removeEventListener('message', onMessage)

      const res = await fetch('/api/whatsapp-business/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...await getAuthHeaders() },
        body: JSON.stringify({ code: authCode, phoneNumberId: signupData?.phone_number_id, wabaId: signupData?.waba_id }),
      })
      const data = await res.json()
      if (!res.ok) setWaApiError(data.error || 'No se pudo conectar WhatsApp API')
      else await reloadChannels()
    } catch (error) {
      setWaApiError(error instanceof Error ? error.message : 'No se pudo abrir Meta')
    } finally {
      setWaApiLoading(false)
    }
  }


  const connectWhatsAppApiManual = async () => {
    if (!waManualPhoneId.trim() || !waManualToken.trim()) return
    setWaApiLoading(true)
    setWaApiError(null)
    try {
      const res = await fetch('/api/whatsapp-business/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...await getAuthHeaders() },
        body: JSON.stringify({ accessToken: waManualToken.trim(), phoneNumberId: waManualPhoneId.trim(), wabaId: waManualWabaId.trim() }),
      })
      const data = await res.json()
      if (!res.ok) setWaApiError(data.error || 'No se pudo conectar')
      else { setWaManual(false); setWaManualToken(''); setWaManualPhoneId(''); setWaManualWabaId(''); await reloadChannels() }
    } finally {
      setWaApiLoading(false)
    }
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
    gmail: { label: 'Gmail', imap_host: 'imap.gmail.com', imap_port: '993', smtp_host: 'smtp.gmail.com', smtp_port: '587' },
    yahoo: { label: 'Yahoo Mail', imap_host: 'imap.mail.yahoo.com', imap_port: '993', smtp_host: 'smtp.mail.yahoo.com', smtp_port: '465' },
    zoho: { label: 'Zoho Mail', imap_host: 'imap.zoho.com', imap_port: '993', smtp_host: 'smtp.zoho.com', smtp_port: '465' },
    titan: { label: 'Titan Mail', imap_host: 'imap.titan.email', imap_port: '993', smtp_host: 'smtp.titan.email', smtp_port: '465' },
    hostinger: { label: 'Hostinger Mail', imap_host: 'imap.hostinger.com', imap_port: '993', smtp_host: 'smtp.hostinger.com', smtp_port: '465' },
    outlook: { label: 'Outlook / Hotmail', imap_host: 'outlook.office365.com', imap_port: '993', smtp_host: 'smtp.office365.com', smtp_port: '587' },
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
        onClick={() => {
          if (locked) return
          if (channel === 'calendar_google' || channel === 'gmail') { window.location.href = '/dashboard/calendar'; return }
          setActiveTool(channel === 'instagram' ? 'facebook' : channel)
        }}
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
          <span className="text-xs text-slate-500">{includedChannels.filter(c => !HIDDEN_CHANNEL_CARDS.includes(c)).length} canales</span>
        </div>
        <div className="grid gap-2 grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {includedChannels.filter(c => !HIDDEN_CHANNEL_CARDS.includes(c)).map(channel => <ChannelButton key={channel} channel={channel} />)}
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
          <SectionCard className="relative overflow-hidden p-4 text-center">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_26%,rgba(34,197,94,0.14),transparent_30%),radial-gradient(circle_at_0%_90%,rgba(108,77,255,0.10),transparent_32%)]" />
            <div className="relative mx-auto max-w-2xl">
              {status === null && (
                <div className="py-8">
                  <RefreshCw className="mx-auto mb-3 h-8 w-8 animate-spin text-[#6C4DFF]" />
                  <p className="font-semibold text-slate-500">Verificando conexion...</p>
                </div>
              )}
              {connected && (
                <div className="py-2">
                  <div className="relative mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[#EAFBF1]">
                    <Smartphone className="h-6 w-6 text-[#22C55E]" />
                    <CheckCircle2 className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-[#22C55E] text-white" />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-950">WhatsApp conectado</h2>
                  <p className="mt-0.5 text-sm text-slate-500">El bot esta activo en el canal principal.</p>
                  <div className="mt-1.5"><StatusPill tone="green">En linea</StatusPill></div>
                  <p className="mt-2 flex items-center justify-center gap-2 text-sm text-slate-600">
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
                <ReconnectingPanel
                  reconnectingSince={reconnectingSince}
                  onForce={resetAndConnect}
                  resetting={resetting}
                />
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
              <button onClick={disconnectBot} disabled={(status !== 'connected' && status !== 'reconnecting') || disconnecting} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 disabled:opacity-50">
                <LogOut className="h-4 w-4" /> {disconnecting ? 'Desconectando...' : 'Desconectar'}
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
              <button onClick={() => { window.location.href = `/api/whatsapp-business/connect/start?bid=${business?.id ?? ''}` }} className="rounded-xl bg-gradient-to-r from-[#6C4DFF] to-[#A855F7] px-5 py-3 text-sm font-semibold text-white">
                Reconectar WhatsApp oficial
              </button>
              <button onClick={disconnectWhatsAppApi} disabled={waApiLoading} className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-600">Desactivar API</button>
            </div>
          )}
          {!whatsappApi && (
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap gap-3">
                <button onClick={() => { window.location.href = `/api/whatsapp-business/connect/start?bid=${business?.id ?? ''}` }} className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600">
                  Conectar con Meta
                </button>
                <button onClick={() => setWaManual(v => !v)} className="rounded-xl border border-violet-200 bg-violet-50 px-5 py-3 text-sm font-semibold text-violet-700">
                  Ingresar IDs manualmente
                </button>
              </div>
              {waManual && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <p className="text-xs text-slate-500">Encontrá estos datos en <strong>business.facebook.com → Cuentas de WhatsApp → Números de teléfono</strong></p>
                  <input value={waManualWabaId} onChange={e => setWaManualWabaId(e.target.value)} placeholder="WABA ID (ej: 112727704795284)" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-400" />
                  <input value={waManualPhoneId} onChange={e => setWaManualPhoneId(e.target.value)} placeholder="Phone Number ID" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-400" />
                  <input value={waManualToken} onChange={e => setWaManualToken(e.target.value)} placeholder="Access Token (de Meta for Developers)" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-400" />
                  <button onClick={connectWhatsAppApiManual} disabled={waApiLoading || !waManualPhoneId.trim() || !waManualToken.trim()} className="rounded-xl bg-gradient-to-r from-[#6C4DFF] to-[#A855F7] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                    {waApiLoading ? 'Conectando...' : 'Guardar conexión'}
                  </button>
                </div>
              )}
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
              <h2 className="text-lg font-semibold text-slate-950">Email</h2>
              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                Conecta tu casilla con usuario y contraseña. Compatible con Gmail, Outlook, Yahoo, Zoho, iCloud y cualquier proveedor IMAP/SMTP.
              </p>
            </div>
            <StatusPill tone={emailConnections.some(item => item.status === 'active') ? 'green' : 'amber'}>
              {emailConnections.some(item => item.status === 'active') ? 'Conectado' : 'Por conectar'}
            </StatusPill>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Proveedor</label>
                <select value={imapPreset} onChange={e => applyImapPreset(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400 bg-white">
                  <option value="">-- Elegir proveedor --</option>
                  {Object.entries(IMAP_PRESETS).map(([key, p]) => (
                    <option key={key} value={key}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Correo electrónico</label>
                <input value={imapEmail} onChange={e => setImapEmail(e.target.value)} placeholder="tu@gmail.com" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Contraseña{imapPreset === 'gmail' && <span className="ml-1 text-xs text-violet-500 font-normal">(<a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="underline">contraseña de app</a>)</span>}
                  {imapPreset === 'outlook' && <span className="ml-1 text-xs text-slate-400 font-normal">(contraseña de Microsoft)</span>}
                </label>
                <input value={imapPassword} onChange={e => setImapPassword(e.target.value)} type="password" placeholder={imapPreset === 'gmail' ? '16 caracteres sin espacios' : 'Tu contraseña'} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400" />
              </div>
              {(!imapPreset || imapPreset === 'custom') && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">IMAP Host</label>
                    <div className="flex gap-2">
                      <input value={imapHost} onChange={e => setImapHost(e.target.value)} placeholder="imap.dominio.com" className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400" />
                      <input value={imapPort} onChange={e => setImapPort(e.target.value)} placeholder="993" className="w-20 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">SMTP Host</label>
                    <div className="flex gap-2">
                      <input value={smtpHost} onChange={e => setSmtpHost(e.target.value)} placeholder="smtp.dominio.com" className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400" />
                      <input value={smtpPort} onChange={e => setSmtpPort(e.target.value)} placeholder="587" className="w-20 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400" />
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="mt-4 flex items-center gap-4">
              <button
                onClick={connectImap}
                disabled={emailLoading === 'imap' || !imapEmail.trim() || !imapPassword.trim() || !imapHost.trim() || !smtpHost.trim()}
                className="rounded-xl bg-gradient-to-r from-[#6C4DFF] to-[#A855F7] px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {emailLoading === 'imap' ? 'Conectando...' : 'Conectar correo'}
              </button>
              {emailError && <p className="text-sm text-red-500">{emailError}</p>}
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

      {/* Mercado Pago */}
      <MercadoPagoSection />
    </div>
  )
}

function MercadoPagoSection() {
  const [conn, setConn] = useState<{ display_name: string; mp_email?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const { getAuthHeaders } = useDashboard() as unknown as { getAuthHeaders: () => Promise<HeadersInit> }

  async function authH(): Promise<HeadersInit> {
    const { data: { session } } = await createSupabaseClient().auth.getSession()
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('mp') === 'connected') {
      window.history.replaceState({}, '', window.location.pathname)
    }
    load()
  }, [])

  async function load() {
    setLoading(true)
    const h = await authH()
    const res = await fetch('/api/channel-connections?channel=mercadopago', { headers: h }).catch(() => null)
    if (res?.ok) {
      const data = await res.json()
      const active = (data.connections ?? []).find((c: { status: string; display_name: string; metadata?: { mp_email?: string } }) => c.status === 'active')
      setConn(active ? { display_name: active.display_name, mp_email: active.metadata?.mp_email } : null)
    }
    setLoading(false)
  }

  async function connect() {
    setConnecting(true)
    const h = await authH()
    const res = await fetch('/api/mp/connect', { headers: h })
    const data = await res.json()
    if (data.url) window.location.href = data.url
    setConnecting(false)
  }

  async function disconnect() {
    setDisconnecting(true)
    const h = await authH()
    await fetch('/api/mp/disconnect', { method: 'POST', headers: h })
    setConn(null)
    setDisconnecting(false)
  }

  return (
    <SectionCard className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#009EE3] text-white font-bold text-sm flex-shrink-0">MP</span>
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Mercado Pago</h2>
            <p className="text-sm text-slate-500">Conectá tu cuenta para cobrar señas de turnos directamente a tus clientes.</p>
          </div>
        </div>
        {!loading && (
          conn
            ? <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Conectado</span>
            : <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">Por conectar</span>
        )}
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Cargando...</div>
        ) : conn ? (
          <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-emerald-800">{conn.display_name}</p>
              {conn.mp_email && <p className="text-xs text-emerald-600">{conn.mp_email}</p>}
            </div>
            <button onClick={disconnect} disabled={disconnecting} className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-60">
              {disconnecting ? 'Desconectando...' : 'Desconectar'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              onClick={connect}
              disabled={connecting}
              className="flex items-center gap-2 rounded-xl bg-[#009EE3] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0088CC] transition-colors disabled:opacity-60"
            >
              {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {connecting ? 'Redirigiendo...' : 'Conectar Mercado Pago'}
            </button>
            <p className="text-xs text-slate-400">
              Vas a ser redirigido a Mercado Pago para autorizar el acceso. Los pagos van directo a tu cuenta.
            </p>
          </div>
        )}
      </div>
    </SectionCard>
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
