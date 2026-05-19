'use client'
import { useDashboard } from './DashboardContext'
import { MessageSquare, Wifi, WifiOff, Settings, ChevronRight, Zap, CreditCard } from 'lucide-react'
import Link from 'next/link'

const TRIAL_LIMIT = 50

export default function DashboardPage() {
  const { business, loading } = useDashboard()

  if (loading) return (
    <div className="p-8 animate-pulse">
      <div className="h-8 bg-gray-200 rounded-xl w-48 mb-2" />
      <div className="h-4 bg-gray-100 rounded-xl w-32 mb-8" />
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[1,2,3].map(i => <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 h-28" />)}
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-5 h-32 mb-4" />
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

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">Hola 👋</h1>
        <p className="text-gray-500">{business.name}</p>
      </div>

      {!business.is_paid && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 mb-8 flex items-center justify-between">
          <div>
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

      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Mensajes respondidos', value: business.messages_used, icon: MessageSquare, color: 'text-indigo-500', bg: 'bg-indigo-50' },
          { label: 'Estado del bot', value: business.ai_enabled ? 'Activo' : 'Pausado', icon: Zap, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { label: 'IA configurada', value: business.ai_prompt ? 'Sí' : 'No', icon: Settings, color: 'text-violet-500', bg: 'bg-violet-50' },
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
          { href: '/dashboard/connect', icon: Wifi, title: 'Conectar WhatsApp', desc: 'Escaneá el QR para activar el bot' },
          { href: '/dashboard/conversations', icon: MessageSquare, title: 'Ver conversaciones', desc: 'Todos los mensajes recibidos' },
          { href: '/dashboard/settings', icon: Settings, title: 'Configurar bot', desc: 'Editá el prompt y el comportamiento' },
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
