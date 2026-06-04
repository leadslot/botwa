'use client'

import { useEffect, useState } from 'react'
import { useDashboard } from '../DashboardContext'
import { CalendarDays, CheckCircle2, ChevronDown, ExternalLink, Loader2, Trash2, Apple, Clock, MapPin, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'
import { SectionCard } from '@/components/dashboard/ui'
import { createClient } from '@/lib/supabase/client'

type CalConn = {
  id: string
  channel: string
  status: string
  display_name: string | null
  external_id: string | null
}

type AgendaService = {
  id: string
  name: string
  price: number | null
  duration_minutes: number
  color: string
}

type CalEvent = {
  id: string
  source: string
  title: string
  start: string
  end: string
  description?: string
  location?: string
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
}
function formatTime(iso: string) {
  if (!iso.includes('T')) return 'Todo el día'
  const d = new Date(iso)
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}
function isSameDay(a: string, b: Date) {
  const da = new Date(a)
  return da.getFullYear() === b.getFullYear() && da.getMonth() === b.getMonth() && da.getDate() === b.getDate()
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
  const [icloudExpanded, setIcloudExpanded] = useState(false)
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

  async function connectGoogle() {
    setGoogleLoading(true)
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/calendar/google/start', { headers })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else setMsg('❌ ' + (data.error ?? 'Error al iniciar OAuth'))
    } catch { setMsg('❌ Error de red') }
    setGoogleLoading(false)
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

  const [events, setEvents] = useState<CalEvent[]>([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const [weekOffset, setWeekOffset] = useState(0)

  // Servicios
  const [services, setServices] = useState<AgendaService[]>([])
  const [showServiceForm, setShowServiceForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [newDuration, setNewDuration] = useState('60')
  const [newColor, setNewColor] = useState('#F59E0B')
  const [savingService, setSavingService] = useState(false)

  const COLORS = ['#8B5CF6','#F59E0B','#10B981','#EF4444','#3B82F6','#F97316','#EC4899','#06B6D4']

  useEffect(() => { loadServices() }, [])

  async function loadServices() {
    const headers = await authHeaders()
    const res = await fetch('/api/agenda/services', { headers })
    const data = await res.json()
    setServices(data.services ?? [])
  }

  async function saveService() {
    if (!newName.trim()) return
    setSavingService(true)
    const headers = await authHeaders()
    await fetch('/api/agenda/services', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, price: newPrice ? Number(newPrice) : null, duration_minutes: Number(newDuration), color: newColor }),
    })
    setNewName(''); setNewPrice(''); setNewDuration('60'); setNewColor('#F59E0B')
    setShowServiceForm(false)
    setSavingService(false)
    loadServices()
  }

  async function deleteService(id: string) {
    const headers = await authHeaders()
    await fetch('/api/agenda/services', { method: 'DELETE', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    loadServices()
  }

  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() + weekOffset * 7 - weekStart.getDay() + 1)
  weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)

  useEffect(() => {
    if (connections.some(c => c.channel === 'calendar_google' || c.channel === 'calendar_icloud')) {
      loadEvents()
    }
  }, [connections, weekOffset])

  async function loadEvents() {
    setEventsLoading(true)
    try {
      const headers = await authHeaders()
      const res = await fetch(`/api/calendar/events?start=${weekStart.toISOString()}&end=${weekEnd.toISOString()}`, { headers })
      const data = await res.json()
      setEvents(data.events ?? [])
    } catch {}
    setEventsLoading(false)
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })

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

  const hasCalendar = connections.some(c => c.channel === 'calendar_google' || c.channel === 'calendar_icloud')

  return (
    <div className="flex gap-5 items-start w-full max-w-[1400px]">

      {/* ── LEFT: Almanaque grande ── */}
      <div className="flex-1 min-w-0">
        <SectionCard className="p-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">Agenda</h3>
            <div className="flex items-center gap-1">
              <button onClick={() => setWeekOffset(o => o - 1)} className="rounded-lg p-1.5 hover:bg-slate-100 transition-colors">
                <ChevronLeft className="h-4 w-4 text-slate-600" />
              </button>
              <span className="text-xs text-slate-500 min-w-[150px] text-center">
                {weekStart.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })} – {weekEnd.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              <button onClick={() => setWeekOffset(o => o + 1)} className="rounded-lg p-1.5 hover:bg-slate-100 transition-colors">
                <ChevronRight className="h-4 w-4 text-slate-600" />
              </button>
              <button onClick={() => setWeekOffset(0)} className="ml-1 rounded-lg px-2 py-1 text-xs font-medium text-violet-600 hover:bg-violet-50 transition-colors">
                Hoy
              </button>
            </div>
          </div>

          {!hasCalendar ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-6">
              <CalendarDays className="h-10 w-10 text-slate-300" />
              <p className="text-sm font-medium text-slate-500">Conectá tu calendario para ver eventos aquí</p>
              <p className="text-xs text-slate-400">Usá los botones del panel derecho para conectar Google Calendar o iCloud.</p>
            </div>
          ) : eventsLoading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando eventos...
            </div>
          ) : (
            <div>
              {/* Días header */}
              <div className="grid border-b border-slate-100" style={{ gridTemplateColumns: '48px repeat(7, 1fr)' }}>
                <div className="border-r border-slate-100" />
                {weekDays.map(day => {
                  const isToday = isSameDay(day.toISOString(), new Date())
                  return (
                    <div key={day.toISOString()} className="py-2 text-center border-r border-slate-100 last:border-r-0">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide">{day.toLocaleDateString('es-AR', { weekday: 'short' })}</p>
                      <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold mt-0.5 ${isToday ? 'bg-violet-600 text-white' : 'text-slate-700'}`}>
                        {day.getDate()}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Grid horario */}
              <div style={{ height: '600px', overflowY: 'auto' }}>
                {Array.from({ length: 24 }, (_, hour) => (
                  <div key={hour} className="grid" style={{ gridTemplateColumns: '48px repeat(7, 1fr)', minHeight: '36px' }}>
                    <div className="border-r border-slate-100 pr-2 flex items-start justify-end pt-0">
                      <span className="text-[10px] text-slate-300 -mt-2">{hour === 0 ? '' : `${String(hour).padStart(2, '0')}:00`}</span>
                    </div>
                    {weekDays.map(day => {
                      const cellEvents = events.filter(ev => {
                        if (!isSameDay(ev.start, day)) return false
                        return new Date(ev.start).getHours() === hour
                      })
                      return (
                        <div key={day.toISOString()} className="border-r border-b border-slate-50 last:border-r-0 relative px-0.5 py-0.5 min-h-[36px]">
                          {cellEvents.map(ev => (
                            <div key={ev.id} className="rounded-md bg-violet-100 border border-violet-200 px-1.5 py-1 mb-0.5 cursor-default group relative">
                              <p className="text-[11px] font-semibold text-violet-800 truncate leading-tight">{ev.title ?? '(sin título)'}</p>
                              <p className="text-[10px] text-violet-500">{formatTime(ev.start)}{ev.end ? ` - ${formatTime(ev.end)}` : ''}</p>
                              <div className="absolute left-0 top-full mt-1 z-10 hidden group-hover:block w-48 rounded-xl border border-slate-200 bg-white shadow-lg p-2.5 text-xs text-slate-700 space-y-1">
                                <p className="font-semibold text-slate-900">{ev.title}</p>
                                {ev.location && <p className="flex items-center gap-1 text-slate-500"><MapPin className="h-3 w-3" />{ev.location}</p>}
                                {ev.description && <p className="text-slate-400 line-clamp-3">{ev.description}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      {/* ── RIGHT: Sidebar ── */}
      <div className="w-72 flex-shrink-0 space-y-4">

        {msg && (
          <div className={`rounded-xl px-3 py-2.5 text-xs font-medium ${msg.startsWith('✅') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            {msg}
          </div>
        )}

        {/* Google Calendar */}
        <SectionCard className="p-4 space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-slate-200 shadow-sm flex-shrink-0">
              <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">Google Calendar</p>
              <p className="text-[11px] text-slate-400">OAuth2 seguro</p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-xs text-slate-400"><Loader2 className="h-3 w-3 animate-spin" /> Cargando...</div>
          ) : googleConns.length > 0 ? (
            <div className="space-y-1.5">
              {googleConns.map(c => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                    <span className="text-xs font-medium text-emerald-800 truncate">{c.display_name}</span>
                  </div>
                  <button onClick={() => disconnect(c.channel, c.external_id)} disabled={disconnecting === c.external_id} className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-red-500 hover:bg-red-50 transition-colors flex-shrink-0 ml-1">
                    {disconnecting === c.external_id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <button onClick={connectGoogle} disabled={googleLoading} className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-60">
              {googleLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" aria-hidden="true">
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
        <SectionCard className="overflow-hidden">
          <button
            onClick={() => icloudConns.length === 0 && setIcloudExpanded(v => !v)}
            className="flex w-full items-center gap-2.5 p-4"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950 border border-slate-800 flex-shrink-0">
              <Apple className="h-4 w-4 text-white" />
            </span>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-slate-900">iCloud Calendar</p>
              {icloudConns.length > 0 ? (
                <p className="text-[11px] text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />{icloudConns[0].display_name}</p>
              ) : (
                <p className="text-[11px] text-slate-400">Contraseña de app Apple</p>
              )}
            </div>
            {icloudConns.length > 0 ? (
              <button onClick={e => { e.stopPropagation(); disconnect(icloudConns[0].channel, icloudConns[0].external_id) }} disabled={!!disconnecting} className="rounded p-1 text-red-400 hover:bg-red-50 transition-colors">
                {disconnecting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
              </button>
            ) : (
              <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${icloudExpanded ? 'rotate-180' : ''}`} />
            )}
          </button>

          {icloudExpanded && icloudConns.length === 0 && (
            <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-2">
              <div>
                <label className="text-[11px] font-medium text-slate-500">Apple ID</label>
                <input type="email" value={icloudEmail} onChange={e => setIcloudEmail(e.target.value)} placeholder="usuario@icloud.com" className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-violet-300" />
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-500">Contraseña de app</label>
                <input type="password" value={icloudPassword} onChange={e => setIcloudPassword(e.target.value)} placeholder="xxxx-xxxx-xxxx-xxxx" className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-violet-300" />
              </div>
              {icloudError && <p className="text-[11px] text-red-600">{icloudError}</p>}
              <div className="flex items-center gap-2">
                <button onClick={connectICloud} disabled={icloudLoading} className="flex items-center gap-1.5 rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors disabled:opacity-60">
                  {icloudLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Apple className="h-3 w-3" />}
                  Conectar
                </button>
                <a href="https://support.apple.com/es-ar/HT204397" target="_blank" rel="noopener noreferrer" className="text-[11px] text-violet-600 hover:underline flex items-center gap-0.5">
                  ¿Cómo? <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
            </div>
          )}
        </SectionCard>

        {/* Servicios */}
        <SectionCard className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Servicios</p>
              <p className="text-[11px] text-slate-400 mt-0.5">El bot los usa para ofrecer turnos</p>
            </div>
            <button onClick={() => setShowServiceForm(v => !v)} className="flex items-center gap-1 rounded-lg bg-violet-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-violet-700 transition-colors">
              <Plus className="h-3 w-3" /> Agregar
            </button>
          </div>

          {showServiceForm && (
            <div className="rounded-lg border border-violet-100 bg-violet-50 p-3 space-y-2">
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nombre del servicio" className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-violet-300" />
              <div className="grid grid-cols-2 gap-2">
                <input value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="Precio $" type="number" className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-violet-300" />
                <input value={newDuration} onChange={e => setNewDuration(e.target.value)} placeholder="Min" type="number" className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-violet-300" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {COLORS.map(c => (
                  <button key={c} onClick={() => setNewColor(c)} className={`h-5 w-5 rounded-full border-2 transition-transform ${newColor === c ? 'border-slate-800 scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                ))}
              </div>
              <div className="flex gap-1.5">
                <button onClick={saveService} disabled={savingService || !newName.trim()} className="rounded-lg bg-violet-600 px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-60 hover:bg-violet-700 transition-colors">
                  {savingService ? '...' : 'Guardar'}
                </button>
                <button onClick={() => setShowServiceForm(false)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] text-slate-500 hover:bg-slate-50 transition-colors">Cancelar</button>
              </div>
            </div>
          )}

          {services.length === 0 && !showServiceForm ? (
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-center">
              <p className="text-xs text-slate-400">Sin servicios todavía</p>
              <p className="text-[11px] text-slate-300 mt-0.5">Ej: Sesión Tattoo · 4h · $250.000</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {services.map(s => (
                <div key={s.id} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-white px-2.5 py-2 group">
                  <div className="h-7 w-1 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-800 truncate">{s.name}</p>
                    <p className="text-[10px] text-slate-400">
                      {s.duration_minutes >= 60 ? `${s.duration_minutes / 60}h` : `${s.duration_minutes}min`}
                      {s.price ? ` · $${Number(s.price).toLocaleString('es-AR')}` : ''}
                    </p>
                  </div>
                  <button onClick={() => deleteService(s.id)} className="opacity-0 group-hover:opacity-100 transition-opacity rounded p-0.5 hover:bg-red-50">
                    <X className="h-3 w-3 text-red-400" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Cómo funciona */}
        <div className="rounded-xl bg-amber-50 border border-amber-100 p-3.5 space-y-2">
          <p className="text-xs font-semibold text-amber-800">¿Cómo funciona?</p>
          <ul className="text-[11px] text-amber-700 space-y-1.5 leading-relaxed">
            <li><span className="font-medium">1.</span> El cliente escribe al bot pidiendo un turno</li>
            <li><span className="font-medium">2.</span> El bot revisa tu calendario y ofrece horarios libres</li>
            <li><span className="font-medium">3.</span> El cliente elige hora y paga la seña por Mercado Pago</li>
            <li><span className="font-medium">4.</span> Al confirmar el pago, el turno se crea automáticamente en tu calendario</li>
            <li><span className="font-medium">5.</span> El cliente recibe confirmación por WhatsApp</li>
          </ul>
          <p className="text-[11px] text-amber-600 pt-1 border-t border-amber-100">Para conectar Mercado Pago, ir a <span className="font-medium">Conexiones → Mercado Pago</span></p>
        </div>
      </div>
    </div>
  )
}
