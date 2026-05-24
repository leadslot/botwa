'use client'

import { useEffect, useState } from 'react'
import { useDashboard } from '../DashboardContext'
import { CalendarDays, CheckCircle2, ExternalLink, Loader2, Trash2, Apple } from 'lucide-react'
import { SectionCard } from '@/components/dashboard/ui'
import { createClient } from '@/lib/supabase/client'

type CalConn = {
  id: string
  channel: string
  status: string
  display_name: string | null
  external_id: string | null
}

async function authHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
}

export default function CalendarPage() {
  const { business } = useDashboard()
  const [connections, setConnections] = useState<CalConn[]>([])
  const [loading, setLoading] = useState(true)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [icloudLoading, setIcloudLoading] = useState(false)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)
  const [icloudEmail, setIcloudEmail] = useState('')
  const [icloudPassword, setIcloudPassword] = useState('')
  const [icloudError, setIcloudError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const tier = business?.plan_tier ?? business?.plan ?? ''
  const hasAgenda = tier === 'gold' || tier === 'lifetime'

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const cal = params.get('cal')
    if (cal === 'connected') setMsg('✅ Calendario conectado correctamente')
    if (cal === 'token_error') setMsg('❌ Error al obtener token. Intentá de nuevo.')
    if (cal === 'invalid_state') setMsg('❌ Estado inválido. Intentá de nuevo.')
  }, [])

  useEffect(() => {
    loadConnections()
  }, [])

  async function loadConnections() {
    setLoading(true)
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/calendar/connections', { headers })
      const data = await res.json()
      setConnections(data.connections ?? [])
    } catch {}
    setLoading(false)
  }

  function connectGoogle() {
    window.location.href = '/api/calendar/google/start'
  }

  async function connectICloud() {
    if (!icloudEmail || !icloudPassword) {
      setIcloudError('Completá email y contraseña de app')
      return
    }
    setIcloudLoading(true)
    setIcloudError(null)
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/calendar/icloud/connect', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: icloudEmail, app_password: icloudPassword }),
      })
      const data = await res.json()
      if (res.ok) {
        setMsg('✅ iCloud Calendar conectado')
        setIcloudEmail('')
        setIcloudPassword('')
        loadConnections()
      } else {
        setIcloudError(data.error ?? 'Error al conectar')
      }
    } catch { setIcloudError('Error de red') }
    setIcloudLoading(false)
  }

  async function disconnect(channel: string, externalId: string | null) {
    setDisconnecting(externalId ?? channel)
    try {
      const headers = await authHeaders()
      await fetch('/api/calendar/disconnect', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, external_id: externalId }),
      })
      loadConnections()
    } catch {}
    setDisconnecting(null)
  }

  const googleConns = connections.filter(c => c.channel === 'calendar_google')
  const icloudConns = connections.filter(c => c.channel === 'calendar_icloud')

  if (!hasAgenda) {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Agenda / Calendario</h1>
          <p className="text-sm text-slate-500">Conectá Google Calendar o iCloud para gestionar turnos automáticamente.</p>
        </div>
        <SectionCard className="p-8 text-center space-y-4">
          <CalendarDays className="mx-auto h-12 w-12 text-amber-400" />
          <h2 className="text-lg font-semibold text-slate-900">Plan Gold Agenda requerido</h2>
          <p className="text-sm text-slate-500">Esta función está disponible para usuarios del plan Gold Agenda ($199.000/mes).</p>
          <a
            href="/dashboard/billing"
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 transition-colors"
          >
            Ver planes →
          </a>
        </SectionCard>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Agenda / Calendario</h1>
        <p className="text-sm text-slate-500">El bot consultará tu calendario para verificar disponibilidad y crear turnos automáticamente.</p>
      </div>

      {msg && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium ${msg.startsWith('✅') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          {msg}
        </div>
      )}

      {/* Google Calendar */}
      <SectionCard className="p-5 space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-200 shadow-sm">
            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          </span>
          <div>
            <h3 className="font-semibold text-slate-900">Google Calendar</h3>
            <p className="text-xs text-slate-500">OAuth2 seguro. El bot puede leer disponibilidad y crear eventos.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Cargando...</div>
        ) : googleConns.length > 0 ? (
          <div className="space-y-2">
            {googleConns.map(c => (
              <div key={c.id} className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-800">{c.display_name}</span>
                </div>
                <button
                  onClick={() => disconnect(c.channel, c.external_id)}
                  disabled={disconnecting === c.external_id}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-red-600 hover:bg-red-50 transition-colors"
                >
                  {disconnecting === c.external_id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                  Desconectar
                </button>
              </div>
            ))}
          </div>
        ) : (
          <button
            onClick={connectGoogle}
            disabled={googleLoading}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-60"
          >
            {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            Conectar con Google
          </button>
        )}
      </SectionCard>

      {/* iCloud Calendar */}
      <SectionCard className="p-5 space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 border border-slate-800">
            <Apple className="h-5 w-5 text-white" />
          </span>
          <div>
            <h3 className="font-semibold text-slate-900">iCloud Calendar</h3>
            <p className="text-xs text-slate-500">Requiere contraseña de app (no la de tu ID de Apple).</p>
          </div>
        </div>

        {icloudConns.length > 0 ? (
          <div className="space-y-2">
            {icloudConns.map(c => (
              <div key={c.id} className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-800">{c.display_name}</span>
                </div>
                <button
                  onClick={() => disconnect(c.channel, c.external_id)}
                  disabled={disconnecting === c.external_id}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-red-600 hover:bg-red-50 transition-colors"
                >
                  {disconnecting === c.external_id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                  Desconectar
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-slate-600">Email de Apple ID</label>
                <input
                  type="email"
                  value={icloudEmail}
                  onChange={e => setIcloudEmail(e.target.value)}
                  placeholder="usuario@icloud.com"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Contraseña de app</label>
                <input
                  type="password"
                  value={icloudPassword}
                  onChange={e => setIcloudPassword(e.target.value)}
                  placeholder="xxxx-xxxx-xxxx-xxxx"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>
            </div>
            {icloudError && <p className="text-xs text-red-600">{icloudError}</p>}
            <div className="flex items-center gap-3">
              <button
                onClick={connectICloud}
                disabled={icloudLoading}
                className="flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition-colors disabled:opacity-60"
              >
                {icloudLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Apple className="h-4 w-4" />}
                Conectar iCloud
              </button>
              <a
                href="https://support.apple.com/es-ar/HT204397"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-violet-600 hover:underline"
              >
                ¿Cómo genero la contraseña de app? <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Info de uso */}
      <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 text-sm text-amber-800 space-y-1">
        <p className="font-semibold">¿Cómo funciona la agenda automática?</p>
        <ul className="text-xs text-amber-700 space-y-1 mt-2">
          <li>• El bot consulta tu calendario al recibir un pedido de turno</li>
          <li>• Ofrece los horarios disponibles dentro de las reglas que definas en Configuración</li>
          <li>• Al confirmar, crea el evento y envía recordatorio por WhatsApp 24h antes</li>
          <li>• Podés definir servicios, duraciones y franjas horarias en Configuración → Agenda</li>
        </ul>
      </div>
    </div>
  )
}
