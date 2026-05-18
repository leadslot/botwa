import { createClient } from '@/lib/supabase/server'
import { CreditCard, CheckCircle2, Infinity as InfinityIcon, Zap } from 'lucide-react'
import CouponForm from './CouponForm'

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { session: _s } } = await supabase.auth.getSession(); const user = _s?.user ?? null

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, is_paid, plan, messages_used, coupon_used')
    .eq('user_id', user!.id)
    .single()

  const isLifetime = business?.plan === 'lifetime'
  const isPaid = business?.is_paid && !isLifetime
  const messagesUsed = business?.messages_used || 0
  const trialPct = Math.min(100, Math.round((messagesUsed / 50) * 100))

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">Suscripción</h1>
        <p className="text-gray-500">Tu plan actual y opciones de activación</p>
      </div>

      {/* Estado del plan */}
      {isLifetime ? (
        <div className="card border-2 border-emerald-500 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <InfinityIcon className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-bold text-gray-900">Acceso de por vida</p>
              <p className="text-xs text-emerald-600 font-semibold">Código aplicado: {business?.coupon_used}</p>
            </div>
          </div>
          <p className="text-gray-500 text-sm">Tu cuenta nunca vence. No se realiza ningún cobro.</p>
        </div>
      ) : isPaid ? (
        <div className="card border-2 border-indigo-500 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="font-bold text-gray-900">Plan Activo</p>
              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                Al día
              </span>
            </div>
          </div>
          <p className="text-gray-500 text-sm">Mensajes ilimitados · Bot activo 24/7</p>
        </div>
      ) : (
        /* TRIAL */
        <div className="card border-2 border-indigo-500 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="font-semibold text-gray-900">Período de prueba</p>
              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded-full mt-1">
                {messagesUsed}/50 mensajes usados
              </span>
            </div>
            <CreditCard className="w-5 h-5 text-indigo-400" />
          </div>

          {/* Barra de trial */}
          <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
            <div
              className={`h-2 rounded-full transition-all ${trialPct >= 80 ? 'bg-red-400' : 'bg-indigo-400'}`}
              style={{ width: `${Math.max(2, trialPct)}%` }}
            />
          </div>

          {/* Precio */}
          <div className="bg-indigo-50 rounded-xl p-4 mb-4">
            <p className="text-xs text-indigo-500 font-semibold uppercase tracking-wide mb-1">Para continuar sin límites</p>
            <div className="flex items-end gap-2 mb-1">
              <span className="text-4xl font-black text-gray-900">$40.000</span>
              <span className="text-gray-500 mb-1">ARS primer mes</span>
            </div>
            <p className="text-gray-500 text-sm">Luego <strong className="text-gray-700">$60.000/mes</strong> · Cancelás cuando querés</p>
            <p className="text-indigo-600 text-xs font-semibold mt-1">= $1.333 ARS por día el primer mes</p>
          </div>

          <ul className="space-y-2 mb-5">
            {[
              'Bot activo 24/7 en nuestro servidor',
              'IA con tu tono y negocio',
              'Panel de conversaciones',
              'Sin límite de mensajes',
              'Soporte por WhatsApp',
            ].map(f => (
              <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>

          <a
            href="https://wa.me/5491112345678?text=Hola%2C+quiero+activar+BotWA+para+mi+negocio"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary w-full block text-center"
          >
            Activar suscripción por WhatsApp
          </a>
          <p className="text-xs text-gray-400 text-center mt-2">
            Te enviamos el link de pago de Mercado Pago por WhatsApp
          </p>

          <CouponForm />
        </div>
      )}

      {/* Si ya es activo o lifetime, igual mostrar el form de código (por si quieren aplicar otro) */}
      {(isPaid || isLifetime) && !isLifetime && (
        <div className="card">
          <CouponForm />
        </div>
      )}
    </div>
  )
}
