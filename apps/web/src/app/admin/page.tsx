import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TrendingUp, Users, MessageSquare, Zap, AlertTriangle, CheckCircle2 } from 'lucide-react'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'maxijrodriguez09@gmail.com'
const DAILY_LIMIT = 200
const TRIAL_LIMIT = 50

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== ADMIN_EMAIL) redirect('/dashboard')

  const { data: businesses } = await supabase
    .from('businesses')
    .select('*, whatsapp_sessions(status)')
    .order('messages_used', { ascending: false })

  const total = businesses?.length ?? 0
  const activos = businesses?.filter(b => b.whatsapp_sessions?.[0]?.status === 'connected').length ?? 0
  const pagos = businesses?.filter(b => b.is_paid).length ?? 0
  const totalMsgs = businesses?.reduce((s, b) => s + (b.messages_used || 0), 0) ?? 0
  const totalTokens = businesses?.reduce((s, b) => s + (b.tokens_estimated || 0), 0) ?? 0
  const msgHoy = businesses?.reduce((s, b) => s + (b.daily_messages_count || 0), 0) ?? 0

  // Groq free: 500.000 tokens/día × 2 keys = 1.000.000
  const groqCapacity = 1_000_000
  const usoPct = Math.min(100, Math.round((totalTokens / groqCapacity) * 100))

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-black text-gray-900">Panel de Admin</h1>
            <p className="text-gray-500">Uso de APIs y estado de todos los negocios</p>
          </div>
          <div className="flex gap-2">
            <a href="/admin/coupons"
              className="btn-secondary text-sm flex items-center gap-2">
              🎟️ Códigos
            </a>
            <a href="/admin/api-keys"
              className="btn-primary text-sm flex items-center gap-2">
              🔑 Gestionar APIs
            </a>
          </div>
        </div>

        {/* Stats globales */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Negocios totales', value: total, icon: Users, color: 'text-indigo-500', bg: 'bg-indigo-50' },
            { label: 'WhatsApp activos', value: activos, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
            { label: 'Clientes pagos', value: pagos, icon: TrendingUp, color: 'text-violet-500', bg: 'bg-violet-50' },
            { label: 'Msgs hoy (total)', value: msgHoy, icon: MessageSquare, color: 'text-amber-500', bg: 'bg-amber-50' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center mb-3`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <p className="text-2xl font-black text-gray-900">{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Uso de API */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-8 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <Zap className="w-4 h-4 text-indigo-500" />
                Consumo de tokens (acumulado histórico)
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">Groq free: ~1.000.000 tokens/día con 2 keys</p>
            </div>
            <span className="text-2xl font-black text-gray-900">{(totalTokens / 1000).toFixed(0)}K</span>
          </div>

          {/* Barra por negocio */}
          <div className="space-y-2">
            {businesses?.slice(0, 10).map(b => {
              const tokens = b.tokens_estimated || 0
              const pct = totalTokens > 0 ? Math.round((tokens / totalTokens) * 100) : 0
              const isHeavy = (b.daily_messages_count || 0) > DAILY_LIMIT * 0.8
              return (
                <div key={b.id} className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 w-40 truncate font-medium">{b.name}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${isHeavy ? 'bg-red-400' : 'bg-indigo-400'}`}
                      style={{ width: `${Math.max(1, pct)}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-16 text-right">{(tokens/1000).toFixed(1)}K tok</span>
                  <span className="text-xs text-gray-400 w-16 text-right">{b.messages_used || 0} msgs</span>
                  {isHeavy && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                </div>
              )
            })}
          </div>
        </div>

        {/* Tabla de negocios */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">Todos los negocios</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Negocio', 'Estado WA', 'Plan', 'Msgs hoy', 'Msgs total', 'Tokens est.', 'Diario %'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {businesses?.map(b => {
                  const waStatus = b.whatsapp_sessions?.[0]?.status
                  const dailyPct = Math.round(((b.daily_messages_count || 0) / DAILY_LIMIT) * 100)
                  const trialPct = Math.round(((b.messages_used || 0) / TRIAL_LIMIT) * 100)
                  const isNearLimit = dailyPct > 80
                  return (
                    <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{b.name}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                          waStatus === 'connected'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${waStatus === 'connected' ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                          {waStatus === 'connected' ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          b.is_paid ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {b.is_paid ? 'Pago' : `Trial ${trialPct}%`}
                        </span>
                      </td>
                      <td className={`px-4 py-3 font-mono ${isNearLimit ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
                        {b.daily_messages_count || 0}
                        {isNearLimit && ' ⚠️'}
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-600">{b.messages_used || 0}</td>
                      <td className="px-4 py-3 font-mono text-gray-500">{((b.tokens_estimated || 0) / 1000).toFixed(1)}K</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-100 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full ${dailyPct > 80 ? 'bg-red-400' : 'bg-indigo-400'}`}
                              style={{ width: `${Math.min(100, dailyPct)}%` }} />
                          </div>
                          <span className="text-xs text-gray-400">{dailyPct}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {(!businesses || businesses.length === 0) && (
              <div className="p-12 text-center text-gray-400">No hay negocios registrados todavía</div>
            )}
          </div>
        </div>

        {/* Guía de escalado */}
        <div className="mt-8 bg-indigo-50 border border-indigo-100 rounded-2xl p-6">
          <h3 className="font-bold text-indigo-900 mb-3">📊 Guía de escalado de APIs</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            {[
              { keys: '2 Groq', cap: '28.800 msgs/día', clientes: '~144 clientes' },
              { keys: '2 Gemini', cap: '3.000 msgs/día', clientes: 'backup extra' },
              { keys: '4 Groq', cap: '57.600 msgs/día', clientes: '~288 clientes' },
              { keys: '6 Groq', cap: '86.400 msgs/día', clientes: '~432 clientes' },
            ].map(r => (
              <div key={r.keys} className="bg-white rounded-xl p-3 border border-indigo-100">
                <p className="font-bold text-indigo-700">{r.keys}</p>
                <p className="text-gray-600 text-xs">{r.cap}</p>
                <p className="text-indigo-500 text-xs font-semibold">{r.clientes}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-indigo-600 mt-3">Para agregar más keys: editá las variables de entorno en Railway (bot) sumando GROQ_API_KEY_3, GROQ_API_KEY_4, etc.</p>
        </div>

      </div>
    </div>
  )
}
