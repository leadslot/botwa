'use client'
import { useEffect, useState } from 'react'
import { useDashboard } from '../DashboardContext'
import { MessageSquare, ArrowUpRight, ArrowDownLeft, Trash2 } from 'lucide-react'

type Msg = {
  id: string
  from_number: string
  message: string
  direction: 'inbound' | 'outbound'
  created_at: string
}

type Contact = {
  number: string
  messages: Msg[]
  lastMsg: Msg
}

const cleanNumber = (n: string) => n.replace(/@[^@]+$/, '').replace(/[^0-9+]/g, '')

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
  const { loading: bizLoading } = useDashboard()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (bizLoading) return
    fetch('/api/conversations')
      .then(r => r.json())
      .then(({ messages }: { messages: Msg[] }) => {
        const map: Record<string, Msg[]> = {}
        for (const msg of messages ?? []) {
          const key = cleanNumber(msg.from_number)
          if (!map[key]) map[key] = []
          map[key].push(msg)
        }
        const list = Object.entries(map).map(([number, msgs]) => {
          // msgs come desc from API, keep that for "last", but reverse for chat view
          return { number, messages: [...msgs].reverse(), lastMsg: msgs[0] }
        })
        list.sort((a, b) => new Date(b.lastMsg.created_at).getTime() - new Date(a.lastMsg.created_at).getTime())
        setContacts(list)
        if (list.length > 0) setSelected(list[0].number)
        setLoading(false)
      })
  }, [bizLoading])

  const activeContact = contacts.find(c => c.number === selected)
  const totalMsgs = contacts.reduce((s, c) => s + c.messages.length, 0)

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
    <div className="p-8 animate-pulse">
      <div className="h-8 bg-gray-200 rounded-xl w-48 mb-2" />
      <div className="h-4 bg-gray-100 rounded-xl w-64 mb-8" />
      <div className="space-y-3">
        {[1,2,3,4,5].map(i => <div key={i} className="bg-white rounded-2xl border border-gray-100 h-16" />)}
      </div>
    </div>
  )

  return (
    <div className="flex flex-col" style={{ height: '100vh' }}>
      {/* Header */}
      <div className="px-6 pt-6 pb-4 shrink-0">
        <h1 className="text-2xl font-black text-gray-900">Conversaciones</h1>
        <p className="text-gray-500 text-sm">{contacts.length} contactos · {totalMsgs} mensajes en total</p>
      </div>

      {contacts.length === 0 ? (
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center py-16">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Sin conversaciones todavía</p>
            <p className="text-gray-400 text-sm mt-1">Los mensajes aparecerán aquí cuando alguien escriba al bot</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 min-h-0 gap-4 px-6 pb-6">

          {/* Contact list */}
          <div className="w-72 shrink-0 flex flex-col gap-1 overflow-y-auto">
            {contacts.map(({ number, lastMsg, messages }) => {
              const isActive = selected === number
              const isOut = lastMsg.direction === 'outbound'
              return (
                <div key={number} className="relative group">
                <button
                  onClick={() => setSelected(number)}
                  className={`w-full text-left px-3 py-3 rounded-xl flex items-center gap-3 transition-all ${
                    isActive
                      ? 'bg-indigo-50 border border-indigo-200'
                      : 'bg-white border border-gray-100 hover:border-indigo-100 hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                    isActive ? 'bg-indigo-500 text-white' : 'bg-indigo-100 text-indigo-600'
                  }`}>
                    {number.slice(-2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className={`text-sm font-semibold truncate ${isActive ? 'text-indigo-700' : 'text-gray-800'}`}>
                        +{number}
                      </p>
                      <span className="text-[11px] text-gray-400 shrink-0">{formatTimeShort(lastMsg.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      {isOut
                        ? <ArrowUpRight className="w-3 h-3 text-indigo-400 shrink-0" />
                        : <ArrowDownLeft className="w-3 h-3 text-gray-400 shrink-0" />}
                      <p className="text-xs text-gray-500 truncate">{lastMsg.message}</p>
                    </div>
                  </div>
                  <span className="text-[11px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full shrink-0">
                    {messages.length}
                  </span>
                </button>
                <button
                  onClick={() => deleteConversation(number)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 text-gray-300 hover:text-red-400 transition-all"
                  title="Eliminar conversación"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                </div>
              )
            })}
          </div>

          {/* Chat panel */}
          <div className="flex-1 min-w-0 bg-white border border-gray-100 rounded-2xl flex flex-col overflow-hidden">
            {activeContact ? (
              <>
                {/* Chat header */}
                <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3 shrink-0">
                  <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                    {activeContact.number.slice(-2)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">+{activeContact.number}</p>
                    <p className="text-xs text-gray-400">{activeContact.messages.length} mensajes</p>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-gray-50">
                  {activeContact.messages.map((msg, i) => {
                    const isOut = msg.direction === 'outbound'
                    return (
                      <div key={msg.id ?? i} className={`flex ${isOut ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm leading-relaxed shadow-sm ${
                          isOut
                            ? 'bg-indigo-500 text-white rounded-br-sm'
                            : 'bg-white text-gray-800 rounded-bl-sm border border-gray-100'
                        }`}>
                          <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                          <p className={`text-[11px] mt-1 text-right ${isOut ? 'text-indigo-200' : 'text-gray-400'}`}>
                            {formatTime(msg.created_at)}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                Seleccioná una conversación
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  )
}
