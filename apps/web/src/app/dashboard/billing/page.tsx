import { getDolarBlue, usdToARS } from '@/lib/dolar'
import { CreditCard, CheckCircle2, RefreshCw } from 'lucide-react'

export default async function BillingPage() {
  const dolarBlue = await getDolarBlue()
  const precioARS = usdToARS(15, dolarBlue)
  const precioARSDisplay = precioARS.toLocaleString('es-AR')
  const precioDiario = Math.ceil(precioARS / 30 / 100) * 100
  const precioDiarioDisplay = precioDiario.toLocaleString('es-AR')

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">Suscripción</h1>
        <p className="text-gray-500">Tu plan actual y método de pago</p>
      </div>

      {/* Plan card */}
      <div className="card border-2 border-indigo-500 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="font-semibold text-gray-900">Plan Profesional</p>
            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs font-semibold px-2 py-0.5 rounded-full mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              Período de prueba — 14 días gratis
            </span>
          </div>
          <CreditCard className="w-5 h-5 text-indigo-400" />
        </div>

        {/* Precio ARS */}
        <div className="bg-indigo-50 rounded-xl p-4 mb-4">
          <p className="text-xs text-indigo-500 font-semibold uppercase tracking-wide mb-1">Precio al vencimiento del período de prueba</p>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-black text-gray-900">${precioARSDisplay}</span>
            <span className="text-gray-500 mb-1">ARS/mes</span>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            Equivale a <strong>USD 15</strong> · Dólar blue <strong>${dolarBlue.toLocaleString('es-AR')}</strong>
          </p>
          <p className="text-indigo-600 text-xs font-semibold mt-1">
            Menos de ${precioDiarioDisplay} ARS por día
          </p>
          <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
            <RefreshCw className="w-3 h-3" />
            Cotización actualizada desde dolarhoy.com · Se recalcula en cada pago
          </div>
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

        <button className="btn-primary w-full">
          Agregar método de pago
        </button>
        <p className="text-xs text-gray-400 text-center mt-2">
          No se realiza ningún cobro hasta que termine tu prueba gratis.
        </p>
      </div>
    </div>
  )
}
