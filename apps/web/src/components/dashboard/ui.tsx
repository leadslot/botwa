import { CheckCircle2 } from 'lucide-react'

export function SectionCard({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-[24px] border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.06)] ${className}`}>
      {children}
    </div>
  )
}

export function StatusPill({
  children,
  tone = 'green',
}: {
  children: React.ReactNode
  tone?: 'green' | 'violet' | 'amber' | 'red' | 'slate'
}) {
  const styles = {
    green: 'border-emerald-200 bg-[#EAFBF1] text-emerald-700',
    violet: 'border-violet-200 bg-[#F1EDFF] text-[#6C4DFF]',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    red: 'border-red-200 bg-red-50 text-red-600',
    slate: 'border-slate-200 bg-slate-50 text-slate-600',
  }

  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black ${styles[tone]}`}>
      {tone === 'green' && <span className="h-2 w-2 rounded-full bg-[#22C55E]" />}
      {children}
    </span>
  )
}

export function PurpleButton({
  children,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#6C4DFF] to-[#A855F7] px-5 py-3 text-sm font-black text-white shadow-lg shadow-violet-200 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function CheckRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-sm font-semibold text-slate-700">
      <CheckCircle2 className="h-5 w-5 shrink-0 text-[#22C55E]" />
      {children}
    </div>
  )
}

export function MiniLineChart({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 96" className={className} aria-hidden="true">
      <path d="M8 82H212" stroke="#E5E7EB" strokeWidth="1" />
      <path d="M8 54H212" stroke="#E5E7EB" strokeWidth="1" strokeDasharray="4 5" />
      <path d="M8 26H212" stroke="#E5E7EB" strokeWidth="1" strokeDasharray="4 5" />
      <path d="M8 70 C36 76 52 38 75 44 S104 82 132 58 S160 18 184 31 S200 62 212 44" fill="none" stroke="#6C4DFF" strokeWidth="4" strokeLinecap="round" />
      <path d="M8 78 C42 84 58 70 82 72 S112 42 142 49 S176 86 212 68" fill="none" stroke="#A855F7" strokeWidth="3" strokeLinecap="round" opacity="0.55" />
      {[8, 75, 132, 184, 212].map((cx, index) => (
        <circle key={cx} cx={cx} cy={[70, 44, 58, 31, 44][index]} r="4" fill="#FFFFFF" stroke="#6C4DFF" strokeWidth="3" />
      ))}
    </svg>
  )
}
