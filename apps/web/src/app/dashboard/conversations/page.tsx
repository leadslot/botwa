'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useDashboard } from '../DashboardContext'
import { MessageSquare, ArrowUpRight, ArrowDownLeft } from 'lucide-react'

export default function ConversationsPage() {
  const { business, loading: bizLoading } = useDashboard()
  const [convList, setConvList] = useState<any[]>([])
  const [totalMsgs, setTotalMsgs] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (bizLoading) return
    if (!business) { setLoading(false); return }

    const supabase = createClient()
    supabase
      .from('whatsapp_messages')
      .select('id, from_number, message, direction, created_at')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data: messages }: { data: any[] | null }) => {
        const conversations = (messages || []).reduce((acc: Record<string, any[]>, msg: any) => {
          const key = msg.from_number.replace('@s.whatsapp.net', '')
          if (!acc[key]) acc[key] = []
          acc[key].push(msg)
          return acc
        }, {})
        setConvList(Object.entries(conversations).map(([number, msgs]) => ({
          number, lastMsg: (msgs as any[])[0], count: (msgs as any[]).length
        })))
        setTotalMsgs(messages?.length || 0)
        setLoading(false)
      })
  }, [business, bizLoading])

  if (bizLoading || loading) return (
    <div className="p-8 animate-pulse">
      <div className="h-8 bg-gray-200 rounded-xl w-48 mb-2" />
      <div className="h-4 bg-gray-100 rounded-xl w-64 mb-8" />
      <div className="space-y-3">
        {[1,2,3,4,5].map(i => <div key={i} className="bg-white rounded-2xl border border-gray-100 h-20" />)}
      </div>
    </div>
  )

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">Conversaciones</h1>
        <p className="text-gray-500">{convList.length} contactos · {totalMsgs} mensajes en total</p>
      </div>

      {convList.length === 0 ? (
        <div className="card text-center py-16">
          <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Sin conversaciones todavía</p>
          <p className="text-gray-400 text-sm mt-1">Los mensajes aparecerán aquí cuando alguien escriba al bot</p>
        </div>
      ) : (
        <div className="space-y-3">
          {convList.map(({ number, lastMsg, count }) => (
            <div key={number} className="card flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-indigo-600">{number.slice(-2)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-semibold text-gray-900 text-sm">+{number}</p>
                  <span className="text-xs text-gray-400">
                    {new Date(lastMsg.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm text-gray-500 truncate">{lastMsg.message}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{count} msgs</span>
                {lastMsg.direction === 'outbound'
                  ? <ArrowUpRight className="w-4 h-4 text-indigo-400" />
                  : <ArrowDownLeft className="w-4 h-4 text-gray-400" />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
