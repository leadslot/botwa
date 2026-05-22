'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Send } from 'lucide-react'

type ChatMessage = {
  id: string
  direction: 'inbound' | 'outbound'
  text: string
}

export default function WebchatWidget({ businessId }: { businessId: string }) {
  const [visitorId, setVisitorId] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'welcome', direction: 'outbound', text: 'Hola, escribinos tu consulta y te respondemos por aca.' },
  ])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    const key = `responbot_visitor_${businessId}`
    const saved = localStorage.getItem(key)
    if (saved) setVisitorId(saved)
    else {
      const next = crypto.randomUUID()
      localStorage.setItem(key, next)
      setVisitorId(next)
    }
  }, [businessId])

  const send = async () => {
    const text = draft.trim()
    if (!text || sending) return
    setDraft('')
    setSending(true)
    setMessages(prev => [...prev, { id: crypto.randomUUID(), direction: 'inbound', text }])
    try {
      const res = await fetch('/api/webchat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, visitorId, message: text }),
      })
      const data = await res.json()
      if (data.visitorId && data.visitorId !== visitorId) setVisitorId(data.visitorId)
      if (data.reply) {
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          direction: 'outbound',
          text: data.reply,
        }])
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <section className="flex h-[620px] w-full max-w-md flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl shadow-slate-200">
        <header className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
          <Image src="/logo.svg" alt="Responbot" width={40} height={40} className="rounded-2xl" />
          <div>
            <h1 className="text-base font-black text-slate-950">Responbot</h1>
            <p className="text-xs font-semibold text-emerald-600">En linea</p>
          </div>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto bg-[#F7F8FB] p-4">
          {messages.map(message => (
            <div key={message.id} className={`flex ${message.direction === 'inbound' ? 'justify-end' : 'justify-start'}`}>
              <p className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-5 shadow-sm ${
                message.direction === 'inbound'
                  ? 'rounded-br-md bg-[#6C4DFF] text-white'
                  : 'rounded-bl-md bg-white text-slate-700'
              }`}>
                {message.text}
              </p>
            </div>
          ))}
        </div>

        <footer className="border-t border-slate-100 p-3">
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2">
            <input
              value={draft}
              onChange={event => setDraft(event.target.value)}
              onKeyDown={event => { if (event.key === 'Enter') send() }}
              placeholder="Escribir mensaje..."
              className="min-w-0 flex-1 bg-transparent px-2 text-sm font-medium outline-none"
            />
            <button
              onClick={send}
              disabled={sending}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-[#6C4DFF] to-[#A855F7] text-white disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </footer>
      </section>
    </main>
  )
}
