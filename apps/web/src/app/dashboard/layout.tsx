import Link from 'next/link'
import { MessageCircle, LayoutDashboard, Wifi, Settings, MessageSquare, LogOut, CreditCard } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Inicio' },
  { href: '/dashboard/connect', icon: Wifi, label: 'Conectar WhatsApp' },
  { href: '/dashboard/conversations', icon: MessageSquare, label: 'Conversaciones' },
  { href: '/dashboard/settings', icon: Settings, label: 'Configuración' },
  { href: '/dashboard/billing', icon: CreditCard, label: 'Suscripción' },
]

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-gray-100 flex flex-col fixed h-full z-20">
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-black text-gray-900">BotWA</span>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ href, icon: Icon, label }) => (
            <Link key={href} href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors group">
              <Icon className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-indigo-600">
                {user.email?.[0].toUpperCase()}
              </span>
            </div>
            <span className="text-xs text-gray-500 truncate flex-1">{user.email}</span>
          </div>
          <form action="/auth/signout" method="post">
            <button className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors w-full">
              <LogOut className="w-4 h-4" />
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <main className="ml-60 flex-1 min-h-screen">{children}</main>
    </div>
  )
}
