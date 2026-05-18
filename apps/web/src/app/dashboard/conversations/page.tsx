import { createClient } from '@/lib/supabase/server'
import { MessageSquare, ArrowUpRight, ArrowDownLeft } from 'lucide-react'

export default async function ConversationsPage() {
  const supabase = await createClient()
  const { data: { session: _s } } = await supabase.auth.getSession(); const user = _s?.user ?? null
  if (!user) { const { redirect } = await import('next/navigation'); redirect('/login') }

  const { data: business } = await supabase
    .from('businesses').select('id').eq('user_id', user!.id).single()

  const { data: messages } = business ? await supabase
    .from('whatsapp_messages')
    .select('*')
    .eq('business_id', business.id)
    .order('created_at', { ascending: false })
    .limit(100) : { data: [] }

  // Agrupar por número
  const conversations = messages?.reduce((acc: Record<string, any[]>, msg) => {
    const key = msg.from_number.replace('@s.whatsapp.net', '')
    if (!acc[key]) acc[key] = []
    acc[key].push(msg)
    return acc
  }, {}) || {}

  const convList = Object.entries(conversations).map(([number, msgs]) => ({
    number,
    lastMsg: msgs[0],
    count: msgs.length,
  }))

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">Conversaciones</h1>
        <p className="text-gray-500">{convList.length} contactos · {messages?.length || 0} mensajes en total</p>
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
