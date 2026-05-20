'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, Clock3, LogOut, Pause, QrCode, RefreshCw, Smartphone, WifiOff } from 'lucide-react'
import { SectionCard, StatusPill } from '@/components/dashboard/ui'

type WAStatus = 'disconnected' | 'waiting_qr' | 'connected' | 'reconnecting' | null
type WindowWithPolling = Window & { __startWAPolling?: () => void }

export default function ConnectPage() {
  const [status, setStatus] = useState<WAStatus>(() => {
    if (typeof window !== 'undefined') {
      return (sessionStorage.getItem('wa_status') as WAStatus) ?? null
    }
    return null
  })
  const [qr, setQR] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [showPairCode, setShowPairCode] = useState(false)
  const [pairPhone, setPairPhone] = useState('')
  const [pairCode, setPairCode] = useState<string | null>(null)
  const [pairLoading, setPairLoading] = useState(false)
  const [pairError, setPairError] = useState<string | null>(null)

  const startConnection = async () => {
    setLoading(true)
    try {
      await fetch('/api/whatsapp/start', { method: 'POST' })
      ;(window as WindowWithPolling).__startWAPolling?.()
    } finally {
      setLoading(false)
    }
  }

  const resetAndConnect = async () => {
    setResetting(true)
    try {
      await fetch('/api/whatsapp/reset', { method: 'POST' })
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
      const r = await fetch('/api/whatsapp/pair-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: pairPhone.replace(/\D/g, '') }),
      })
      const d = await r.json()
      if (d.code) {
        setPairCode(d.code)
        ;(window as WindowWithPolling).__startWAPolling?.()
      } else {
        setPairError(d.error || 'Error al solicitar código')
      }
    } finally {
      setPairLoading(false)
    }
  }

  const disconnectBot = async () => {
    if (!confirm('¿Desconectar el bot? Dejará de responder mensajes.')) return
    setDisconnecting(true)
    try {
      await fetch('/api/whatsapp/disconnect', { method: 'POST' })
      setStatus('disconnected')
      setQR(null)
    } finally {
      setDisconnecting(false)
    }
  }

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null

    const startPolling = () => {
      if (interval) clearInterval(interval)
      interval = setInterval(checkStatus, 3000)
    }

    const checkStatus = async () => {
      try {
        const res = await fetch('/api/whatsapp/status')
        const data = await res.json()
        setStatus(data.status)
        if (data.status) sessionStorage.setItem('wa_status', data.status)
        setQR(data.qr)
        if (data.status === 'connected') {
          if (interval) { clearInterval(interval); interval = null }
        } else if (data.status === 'reconnecting' || data.status === 'waiting_qr') {
          if (!interval) startPolling()
        }
      } catch {}
    }

    checkStatus()
    ;(window as WindowWithPolling).__startWAPolling = startPolling

    return () => {
      if (interval) clearInterval(interval)
      delete (window as WindowWithPolling).__startWAPolling
    }
  }, [])

  const connected = status === 'connected'

  return (
    <div className="max-h-[calc(100vh-64px-40px)] overflow-y-auto space-y-5">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-950">Conectar WhatsApp</h1>
        <div className="mt-3 h-1.5 w-14 rounded-full bg-gradient-to-r from-[#6C4DFF] to-[#A855F7]" />
        <p className="mt-4 text-base text-slate-500">Una vez conectado, el bot responde por vos desde nuestro servidor.</p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.5fr)]">
        <SectionCard className="relative min-h-[390px] overflow-hidden p-6 text-center lg:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_26%,rgba(34,197,94,0.14),transparent_30%),radial-gradient(circle_at_0%_90%,rgba(108,77,255,0.10),transparent_32%)]" />
          <div className="relative mx-auto max-w-2xl">
            {status === null && (
              <div className="py-10">
                <RefreshCw className="mx-auto mb-4 h-10 w-10 animate-spin text-[#6C4DFF]" />
                <p className="font-semibold text-slate-500">Verificando conexión...</p>
              </div>
            )}

            {connected && (
              <div className="py-6">
                <div className="relative mx-auto mb-8 flex h-28 w-28 items-center justify-center rounded-full bg-[#EAFBF1]">
                  <Smartphone className="h-14 w-14 text-[#22C55E]" />
                  <CheckCircle2 className="absolute -right-1 -top-1 h-8 w-8 rounded-full bg-[#22C55E] text-white" />
                </div>
                <h2 className="text-3xl font-black text-slate-950">¡WhatsApp conectado!</h2>
                <p className="mt-3 text-lg text-slate-500">Tu bot está activo y respondiendo mensajes.</p>
                <div className="mt-5"><StatusPill tone="green">En línea</StatusPill></div>
                <div className="mx-auto mt-7 max-w-xl border-t border-slate-200 pt-6">
                  <p className="flex items-center justify-center gap-3 text-base text-slate-600">
                    <Clock3 className="h-5 w-5 text-[#22C55E]" />
                    Última sincronización: <span className="font-black text-[#22C55E]">hace unos segundos</span>
                  </p>
                </div>
              </div>
            )}

            {status === 'waiting_qr' && qr && (
              <div className="py-3">
                <StatusPill tone="amber"><RefreshCw className="h-3 w-3 animate-spin" /> Esperando escaneo</StatusPill>
                <div className="mx-auto mt-6 inline-block rounded-[28px] border border-violet-200 bg-white p-4 shadow-2xl shadow-violet-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qr} alt="QR WhatsApp" className="h-56 w-56 rounded-2xl" />
                </div>
                <div className="mx-auto mt-6 max-w-md rounded-3xl border border-slate-200 bg-slate-50 p-4 text-left text-sm text-slate-600">
                  <p className="mb-3 font-black text-slate-900">Cómo escanear:</p>
                  <p>1. Abrí WhatsApp en tu celular</p>
                  <p>2. Tocá los 3 puntos → Dispositivos vinculados</p>
                  <p>3. Tocá &quot;Vincular un dispositivo&quot;</p>
                  <p>4. Apuntá la cámara al QR de arriba</p>
                </div>
              </div>
            )}

            {status === 'reconnecting' && (
              <div className="py-10">
                <RefreshCw className="mx-auto mb-5 h-12 w-12 animate-spin text-[#6C4DFF]" />
                <h2 className="text-3xl font-black text-slate-950">Reconectando...</h2>
                <p className="mt-3 text-slate-500">El bot está levantando tu sesión automáticamente.</p>
              </div>
            )}

            {status !== null && (status === 'disconnected' || (status as string) === 'no_business' || (!['connected','waiting_qr','reconnecting'].includes(status as string))) && (
              <div className="py-10">
                <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
                  <WifiOff className="h-10 w-10 text-slate-400" />
                </div>
                <h2 className="text-3xl font-black text-slate-950">Sin conexión</h2>
                <p className="mt-3 text-slate-500">Tu bot no está activo todavía.</p>
                <button onClick={startConnection} disabled={loading} className="mt-7 inline-flex rounded-2xl bg-gradient-to-r from-[#6C4DFF] to-[#A855F7] px-7 py-4 text-sm font-black text-white shadow-lg shadow-violet-200">
                  {loading ? 'Iniciando...' : 'Conectar WhatsApp'}
                </button>
              </div>
            )}

            {status === 'waiting_qr' && !qr && (
              <div className="py-10">
                <RefreshCw className="mx-auto mb-4 h-10 w-10 animate-spin text-[#6C4DFF]" />
                <p className="font-semibold text-slate-500">Generando código QR...</p>
              </div>
            )}
          </div>
        </SectionCard>

        <div className="space-y-5">
          <SectionCard className="p-5 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#F1EDFF]">
              <QrCode className="h-9 w-9 text-[#6C4DFF]" />
            </div>
            <h2 className="text-xl font-black text-slate-950">¿Desvinculaste el dispositivo?</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">Conectá nuevamente tu WhatsApp escaneando un nuevo código QR.</p>
            <button
              onClick={resetAndConnect}
              disabled={resetting}
              className="mt-5 inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#6C4DFF] to-[#A855F7] px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-violet-200"
            >
              <QrCode className="h-5 w-5" />
              {resetting ? 'Reiniciando...' : 'Conectar con nuevo QR'}
            </button>
          </SectionCard>

          <SectionCard className="p-5">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-violet-200 bg-[#F1EDFF]">
                <Pause className="h-6 w-6 text-[#6C4DFF]" />
              </span>
              <div className="flex-1">
                <h3 className="text-lg font-black text-slate-950">Pausar bot</h3>
                <p className="mt-1 text-sm text-slate-500">El bot dejará de responder mensajes temporalmente.</p>
              </div>
            </div>
            {connected && (
              <button
                onClick={disconnectBot}
                disabled={disconnecting}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-black text-red-600 transition hover:bg-red-100"
              >
                <LogOut className="h-4 w-4" />
                {disconnecting ? 'Desconectando...' : 'Pausar bot'}
              </button>
            )}
          </SectionCard>
          <SectionCard className="p-5">
            <div className="flex items-center gap-4 mb-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-violet-200 bg-[#F1EDFF]">
                <Smartphone className="h-6 w-6 text-[#6C4DFF]" />
              </span>
              <div className="flex-1">
                <h3 className="text-lg font-black text-slate-950">Vincular sin QR</h3>
                <p className="mt-1 text-sm text-slate-500">Ingresá tu número y recibirás un código en WhatsApp.</p>
              </div>
            </div>

            {!pairCode ? (
              <div className="space-y-3">
                <input
                  type="tel"
                  value={pairPhone}
                  onChange={e => setPairPhone(e.target.value)}
                  placeholder="Ej: 5491137549016 (sin +)"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium outline-none focus:border-violet-400"
                />
                {pairError && <p className="text-xs text-red-500">{pairError}</p>}
                <button
                  onClick={requestPairCode}
                  disabled={pairLoading || !pairPhone.trim()}
                  className="w-full rounded-2xl bg-gradient-to-r from-[#6C4DFF] to-[#A855F7] px-5 py-3 text-sm font-black text-white shadow-lg shadow-violet-200 disabled:opacity-60"
                >
                  {pairLoading ? 'Solicitando...' : 'Obtener código'}
                </button>
              </div>
            ) : (
              <div className="text-center">
                <p className="mb-2 text-sm text-slate-500">Ingresá este código en WhatsApp → Dispositivos vinculados</p>
                <div className="mx-auto inline-block rounded-2xl bg-[#F1EDFF] px-6 py-4">
                  <span className="text-3xl font-black tracking-[0.3em] text-[#6C4DFF]">{pairCode}</span>
                </div>
                <button onClick={() => { setPairCode(null); setPairPhone('') }} className="mt-3 block w-full text-xs text-slate-400 hover:text-slate-600">
                  Usar otro número
                </button>
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
