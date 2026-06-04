'use client'

import { useEffect, useRef, useState } from 'react'
import { useDashboard } from '../DashboardContext'
import { Ban, Bot, Clock3, Filter, MessageSquare, Paperclip, Pause, Play, Search, Send, Trash2, UserRound } from 'lucide-react'
import { SectionCard, StatusPill } from '@/components/dashboard/ui'

type Msg = {
  id: string
  from_number: string
  message: string
  direction: 'inbound' | 'outbound'
  created_at: string
  push_name?: string | null
  channel?: string
}

type Contact = {
  key: string
  number: string
  channel: string
  messages: Msg[]
  lastMsg: Msg
}

const cleanNumber = (n: string) => n.replace(/@[^@]+$/, '').replace(/[^0-9+]/g, '')

// Detecta si es un LID irresolvible (no es un numero de telefono real)
const isLid = (n: string) => n.includes('@lid') || n.replace(/\D/g,'').length > 13

// Muestra nombre o numero segun lo que este disponible
function contactLabel(number: string, msgs: Msg[], index?: number): string {
  const channel = msgs[0]?.channel
  if (channel && channel !== 'whatsapp') return msgs.find(m => m.push_name)?.push_name || number
  if (!isLid(number)) return `+${number}`
  const name = msgs.find(m => m.push_name)?.push_name
  if (name) return name
  return index !== undefined ? `Cliente ${index + 1}` : 'Cliente'
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatTimeShort(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const isToday = d.toDateString() === today.toDateString()
  if (isToday) return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
}

export default function ConversationsPage() {
  const { loading: bizLoading, business } = useDashboard()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [pausedContacts, setPausedContacts] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (bizLoading) return
    fetch('/api/conversations')
      .then(r => r.json())
      .then(({ messages }: { messages: Msg[] }) => {
        const map: Record<string, Msg[]> = {}
        for (const msg of messages ?? []) {
          const channel = msg.channel ?? 'whatsapp'
          const clean = channel === 'whatsapp' ? cleanNumber(msg.from_number) : msg.from_number
          const key = `${channel}:${clean}`
          if (!map[key]) map[key] = []
          map[key].push(msg)
        }
        const list = Object.entries(map).map(([key, msgs]) => {
          const [channel, ...rest] = key.split(':')
          return { key, number: rest.join(':'), channel, messages: [...msgs].reverse(), lastMsg: msgs[0] }
        })
        list.sort((a, b) => new Date(b.lastMsg.created_at).getTime() - new Date(a.lastMsg.created_at).getTime())
        setContacts(list)
        if (list.length > 0) setSelected(list[0].key)
        setLoading(false)
      })
  }, [bizLoading])

  const activeContact = contacts.find(c => c.key === selected)
  const activeContactIndex = contacts.findIndex(c => c.key === selected)
  const totalMsgs = contacts.reduce((s, c) => s + c.messages.length, 0)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selected, activeContact?.messages.length])

  const togglePause = async (number: string) => {
    const wasPaused = pausedContacts.has(number)
    const newPaused = !wasPaused
    setPausedContacts(prev => {
      const next = new Set(prev)
      if (newPaused) next.add(number)
      else next.delete(number)
      return next
    })
    await fetch('/api/conversations/pause', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ number, paused: newPaused }),
    })
  }

  const blockContact = async (number: string) => {
    if (!confirm(`¿Bloquear este contacto? El bot no volverá a responderle.`)) return
    await fetch('/api/conversations/block', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ number }),
    })
    setContacts(prev => prev.filter(c => c.number !== number))
    if (selected === number) setSelected(null)
  }

  const deleteConversation = async (number: string) => {
    if (!confirm(`¿Eliminar toda la conversación con +${number}?`)) return
    await fetch('/api/conversations', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ number }),
    })
    setContacts(prev => prev.filter(c => c.number !== number))
    if (selected === number) setSelected(null)
  }

  if (bizLoading || loading) return (
    <div className="animate-pulse space-y-6">
      <div className="h-10 w-64 rounded-2xl bg-slate-200" />
      <div className="grid gap-5 xl:grid-cols-[350px_1fr_360px]">
        {[1, 2, 3].map(i => <div key={i} className="h-[620px] rounded-[24px] border border-slate-200 bg-white" />)}
      </div>
    </div>
  )

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 56px - 32px)' }}>
      <div className="mb-3 shrink-0">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Conversaciones</h1>
        <p className="text-sm text-slate-500">{contacts.length} contacto · {totalMsgs} mensajes en total</p>
      </div>

      {contacts.length === 0 ? (
        <SectionCard className="flex flex-1 items-center justify-center p-8">
          <div className="text-center">
            <MessageSquare className="mx-auto mb-4 h-14 w-14 text-slate-300" />
            <p className="text-xl font-semibold text-slate-950">Sin conversaciones todavía</p>
            <p className="mt-2 text-slate-500">Los mensajes aparecerán aquí cuando alguien escriba al bot.</p>
          </div>
        </SectionCard>
      ) : (
        <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[300px_minmax(500px,1fr)_235px]">
          <SectionCard className="flex flex-col overflow-hidden p-2.5">
            <div className="flex gap-2">
              <div className="flex flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-1.5">
                <Search className="h-4 w-4 text-slate-400" />
                <input className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-slate-400" placeholder="Buscar contactos..." />
              </div>
              <button className="flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600">
                <Filter className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              {['Todas', 'No leídos', 'En curso', 'Cerradas'].map((filter, index) => (
                <button key={filter} className={`rounded-xl border px-2.5 py-1.5 text-[11px] font-semibold ${index === 0 ? 'border-[#6C4DFF] bg-[#6C4DFF] text-white' : 'border-slate-200 bg-white text-slate-500'}`}>
                  {filter}
                </button>
              ))}
            </div>

            <div className="mt-3 flex-1 space-y-2 overflow-y-auto">
              {contacts.map(({ key, number, channel, lastMsg, messages }, idx) => {
                const isActive = selected === key
                return (
                  <div key={key} className="group relative">
                    <button
                      onClick={() => setSelected(key)}
                      className={`w-full rounded-2xl border p-2.5 text-left transition ${
                        isActive ? 'border-violet-300 bg-[#F5F2FF]' : 'border-slate-200 bg-white hover:border-violet-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F1EDFF] text-[#6C4DFF]">
                          <UserRound className="h-4 w-4" />
                          <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-white bg-[#22C55E]" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-semibold text-slate-950">{contactLabel(number, messages, idx)}</p>
                            <span className="text-xs font-semibold text-slate-500">{formatTimeShort(lastMsg.created_at)}</span>
                          </div>
                          <p className="mt-0.5 truncate text-xs text-slate-500"><span className="font-semibold uppercase text-[#6C4DFF]">{channel}</span> · {lastMsg.message}</p>
                        </div>
                        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#6C4DFF] px-2 text-[11px] font-semibold text-white">
                          {messages.length}
                        </span>
                      </div>
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); blockContact(number) }}
                      className="absolute right-10 top-3 rounded-xl p-2 text-slate-300 opacity-0 pointer-events-none transition hover:bg-orange-50 hover:text-orange-500 group-hover:opacity-100 group-hover:pointer-events-auto"
                      title="Bloquear contacto (el bot no responderá)"
                    >
                      <Ban className="h-4 w-4" />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); deleteConversation(number) }}
                      className="absolute right-3 top-3 rounded-xl p-2 text-slate-300 opacity-0 pointer-events-none transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 group-hover:pointer-events-auto"
                      title="Eliminar conversación"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )
              })}
            </div>

            <div className="mt-2 flex justify-center gap-2 border-t border-slate-100 pt-2">
              <button className="h-8 w-8 rounded-xl border border-slate-200 text-slate-500">‹</button>
              <button className="h-8 w-8 rounded-xl bg-gradient-to-r from-[#6C4DFF] to-[#A855F7] text-sm font-semibold text-white">1</button>
              <button className="h-8 w-8 rounded-xl border border-slate-200 text-slate-500">›</button>
            </div>
          </SectionCard>

          <SectionCard className="flex flex-col overflow-hidden">
            {activeContact ? (
              <>
                <div className="flex items-center justify-between border-b border-slate-100 p-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F1EDFF] text-[#6C4DFF]">
                      <UserRound className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-base font-semibold text-slate-950">{contactLabel(activeContact.number, activeContact.messages, activeContactIndex)}</p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <StatusPill tone="violet">{activeContact.channel}</StatusPill>
                        <span className="text-xs text-slate-500">{activeContact.messages.length} mensajes</span>
                        <StatusPill tone="green">En linea</StatusPill>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => activeContact && togglePause(activeContact.number)}
                      className={`flex h-9 w-9 items-center justify-center rounded-2xl border transition ${
                        pausedContacts.has(activeContact?.number ?? '')
                          ? 'border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100'
                          : 'border-slate-200 text-slate-400 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-500'
                      }`}
                      title={pausedContacts.has(activeContact?.number ?? '') ? 'Reanudar bot' : 'Pausar bot para este contacto'}
                    >
                      {pausedContacts.has(activeContact?.number ?? '')
                        ? <Play className="h-4 w-4" />
                        : <Pause className="h-4 w-4" />
                      }
                    </button>
                    <button
                      onClick={() => { if (activeContact) blockContact(activeContact.number) }}
                      className="flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 text-slate-400 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-500 transition"
                      title="Bloquear contacto"
                    >
                      <Ban className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => { if (activeContact) { if (!confirm(`¿Eliminar conversación con +${activeContact.number}?`)) return; deleteConversation(activeContact.number) }}}
                      className="flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 text-slate-400 hover:border-red-200 hover:bg-red-50 hover:text-red-500 transition"
                      title="Eliminar conversación"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 space-y-2.5 overflow-y-auto bg-white px-3 py-2.5">
                  <div className="text-center"><span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-500">Hoy</span></div>
                  {activeContact.messages.map((msg, i) => {
                    const isOut = msg.direction === 'outbound'
                    return (
                      <div key={msg.id ?? i} className={`flex ${isOut ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[72%] rounded-2xl px-3 py-1.5 text-sm leading-5 shadow-sm ${
                          isOut
                            ? 'rounded-br-md bg-[#F1EDFF] text-[#4C1DFF]'
                            : 'rounded-bl-md bg-slate-100 text-slate-700'
                        }`}>
                          <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                          <p className={`mt-1 text-right text-[11px] ${isOut ? 'text-[#6C4DFF]/70' : 'text-slate-400'}`}>
                            {formatTime(msg.created_at)}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={bottomRef} />
                </div>

                {pausedContacts.has(activeContact?.number ?? '') && (
                  <div className="border-t border-amber-100 bg-amber-50 px-5 py-1.5 text-center text-xs font-semibold text-amber-700">
                    Bot pausado para este contacto - responde manualmente desde tu telefono
                  </div>
                )}
                <div className="border-t border-slate-100 p-2.5">
                  <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
                    <button className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 text-slate-500">:)</button>
                    <input className="min-w-0 flex-1 bg-transparent px-2 text-sm font-medium outline-none placeholder:text-slate-400" placeholder="Escribir mensaje..." />
                    <Paperclip className="h-5 w-5 text-slate-400" />
                    <button className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-r from-[#6C4DFF] to-[#A855F7] text-white">
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-2 text-center text-[11px] text-slate-400">Responbot responde automaticamente desde nuestro servidor.</p>
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-slate-400">Seleccioná una conversación</div>
            )}
          </SectionCard>

          <div className="flex flex-col gap-3 overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <SectionCard className="p-2.5">
                <Clock3 className="mb-2 h-6 w-6 text-[#6C4DFF]" />
                <p className="text-xs font-semibold text-slate-500">Demora configurada</p>
                <p className="text-xl font-semibold text-slate-950">
                  {business?.response_delay_seconds ? `${business.response_delay_seconds} seg` : 'Inmediata'}
                </p>
                <p className="text-xs text-slate-500">Tiempo de respuesta</p>
              </SectionCard>
              <SectionCard className="p-2.5">
                <Bot className="mb-2 h-6 w-6 text-[#6C4DFF]" />
                <p className="text-xs font-semibold text-slate-500">Bot activo</p>
                <p className="text-xl font-semibold text-slate-950">24/7</p>
                <span className="mt-2 block h-2 w-2 rounded-full bg-[#22C55E]" />
              </SectionCard>
            </div>

            <SectionCard className="p-2.5">
              <h2 className="mb-2 text-base font-semibold text-slate-950">Contacto</h2>
              <div className="rounded-2xl border border-slate-100 bg-white p-2.5 text-center">
                <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#F1EDFF] text-[#6C4DFF]">
                  <UserRound className="h-5 w-5" />
                </span>
                <p className="mt-1.5 truncate text-sm font-semibold text-slate-950">{activeContact ? contactLabel(activeContact.number, activeContact.messages, activeContactIndex) : ''}</p>
                <div className="mt-2 divide-y divide-slate-100 text-xs">
                  <div className="flex justify-between py-1.5"><span className="text-slate-500">Mensajes</span><span className="font-semibold">{activeContact?.messages.length ?? 0}</span></div>
                  <div className="flex justify-between py-1.5"><span className="text-slate-500">Canal</span><span className="font-semibold capitalize">{activeContact?.channel ?? '-'}</span></div>
                  <div className="flex justify-between py-1.5"><span className="text-slate-500">Último</span><span className="font-semibold">Hoy</span></div>
                  <div className="flex items-center justify-between py-1.5"><span className="text-slate-500">Estado</span><StatusPill tone="green">En linea</StatusPill></div>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
      )}
    </div>
  )
}

