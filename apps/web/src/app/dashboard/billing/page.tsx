'use client'
import { useState, useEffect } from 'react'
import { useDashboard } from '../DashboardContext'
import { CreditCard, CheckCircle2, Infinity as InfinityIcon, Zap, Loader2 } from 'lucide-react'
import CouponForm from './CouponForm'

const MP_PLAN_URL = `https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_plan_id=${process.env.NEXT_PUBLIC_MP_PLAN_ID || '3ec02d432a2d4e38969392039bbcf632'}`

export default function BillingPage() {
  const { business, loading, reload } = useDashboard()
  const [paying, setPaying] = useState(false)

  // Si volvió de MP con pago ok, recargar negocio
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('pago=ok')) {
      reload()
    }
  }, [])

  const handlePrimerMes = async () => {
    setPaying(true)
    try {
      const res = await fetch('/api/mp/create-preference', { method: 'POST' })
      const data = await res.json()
      if (data.init_point) window.location.href = data.init_point
    } catch { setPaying(false) }
  }

  if (loading) return (
    <div className="p-8 max-w-2xl animate-pulse">
      <div className="h-8 bg-gray-200 rounded-xl w-40 mb-2" />
      <div className="h-4 bg-gray-100 rounded-xl w-56 mb-8" />
      <div className="bg-white rounded-2xl border border-gray-100 h-64" />
    </div>
  )

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

      {isLifetime ? (
        <div className="card border-2 border-emerald-500 mb-6 relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <InfinityIcon className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-bold text-gray-900">Acceso de por vida</p>
              <p className="text-xs text-emerald-600 font-semibold">Código: {business?.coupon_used}</p>
            </div>
          </div>
          <p className="text-gray-500 text-sm">Tu cuenta nunca vence.</p>
        </div>
      ) : isPaid ? (
        <div className="card border-2 border-indigo-500 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="font-bold text-gray-900">Plan Activo</p>
              <p className="text-gray-500 text-sm">Mensajes ilimitados · Bot activo 24/7</p>
            </div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
            <p className="font-semibold text-gray-800 mb-1">¿Querés cancelar?</p>
            <p className="text-xs text-gray-500">Podés dar de baja la suscripción directamente desde Mercado Pago → <strong>Mis suscripciones</strong>. Una vez cancelada, el bot seguirá activo hasta el fin del período ya pago.</p>
            <a href="https://www.mercadopago.com.ar/subscriptions" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-xs text-indigo-600 hover:underline font-medium">
              Ir a Mis suscripciones en MP →
            </a>
          </div>
        </div>
      ) : (
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
          <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
            <div className={`h-2 rounded-full ${trialPct >= 80 ? 'bg-red-400' : 'bg-indigo-400'}`} style={{ width: `${Math.max(2, trialPct)}%` }} />
          </div>
          <div className="bg-indigo-50 rounded-xl p-4 mb-4">
            <p className="text-xs text-indigo-500 font-semibold uppercase tracking-wide mb-1">Para continuar sin límites</p>
            <div className="flex items-end gap-2 mb-1">
              <span className="text-4xl font-black text-gray-900">$40.000</span>
              <span className="text-gray-500 mb-1">ARS primer mes</span>
            </div>
            <p className="text-gray-500 text-sm">Luego <strong className="text-gray-700">$60.000/mes</strong></p>
          </div>
          <ul className="space-y-2 mb-5">
            {['Bot activo 24/7','IA con tu tono y negocio','Panel de conversaciones','Sin límite de mensajes','Soporte por WhatsApp'].map(f => (
              <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />{f}
              </li>
            ))}
          </ul>
          <button onClick={handlePrimerMes} disabled={paying} className="btn-primary w-full flex items-center justify-center gap-2">
            {paying ? <><Loader2 className="w-4 h-4 animate-spin" /> Redirigiendo...</> : 'Pagar primer mes · $40.000'}
          </button>
          <p className="text-xs text-gray-400 text-center mt-2">Pago seguro · Tarjeta, débito o transferencia</p>
          <p className="text-xs text-gray-400 text-center">Luego podés suscribirte a <strong>$60.000/mes</strong> con renovación automática</p>
          <div className="mt-4"><CouponForm /></div>
        </div>
      )}
    </div>
  )
}
