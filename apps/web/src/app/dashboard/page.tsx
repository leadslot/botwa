import { createClient } from '@/lib/supabase/server'
import { MessageSquare, Wifi, WifiOff, Settings, ChevronRight, Zap, CreditCard } from 'lucide-react'
import Link from 'next/link'

const TRIAL_LIMIT = 50

export default async function DashboardPage() {
  const supabase = await createClient()
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {}
  if (!user) { const { redirect } = await import('next/navigation'); redirect('/login') }

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('user_id', user!.id)
    .single()

  const { data: session } = business ? await supabase
    .from('whatsapp_sessions')
    .select('status')
    .eq('business_id', business.id)
    .single() : { data: null }

  const { count: msgCount } = business ? await supabase
    .from('whatsapp_messages')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', business.id) : { count: 0 }

  const isConnected = session?.status === 'connected'

  if (!business) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Completá tu configuración</h2>
          <p className="text-gray-500 mb-4">Necesitamos algunos datos de tu negocio</p>
          <Link href="/dashboard/onboarding" className="btn-primary">Configurar ahora</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">Hola 👋</h1>
        <p className="text-gray-500">{business.name}</p>
      </div>

      {/* Status banner */}
      {!isConnected && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <WifiOff className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="font-semibold text-amber-900">WhatsApp no conectado</p>
              <p className="text-sm text-amber-700">El bot no está activo todavía</p>
            </div>
          </div>
          <Link href="/dashboard/connect" className="btn-primary text-sm py-2 px-5 flex items-center gap-1">
            Conectar ahora <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {isConnected && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 mb-8 flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
            <Wifi className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="font-semibold text-emerald-900">Bot activo y respondiendo</p>
            <p className="text-sm text-emerald-700">Tu WhatsApp está conectado al servidor</p>
          </div>
          <div className="ml-auto badge-green">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            En línea
          </div>
        </div>
      )}

      {/* Trial banner */}
      {!business.is_paid && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 mb-8 flex items-center justify-between">
          <div>
            <p className="font-semibold text-indigo-900">
              Prueba gratuita · {business.messages_used || 0}/{TRIAL_LIMIT} mensajes usados
            </p>
            <div className="w-full bg-indigo-100 rounded-full h-2 mt-2 mb-1">
              <div
                className="bg-indigo-500 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(100, ((business.messages_used || 0) / TRIAL_LIMIT) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-indigo-600">
              {TRIAL_LIMIT - (business.messages_used || 0)} mensajes restantes
            </p>
          </div>
          <Link href="/dashboard/billing" className="btn-primary text-sm py-2 px-4 flex items-center gap-1 ml-4 flex-shrink-0">
            <CreditCard className="w-4 h-4" /> Activar plan
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Mensajes respondidos', value: msgCount || 0, icon: MessageSquare, color: 'text-indigo-500', bg: 'bg-indigo-50' },
          { label: 'Estado del bot', value: isConnected ? 'Activo' : 'Inactivo', icon: Zap, color: isConnected ? 'text-emerald-500' : 'text-gray-400', bg: isConnected ? 'bg-emerald-50' : 'bg-gray-50' },
          { label: 'IA configurada', value: business.ai_enabled ? 'Sí' : 'No', icon: Settings, color: 'text-violet-500', bg: 'bg-violet-50' },
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

      {/* Quick actions */}
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
