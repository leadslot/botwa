'use client'
import { useDashboard } from './DashboardContext'
import { MessageSquare, Wifi, WifiOff, Settings, Zap, CreditCard, CheckCircle2, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

const TRIAL_LIMIT = 50

export default function DashboardPage() {
  const { business, loading } = useDashboard()
  const [waStatus, setWaStatus] = useState<'connected' | 'disconnected' | 'reconnecting' | null>(null)

  useEffect(() => {
    fetch('/api/whatsapp/status')
      .then(r => r.json())
      .then(d => setWaStatus(d.status))
      .catch(() => setWaStatus('disconnected'))
  }, [])

  if (loading) return (
    <div className="p-8 animate-pulse">
      <div className="h-8 bg-gray-200 rounded-xl w-48 mb-2" />
      <div className="h-4 bg-gray-100 rounded-xl w-32 mb-8" />
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[1,2,3].map(i => <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 h-28" />)}
      </div>
    </div>
  )

  if (!business) return (
    <div className="p-8 flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Completá tu configuración</h2>
        <p className="text-gray-500 mb-4">Necesitamos algunos datos de tu negocio</p>
        <Link href="/dashboard/onboarding" className="btn-primary">Configurar ahora</Link>
      </div>
    </div>
  )

  const waLabel = waStatus === 'connected' ? 'Conectado' : waStatus === 'reconnecting' ? 'Reconectando' : 'Desconectado'
  const waColor = waStatus === 'connected' ? 'text-emerald-500' : waStatus === 'reconnecting' ? 'text-amber-500' : 'text-red-400'
  const waBg = waStatus === 'connected' ? 'bg-emerald-50' : waStatus === 'reconnecting' ? 'bg-amber-50' : 'bg-red-50'
  const WaIcon = waStatus === 'connected' ? CheckCircle2 : waStatus === 'reconnecting' ? Zap : WifiOff

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">Hola 👋</h1>
        <p className="text-gray-500">{business.name}</p>
      </div>

      {!business.is_paid && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 mb-8 flex items-center justify-between">
          <div className="flex-1">
            <p className="font-semibold text-indigo-900">Prueba gratuita · {business.messages_used}/{TRIAL_LIMIT} mensajes usados</p>
            <div className="w-full bg-indigo-100 rounded-full h-2 mt-2 mb-1">
              <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${Math.min(100, (business.messages_used / TRIAL_LIMIT) * 100)}%` }} />
            </div>
            <p className="text-xs text-indigo-600">{TRIAL_LIMIT - business.messages_used} mensajes restantes</p>
          </div>
          <Link href="/dashboard/billing" className="btn-primary text-sm py-2 px-4 flex items-center gap-1 ml-4 flex-shrink-0">
            <CreditCard className="w-4 h-4" /> Activar plan
          </Link>
        </div>
      )}

      {/* Estado del sistema */}
      {waStatus === 'disconnected' && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <WifiOff className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div>
              <p className="font-semibold text-red-800 text-sm">WhatsApp desconectado</p>
              <p className="text-xs text-red-600">El bot no está respondiendo mensajes</p>
            </div>
          </div>
          <Link href="/dashboard/connect" className="btn-primary text-sm py-2 px-4">
            Conectar
          </Link>
        </div>
      )}

      {waStatus === 'reconnecting' && business.messages_used === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
          <Zap className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div>
            <p className="font-semibold text-amber-800 text-sm">Reconectando WhatsApp...</p>
            <p className="text-xs text-amber-600">El bot se está reiniciando automáticamente</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          {
            label: 'Mensajes respondidos',
            value: business.messages_used,
            icon: MessageSquare,
            color: 'text-indigo-500',
            bg: 'bg-indigo-50'
          },
          {
            label: 'WhatsApp',
            value: waStatus === null ? '...' : waLabel,
            icon: WaIcon,
            color: waColor,
            bg: waBg,
          },
          {
            label: 'Bot IA',
            value: business.ai_enabled ? 'Activo' : 'Pausado',
            icon: business.ai_enabled ? CheckCircle2 : AlertCircle,
            color: business.ai_enabled ? 'text-emerald-500' : 'text-gray-400',
            bg: business.ai_enabled ? 'bg-emerald-50' : 'bg-gray-50',
          },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card">
            <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <p className="text-2xl font-black text-gray-900">{value}</p>
            <p className="text-sm text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Acciones rápidas</h2>
      <div className="grid grid-cols-2 gap-4">
        {[
          { href: '/dashboard/connect', icon: Wifi, title: 'Conectar WhatsApp', desc: 'Escaneá el QR o revisá el estado de conexión' },
          { href: '/dashboard/conversations', icon: MessageSquare, title: 'Ver conversaciones', desc: 'Leé todos los mensajes recibidos' },
          { href: '/dashboard/settings', icon: Settings, title: 'Configurar bot', desc: 'Editá el prompt, precios y comportamiento' },
          { href: '/dashboard/billing', icon: CreditCard, title: 'Suscripción', desc: 'Activar plan o ver estado de pago' },
        ].map(({ href, icon: Icon, title, desc }) => (
          <Link key={href} href={href} className="card-hover flex items-start gap-4">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <Icon className="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">{title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
