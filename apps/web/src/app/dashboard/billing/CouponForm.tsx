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
    <div className="mt-4 border-t border-slate-100 pt-4">
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
        <Tag className="h-4 w-4 text-[#6C4DFF]" />
        ¿Tenés un código de activación?
      </p>

      {result?.success ? (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-600">
          <CheckCircle2 className="h-4 w-4" />
          {result.type === 'lifetime'
            ? '¡Código aplicado! Tu cuenta tiene acceso de por vida.'
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
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 font-mono text-sm uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-[#6C4DFF]"
            />
            <button
              onClick={handleApply}
              disabled={isPending || !code.trim()}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#6C4DFF] to-[#A855F7] px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-violet-200 disabled:opacity-50"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Aplicar
            </button>
          </div>
          {result?.error && (
            <p className="mt-2 text-xs text-red-500">{result.error}</p>
          )}
        </>
      )}
    </div>
  )
}
