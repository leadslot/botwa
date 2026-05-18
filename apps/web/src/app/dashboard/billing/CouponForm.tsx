'use client'
import { useState, useTransition } from 'react'
import { applyCoupon } from '@/app/actions/coupon'
import { Tag, Loader2, CheckCircle2 } from 'lucide-react'

export default function CouponForm() {
  const [code, setCode] = useState('')
  const [result, setResult] = useState<{ success?: boolean; error?: string; type?: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleApply = () => {
    if (!code.trim()) return
    startTransition(async () => {
      const res = await applyCoupon(code)
      setResult(res)
      if (res.success) {
        setTimeout(() => window.location.reload(), 1500)
      }
    })
  }

  return (
    <div className="mt-6 border-t border-gray-100 pt-6">
      <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <Tag className="w-4 h-4 text-indigo-400" />
        ¿Tenés un código de activación?
      </p>

      {result?.success ? (
        <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 rounded-xl px-4 py-3 text-sm font-semibold">
          <CheckCircle2 className="w-4 h-4" />
          {result.type === 'lifetime'
            ? '¡Código aplicado! Tu cuenta tiene acceso de por vida 🎉'
            : '¡Código aplicado!'}
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="CODIGO"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleApply()}
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={handleApply}
              disabled={isPending || !code.trim()}
              className="btn-primary text-sm px-5 flex items-center gap-2"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Aplicar
            </button>
          </div>
          {result?.error && (
            <p className="text-red-500 text-xs mt-2">{result.error}</p>
          )}
        </>
      )}
    </div>
  )
}
