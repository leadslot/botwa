'use client'
import { useEffect } from 'react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Dashboard error:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
      <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
        <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
        </svg>
      </div>
      <div>
        <h2 className="text-xl font-black text-slate-900 mb-1">Algo salió mal</h2>
        <p className="text-sm text-slate-500 max-w-sm">
          {error?.message || 'Error desconocido'}
        </p>
        {error?.digest && (
          <p className="text-xs text-slate-400 mt-1 font-mono">ID: {error.digest}</p>
        )}
      </div>
      <button
        onClick={reset}
        className="px-6 py-3 rounded-2xl bg-[#6C4DFF] text-white font-bold text-sm hover:bg-[#5a3de8] transition"
      >
        Reintentar
      </button>
    </div>
  )
}
