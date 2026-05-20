'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import {
  Bell,
  CreditCard,
  Home,
  LogOut,
  MessageSquare,
  Settings,
  Wifi,
  ChevronDown,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', icon: Home, label: 'Inicio' },
  { href: '/dashboard/connect', icon: Wifi, label: 'Conectar WhatsApp' },
  { href: '/dashboard/conversations', icon: MessageSquare, label: 'Conversaciones' },
  { href: '/dashboard/settings', icon: Settings, label: 'Configuración' },
  { href: '/dashboard/billing', icon: CreditCard, label: 'Suscripción' },
]

function isActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === href
  return pathname.startsWith(href)
}

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [userLabel, setUserLabel] = useState('')
  const [userInitials, setUserInitials] = useState('?')
  const [dropdownOpen, setDropdownOpen] = useState(false)

  useEffect(() => {
    createClient().auth.getUser().then(({ data }: { data: { user: { email?: string; user_metadata?: { full_name?: string } } | null } }) => {
      const email = data.user?.email ?? ''
      const name = (data.user?.user_metadata?.full_name as string) ?? ''
      if (name) {
        const parts = name.trim().split(' ')
        setUserInitials((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? ''))
        setUserLabel(name)
      } else if (email) {
        setUserInitials(email.slice(0, 2).toUpperCase())
        setUserLabel(email.split('@')[0])
      }
    })
  }, [])

  return (
    <div className="min-h-screen bg-[#F7F8FB] text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] flex-col border-r border-slate-200/80 bg-white/90 backdrop-blur-xl lg:flex">
        <div className="flex h-20 items-center px-7">
          <Link href="/dashboard" className="flex items-center gap-3">
            <Image src="/logo.svg" alt="Responbot" width={44} height={44} className="rounded-2xl shadow-lg shadow-violet-200" />
            <span className="text-2xl font-black tracking-tight text-slate-950">Responbot</span>
          </Link>
        </div>

        <nav className="flex-1 space-y-1.5 px-4">
          {navItems.map(({ href, icon: Icon, label }) => {
            const active = isActive(pathname, href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-4 rounded-2xl px-5 py-3.5 text-base font-semibold transition ${
                  active
                    ? 'bg-[#F1EDFF] text-[#6C4DFF] shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? 'text-[#6C4DFF]' : 'text-slate-500'}`} />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-slate-200/80 p-4">
          <form action="/auth/signout" method="post">
            <button className="flex w-full items-center gap-4 rounded-2xl px-5 py-3.5 text-base font-semibold text-slate-500 transition hover:bg-red-50 hover:text-red-600">
              <LogOut className="h-5 w-5" />
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      <div className="lg:pl-[264px]">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200/70 bg-[#F7F8FB]/85 px-5 backdrop-blur-xl sm:px-8 lg:px-8">
          <Link href="/dashboard" className="flex items-center gap-3 lg:hidden">
            <Image src="/logo.svg" alt="Responbot" width={40} height={40} className="rounded-2xl shadow-lg shadow-violet-200" />
            <span className="text-xl font-black text-slate-950">Responbot</span>
          </Link>

          <nav className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white p-1 shadow-sm md:flex lg:hidden">
            {navItems.map(({ href, label }) => {
              const active = isActive(pathname, href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                    active ? 'bg-[#F1EDFF] text-[#6C4DFF]' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {label}
                </Link>
              )
            })}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <Link href="/dashboard/conversations" className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 transition">
              <Bell className="h-5 w-5" />
            </Link>
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(v => !v)}
                className="flex items-center gap-3 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3 shadow-sm hover:bg-slate-50 transition"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-violet-100 text-sm font-black text-[#6C4DFF]">
                  {userInitials}
                </span>
                <span className="hidden text-sm font-black text-slate-950 sm:block">{userLabel}</span>
                <ChevronDown className={`hidden h-4 w-4 text-slate-500 sm:block transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 top-12 z-50 w-48 rounded-2xl border border-slate-200 bg-white shadow-xl">
                  <div className="p-2">
                    <p className="truncate px-3 py-2 text-xs text-slate-400">{userLabel}</p>
                    <form action="/auth/signout" method="post">
                      <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition">
                        <LogOut className="h-4 w-4" /> Cerrar sesión
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="min-h-[calc(100vh-64px)] px-5 py-5 sm:px-8 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  )
}
