'use client'
import { useState, useEffect } from 'react'
import { MessageCircle, RefreshCw, CheckCircle2, WifiOff } from 'lucide-react'

export default function ConnectPage() {
  const [status, setStatus] = useState<'disconnected' | 'waiting_qr' | 'connected'>('disconnected')
  const [qr, setQR] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const startConnection = async () => {
    setLoading(true)
    try {
      await fetch('/api/whatsapp/start', { method: 'POST' })
      ;(window as any).__startWAPolling?.()
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null

    const checkStatus = async () => {
      try {
        const res = await fetch('/api/whatsapp/status')
        const data = await res.json()
        setStatus(data.status)
        setQR(data.qr)
        if (data.status === 'connected' && interval) {
          clearInterval(interval)
          interval = null
        }
      } catch {}
    }

    checkStatus()

    // Solo arrancar el polling si el usuario está conectando activamente
    // Se activa desde startConnection()
    const startPolling = () => {
      if (interval) clearInterval(interval)
      interval = setInterval(checkStatus, 3000)
    }

    // Exponer para que startConnection lo llame
    ;(window as any).__startWAPolling = startPolling

    return () => {
      if (interval) clearInterval(interval)
      delete (window as any).__startWAPolling
    }
  }, [])

  return (
    <div className="max-w-2xl mx-auto py-12 px-6">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-black text-gray-900 mb-2">Conectar WhatsApp</h1>
        <p className="text-gray-500">Una vez conectado, el bot responde por vos desde nuestro servidor</p>
      </div>

      <div className="card text-center">
        {status === 'connected' && (
          <div className="py-8">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">¡WhatsApp conectado!</h2>
            <p className="text-gray-500 mb-4">Tu bot está activo y respondiendo mensajes.</p>
            <div className="badge-green mx-auto w-fit">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              En línea
            </div>
          </div>
        )}

        {status === 'waiting_qr' && qr && (
          <div className="py-6">
            <div className="badge-yellow mx-auto w-fit mb-6">
              <RefreshCw className="w-3 h-3 animate-spin" />
              Esperando escaneo
            </div>
            <div className="bg-white border-4 border-indigo-500 rounded-2xl p-3 inline-block mb-6"
              style={{ boxShadow: '0 4px 24px -2px rgba(99,102,241,0.15)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="QR WhatsApp" className="w-56 h-56" />
            </div>
            <div className="text-left bg-gray-50 rounded-xl p-4 text-sm text-gray-600 space-y-2 max-w-xs mx-auto">
              <p className="font-semibold text-gray-800">Cómo escanear:</p>
              <p>1. Abrí WhatsApp en tu celular</p>
              <p>2. Tocá los 3 puntos → Dispositivos vinculados</p>
              <p>3. Tocá &quot;Vincular un dispositivo&quot;</p>
              <p>4. Apuntá la cámara al QR de arriba</p>
            </div>
          </div>
        )}

        {status === 'disconnected' && (
          <div className="py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <WifiOff className="w-7 h-7 text-gray-400" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Sin conexión</h2>
            <p className="text-gray-500 mb-6 text-sm">Tu bot no está activo todavía</p>
            <button onClick={startConnection} disabled={loading} className="btn-primary">
              {loading ? 'Iniciando...' : 'Conectar WhatsApp'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
