'use client'

import { useEffect, useState } from 'react'
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Mail,
  Play,
  RefreshCw,
  Send,
  Trash2,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { SectionCard, StatusPill } from '@/components/dashboard/ui'

type EmailDraft = {
  id: string
  provider: string
  subject: string
  from_email: string
  from_name: string
  original_snippet: string
  draft_body: string
  status: 'pending' | 'sent' | 'auto_sent' | 'discarded'
  auto_sent: boolean
  created_at: string
}

type EmailConnection = {
  id: string
  display_name: string | null
  external_id: string
  status: string
  metadata: {
    provider: string
    email: string
    auto_send_enabled?: boolean
    mode?: string
  }
}

const providerLabel: Record<string, string> = { gmail: 'Gmail', outlook: 'Outlook', icloud: 'iCloud' }

function statusTone(status: string): 'green' | 'amber' | 'slate' | 'violet' {
  if (status === 'sent' || status === 'auto_sent') return 'green'
  if (status === 'pending') return 'amber'
  return 'slate'
}
function statusLabel(status: string) {
  if (status === 'sent') return 'Enviado'
  if (status === 'auto_sent') return 'Enviado auto'
  if (status === 'pending') return 'Pendiente'
  if (status === 'discarded') return 'Descartado'
  return status
}

function timeAgo(iso: string) {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime())
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

export default function EmailPage() {
  const [connections, setConnections] = useState<EmailConnection[]>([])
  const [drafts, setDrafts] = useState<EmailDraft[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [processResult, setProcessResult] = useState<string | null>(null)
  const [expandedDraft, setExpandedDraft] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(0) // 0 = manual

  async function load() {
    setLoading(true)
    const [chRes, drRes] = await Promise.all([
      fetch('/api/channels'),
      fetch('/api/email/drafts'),
    ])
    const chData = await chRes.json()
    const drData = await drRes.json()
    const emailConns = (chData.channels ?? []).filter((c: EmailConnection) => c.status !== 'disconnected' && c.external_id?.includes(':'))
    setConnections(emailConns)
    setDrafts(drData.drafts ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // Auto-refresh
  useEffect(() => {
    if (!autoRefreshInterval) return
    const id = setInterval(() => processEmails(), autoRefreshInterval * 60 * 1000)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefreshInterval])

  async function processEmails() {
    setProcessing(true)
    setProcessResult(null)
    const res = await fetch('/api/email/process', { method: 'POST' })
    const data = await res.json()
    if (data.drafts === 0 && !data.errors?.length) {
      setProcessResult('Sin correos nuevos.')
    } else if (data.errors?.length) {
      setProcessResult(`${data.drafts} borradores creados. Errores: ${data.errors.join('; ')}`)
    } else {
      setProcessResult(`${data.drafts} borradores nuevos preparados.`)
    }
    await load()
    setProcessing(false)
  }

  async function toggleAutoSend(conn: EmailConnection, value: boolean) {
    await fetch(`/api/email/connections/${conn.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auto_send_enabled: value }),
    })
    await load()
  }

  async function draftAction(draft: EmailDraft, action: 'send' | 'discard') {
    setActionLoading(draft.id + action)
    const res = await fetch(`/api/email/drafts/${draft.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    const data = await res.json()
    if (!res.ok) alert(data.error || 'Error')
    await load()
    setActionLoading(null)
  }

  const pendingDrafts = drafts.filter(d => d.status === 'pending')
  const sentDrafts = drafts.filter(d => d.status === 'sent' || d.status === 'auto_sent')

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Correos</h1>
          <p className="mt-1 text-sm text-slate-500">
            El bot lee los correos entrantes, prepara borradores con IA y te los muestra antes de enviar. Si activas auto-envio, los despacha automaticamente.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={autoRefreshInterval}
            onChange={e => setAutoRefreshInterval(Number(e.target.value))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-violet-300"
          >
            <option value={0}>Manual</option>
            <option value={5}>Cada 5 min</option>
            <option value={10}>Cada 10 min</option>
            <option value={15}>Cada 15 min</option>
            <option value={30}>Cada 30 min</option>
            <option value={60}>Cada 1 hora</option>
          </select>
          <button
            onClick={processEmails}
            disabled={processing || !connections.length}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#6C4DFF] to-[#A855F7] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${processing ? 'animate-spin' : ''}`} />
            {processing ? 'Procesando...' : 'Procesar correos'}
          </button>
        </div>
      </div>

      {processResult && (
        <div className="rounded-2xl border border-violet-200 bg-[#F8F5FF] px-4 py-3 text-sm font-semibold text-[#6C4DFF]">
          {processResult}
        </div>
      )}

      {/* Connections */}
      <SectionCard className="p-4">
        <h2 className="mb-3 text-base font-semibold text-slate-950">Casillas conectadas</h2>
        {loading ? (
          <p className="text-sm text-slate-500">Cargando...</p>
        ) : connections.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center">
            <Mail className="mx-auto mb-2 h-8 w-8 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">Sin casillas conectadas</p>
            <p className="mt-1 text-xs text-slate-400">
              Conecta Gmail, Outlook o iCloud desde{' '}
              <a href="/dashboard/connect" className="font-semibold text-[#6C4DFF] underline">Canales</a>.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {connections.map(conn => {
              const meta = conn.metadata
              const autoSend = Boolean(meta?.auto_send_enabled)
              return (
                <div key={conn.id} className="flex flex-col gap-3 rounded-2xl border border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F1EDFF] text-[#6C4DFF]">
                      <Mail className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-semibold text-slate-950">{conn.display_name || meta?.email || conn.external_id}</p>
                      <p className="text-xs text-slate-500">{providerLabel[meta?.provider] ?? meta?.provider} · {autoSend ? 'Auto-envio activo' : 'Solo borradores'}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <StatusPill tone={conn.status === 'active' ? 'green' : 'slate'}>
                      {conn.status === 'active' ? 'Conectada' : 'Pausada'}
                    </StatusPill>

                    {/* Auto-send toggle */}
                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
                      <Zap className="h-4 w-4 text-[#6C4DFF]" />
                      <span className="text-xs font-medium text-slate-600">Auto-envio</span>
                      <button
                        onClick={() => toggleAutoSend(conn, !autoSend)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${autoSend ? 'bg-[#6C4DFF]' : 'bg-slate-200'}`}
                        role="switch"
                        aria-checked={autoSend}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${autoSend ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </SectionCard>

      {/* Pending drafts */}
      <SectionCard className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div>
            <h2 className="text-base font-semibold text-slate-950">Borradores pendientes</h2>
            <p className="text-xs text-slate-500">El bot preparó estas respuestas. Revisá y enviá, o descartá.</p>
          </div>
          {pendingDrafts.length > 0 && (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#6C4DFF] text-xs font-bold text-white">{pendingDrafts.length}</span>
          )}
        </div>

        {pendingDrafts.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-400" />
            <p className="text-sm text-slate-500">Sin borradores pendientes. Toca &quot;Procesar correos&quot; para buscar nuevos.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {pendingDrafts.map(draft => (
              <DraftRow
                key={draft.id}
                draft={draft}
                expanded={expandedDraft === draft.id}
                onToggle={() => setExpandedDraft(expandedDraft === draft.id ? null : draft.id)}
                onSend={() => draftAction(draft, 'send')}
                onDiscard={() => draftAction(draft, 'discard')}
                sendLoading={actionLoading === draft.id + 'send'}
                discardLoading={actionLoading === draft.id + 'discard'}
              />
            ))}
          </div>
        )}
      </SectionCard>

      {/* Sent history */}
      {sentDrafts.length > 0 && (
        <SectionCard className="overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="text-base font-semibold text-slate-950">Enviados recientes</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {sentDrafts.slice(0, 10).map(draft => (
              <div key={draft.id} className="flex items-center gap-3 px-4 py-3">
                <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{draft.subject}</p>
                  <p className="truncate text-xs text-slate-500">{draft.from_name || draft.from_email}</p>
                </div>
                <StatusPill tone={statusTone(draft.status)}>{statusLabel(draft.status)}</StatusPill>
                <span className="text-xs text-slate-400">{timeAgo(draft.created_at)}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Mode explanation */}
      <SectionCard className="p-4">
        <h3 className="text-sm font-semibold text-slate-950">Como funciona el modo de correos</h3>
        <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-3">
            <Clock className="mb-2 h-4 w-4 text-[#6C4DFF]" />
            <p className="font-semibold text-slate-900">1. Correo entra</p>
            <p className="mt-1 text-xs">El bot detecta correos no leidos cuando tocas Procesar o en ciclo automatico.</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <Play className="mb-2 h-4 w-4 text-[#6C4DFF]" />
            <p className="font-semibold text-slate-900">2. IA prepara borrador</p>
            <p className="mt-1 text-xs">Usa tus <Link href="/dashboard/templates" className="font-semibold text-[#6C4DFF] underline">plantillas</Link> si hay match, sino genera con IA.</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <Send className="mb-2 h-4 w-4 text-[#6C4DFF]" />
            <p className="font-semibold text-slate-900">3. Vos aprobas o auto-envio</p>
            <p className="mt-1 text-xs">Sin auto-envio: el borrador queda aqui para que lo revises. Con auto-envio: se despacha directo.</p>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}

function DraftRow({
  draft,
  expanded,
  onToggle,
  onSend,
  onDiscard,
  sendLoading,
  discardLoading,
}: {
  draft: EmailDraft
  expanded: boolean
  onToggle: () => void
  onSend: () => void
  onDiscard: () => void
  sendLoading: boolean
  discardLoading: boolean
}) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#F1EDFF] text-[#6C4DFF]">
          <Mail className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950">{draft.subject}</p>
              <p className="text-xs text-slate-500">{draft.from_name ? `${draft.from_name} · ` : ''}{draft.from_email} · {providerLabel[draft.provider] ?? draft.provider} · {timeAgo(draft.created_at)}</p>
            </div>
            <button onClick={onToggle} className="shrink-0 p-1 text-slate-400 hover:text-slate-700">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>

          {!expanded && (
            <p className="mt-1 truncate text-xs text-slate-500">{draft.original_snippet}</p>
          )}

          {expanded && (
            <div className="mt-3 space-y-3">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">Correo original</p>
                <p className="whitespace-pre-wrap text-xs leading-5 text-slate-600">{draft.original_snippet}</p>
              </div>
              <div className="rounded-xl border border-violet-200 bg-[#F8F5FF] p-3">
                <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">Borrador del bot</p>
                <p className="whitespace-pre-wrap text-sm leading-5 text-slate-800">{draft.draft_body}</p>
              </div>
            </div>
          )}

          <div className="mt-3 flex gap-2">
            <button
              onClick={onSend}
              disabled={sendLoading}
              className="flex items-center gap-1.5 rounded-xl bg-[#6C4DFF] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
            >
              <Send className="h-3.5 w-3.5" />
              {sendLoading ? 'Enviando...' : 'Enviar'}
            </button>
            <button
              onClick={onDiscard}
              disabled={discardLoading}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-60"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {discardLoading ? 'Descartando...' : 'Descartar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
