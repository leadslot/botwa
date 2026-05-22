'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  BadgeDollarSign,
  CalendarClock,
  Flame,
  MessageSquare,
  Save,
  Search,
  UsersRound,
} from 'lucide-react'
import { SectionCard, StatusPill } from '@/components/dashboard/ui'

type ConversationContact = {
  id: string
  channel: string
  contact_name: string | null
  contact_handle: string | null
  status: string
  updated_at: string
}

type CrmContact = {
  id: string
  name: string | null
  phone: string | null
  email: string | null
  source_channel: string | null
  stage: string | null
  tags: string[] | null
  notes: string | null
  updated_at: string
}

type UnifiedContact = {
  id: string
  name: string
  handle: string
  channel: string
  stage: string
  intent: string
  score: number
  value: number
  nextAction: string
  tags: string[]
  updatedAt: string
  notes?: string | null
  source: 'crm' | 'conversation'
}

const channelLabels: Record<string, string> = {
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  facebook: 'Facebook',
  instagram: 'Instagram',
  webchat: 'Web Chat',
  email: 'Email',
}

const demoContacts: UnifiedContact[] = [
  {
    id: 'demo-1',
    name: 'Cliente interesado',
    handle: '+54 9 11 5555-0198',
    channel: 'WhatsApp',
    stage: 'Calificado',
    intent: 'Pide precio y disponibilidad',
    score: 86,
    value: 18500,
    nextAction: 'Enviar propuesta',
    tags: ['precio', 'turno'],
    updatedAt: new Date().toISOString(),
    notes: 'Pedir medida, confirmar presupuesto y mandar opciones.',
    source: 'conversation',
  },
  {
    id: 'demo-2',
    name: 'Consulta por Instagram',
    handle: '@cliente_demo',
    channel: 'Instagram',
    stage: 'Seguimiento',
    intent: 'Compara horarios',
    score: 72,
    value: 24000,
    nextAction: 'Recordar hoy',
    tags: ['dm', 'pendiente'],
    updatedAt: new Date(Date.now() - 1000 * 60 * 34).toISOString(),
    notes: 'Quiere comparar horarios. Volver a escribir hoy.',
    source: 'conversation',
  },
  {
    id: 'demo-3',
    name: 'Lead desde web',
    handle: 'webchat visitante',
    channel: 'Web Chat',
    stage: 'Nuevo',
    intent: 'Busca informacion',
    score: 48,
    value: 12000,
    nextAction: 'Pedir contacto',
    tags: ['web', 'info'],
    updatedAt: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
    notes: 'Entro desde la web. Falta pedir telefono o email.',
    source: 'conversation',
  },
]

function normaliseChannel(channel?: string | null) {
  if (!channel) return 'Manual'
  return channelLabels[channel.toLowerCase()] ?? channel
}

function normaliseStage(stage?: string | null) {
  const value = (stage ?? '').toLowerCase()
  if (value.includes('ganada') || value === 'closed') return 'Ganado'
  if (value.includes('seguimiento') || value === 'paused') return 'Seguimiento'
  if (value.includes('calificado')) return 'Calificado'
  return 'Nuevo'
}

function formatRelativeDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Sin fecha'
  const diffMinutes = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000))
  if (diffMinutes < 60) return `${diffMinutes} min`
  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} h`
  return `${Math.round(diffHours / 24)} d`
}

function shortName(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'C'
}

function stageTone(stage: string) {
  if (stage === 'Ganado' || stage === 'Calificado') return 'green' as const
  if (stage === 'Seguimiento') return 'amber' as const
  return 'violet' as const
}

function scoreTone(score: number) {
  if (score >= 75) return 'text-emerald-600 bg-emerald-50'
  if (score >= 50) return 'text-amber-600 bg-amber-50'
  return 'text-slate-500 bg-slate-50'
}

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <div className="mt-1 truncate text-sm font-semibold text-slate-900">{value}</div>
    </div>
  )
}

export default function CRMPage() {
  const [contacts, setContacts] = useState<ConversationContact[]>([])
  const [crmContacts, setCrmContacts] = useState<CrmContact[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  useEffect(() => {
    fetch('/api/crm/contacts')
      .then(r => r.json())
      .then((data: { contacts?: ConversationContact[]; crmContacts?: CrmContact[] }) => {
        setContacts(data.contacts ?? [])
        setCrmContacts(data.crmContacts ?? [])
      })
      .finally(() => setLoading(false))
  }, [])

  const realContacts = useMemo<UnifiedContact[]>(() => {
    const fromCrm = crmContacts.map((contact, index) => {
      const channel = normaliseChannel(contact.source_channel)
      const stage = normaliseStage(contact.stage)
      return {
        id: contact.id,
        name: contact.name || contact.phone || contact.email || 'Contacto CRM',
        handle: contact.phone || contact.email || 'Sin identificador',
        channel,
        stage,
        intent: contact.notes ? 'Tiene nota comercial' : 'Seguimiento manual',
        score: stage === 'Calificado' ? 82 : stage === 'Seguimiento' ? 68 : 45 + (index % 20),
        value: 18500 + index * 2500,
        nextAction: stage === 'Ganado' ? 'Pedir resena' : stage === 'Seguimiento' ? 'Reactivar' : 'Calificar',
        tags: contact.tags ?? [channel],
        updatedAt: contact.updated_at,
        notes: contact.notes,
        source: 'crm' as const,
      }
    })

    const fromConversations = contacts.map((contact, index) => {
      const channel = normaliseChannel(contact.channel)
      const stage = normaliseStage(contact.status)
      return {
        id: contact.id,
        name: contact.contact_name || contact.contact_handle || 'Contacto',
        handle: contact.contact_handle || 'Sin identificador visible',
        channel,
        stage,
        intent: stage === 'Nuevo' ? 'Consulta entrante' : 'Necesita seguimiento',
        score: stage === 'Calificado' ? 80 : stage === 'Seguimiento' ? 62 : 42 + (index % 25),
        value: 18500 + index * 1800,
        nextAction: stage === 'Ganado' ? 'Pedir resena' : stage === 'Seguimiento' ? 'Reactivar' : 'Responder',
        tags: [channel, contact.status || 'activo'].filter(Boolean),
        updatedAt: contact.updated_at,
        notes: null,
        source: 'conversation' as const,
      }
    })

    return [...fromCrm, ...fromConversations]
  }, [contacts, crmContacts])

  const rows = realContacts
  const selectedContact = rows.find(contact => contact.id === selectedId) ?? rows[0]
  const usingDemo = false
  const hotLeads = rows.filter(contact => contact.score >= 70).length
  const totalValue = rows.reduce((sum, contact) => sum + contact.value, 0)
  const channels = new Set(rows.map(contact => contact.channel)).size

  async function saveSelectedContact() {
    if (!selectedContact) return
    setSaving(true)
    setSaveMessage('')

    try {
      const response = await fetch('/api/crm/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: selectedContact.name,
          handle: selectedContact.handle,
          channel: selectedContact.channel,
          stage: selectedContact.stage,
          tags: selectedContact.tags,
          notes: selectedContact.notes || `${selectedContact.intent}. Proxima accion: ${selectedContact.nextAction}.`,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar')
      setSaveMessage('Ficha guardada.')
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'No se pudo guardar.')
    } finally {
      setSaving(false)
    }
  }

  const metrics = [
    { label: 'Contactos', value: rows.length, hint: usingDemo ? 'demo' : 'real', icon: UsersRound },
    { label: 'Calientes', value: hotLeads, hint: 'score 70+', icon: Flame },
    { label: 'Canales', value: channels, hint: 'origen', icon: MessageSquare },
    { label: 'Tareas', value: Math.max(3, Math.ceil(rows.length * 0.45)), hint: 'pendientes', icon: CalendarClock },
    { label: 'Pipeline', value: `$${totalValue.toLocaleString('es-AR')}`, hint: 'estimado', icon: BadgeDollarSign },
  ]

  return (
    <div className="space-y-3 text-slate-800">
      <div className="flex flex-col justify-between gap-3 xl:flex-row xl:items-start">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">CRM</h1>
            <span className="rounded-full border border-violet-200 bg-[#F1EDFF] px-3 py-1 text-xs font-semibold text-[#6C4DFF]">
              Premium
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Leads, intencion, score, proxima accion y seguimiento comercial en una vista operativa.
          </p>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-5">
        {metrics.map(({ label, value, hint, icon: Icon }) => (
          <SectionCard key={label} className="flex items-center gap-3 p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F1EDFF] text-[#6C4DFF]">
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
              <p className="truncate text-xl font-semibold text-slate-950">{value}</p>
              <p className="text-[11px] text-slate-400">{hint}</p>
            </div>
          </SectionCard>
        ))}
      </div>

      <div className="grid min-h-[520px] gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
        <SectionCard className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div>
              <h2 className="text-base font-semibold text-slate-950">Leads y oportunidades</h2>
              <p className="text-xs text-slate-500">Tabla compacta. Hace click en un lead para ver la ficha rapida.</p>
            </div>
            <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 md:flex">
              <Search className="h-4 w-4" />
              Buscar por nombre, canal o intencion
            </div>
          </div>

          <div className="max-h-[470px] overflow-auto">
            <table className="w-full table-fixed border-collapse text-sm">
              <colgroup>
                <col className="w-[30%]" />
                <col className="w-[13%]" />
                <col className="w-[21%]" />
                <col className="w-[9%]" />
                <col className="w-[13%]" />
                <col className="w-[14%]" />
              </colgroup>
              <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400">
                <tr className="border-b border-slate-100">
                  <th className="px-4 py-3 text-left font-semibold">Lead</th>
                  <th className="px-3 py-3 text-left font-semibold">Canal</th>
                  <th className="px-3 py-3 text-left font-semibold">Intencion</th>
                  <th className="px-3 py-3 text-left font-semibold">Score</th>
                  <th className="px-3 py-3 text-left font-semibold">Estado</th>
                  <th className="px-3 py-3 text-left font-semibold">Proxima accion</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-500">Cargando contactos...</td>
                  </tr>
                ) : rows.map(contact => (
                  <tr
                    key={contact.id}
                    onClick={() => setSelectedId(contact.id)}
                    className={`cursor-pointer border-b border-slate-100 transition hover:bg-[#F8F5FF] ${
                      selectedContact?.id === contact.id ? 'bg-[#F8F5FF]' : 'bg-white'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F1EDFF] text-xs font-semibold text-[#6C4DFF]">
                          {shortName(contact.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-950">{contact.name}</p>
                          <p className="truncate text-xs text-slate-500">{contact.handle}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">{contact.channel}</span>
                    </td>
                    <td className="truncate px-3 py-3 text-slate-600">{contact.intent}</td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${scoreTone(contact.score)}`}>{contact.score}</span>
                    </td>
                    <td className="px-3 py-3">
                      <StatusPill tone={stageTone(contact.stage)}>{contact.stage}</StatusPill>
                    </td>
                    <td className="truncate px-3 py-3 text-slate-600">{contact.nextAction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard className="overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="text-base font-semibold text-slate-950">Ficha rapida</h2>
            <p className="text-xs text-slate-500">Se actualiza al seleccionar un lead.</p>
          </div>
          {selectedContact && (
            <div className="space-y-3 p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#6C4DFF] to-[#A855F7] text-xs font-semibold text-white">
                  {shortName(selectedContact.name)}
                </span>
                <div className="min-w-0">
                  <p className="break-words text-base font-semibold leading-5 text-slate-950">{selectedContact.name}</p>
                  <p className="break-words text-xs text-slate-500">{selectedContact.handle}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <DetailItem label="Canal" value={selectedContact.channel} />
                <DetailItem label="Score" value={`${selectedContact.score}/100`} />
                <DetailItem label="Valor" value={`$${selectedContact.value.toLocaleString('es-AR')}`} />
                <DetailItem label="Actividad" value={formatRelativeDate(selectedContact.updatedAt)} />
              </div>

              <div className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-xl border border-slate-100 p-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-400">Estado</p>
                  <p className="truncate text-sm font-semibold text-slate-900">{selectedContact.stage}</p>
                </div>
                <StatusPill tone={stageTone(selectedContact.stage)}>{selectedContact.stage}</StatusPill>
              </div>

              <div className="rounded-xl border border-slate-100 p-3">
                <p className="text-xs font-medium text-slate-400">Intencion</p>
                <p className="mt-1 text-sm leading-5 text-slate-700">{selectedContact.intent}</p>
              </div>
              <div className="rounded-xl border border-slate-100 p-3">
                <p className="text-xs font-medium text-slate-400">Proxima accion</p>
                <p className="mt-1 text-sm font-semibold leading-5 text-slate-900">{selectedContact.nextAction}</p>
              </div>
              <details className="rounded-xl border border-slate-100 p-3">
                <summary className="cursor-pointer list-none text-xs font-medium text-slate-400">Notas y contexto</summary>
                <p className="mt-2 text-sm leading-5 text-slate-600">
                  {selectedContact.notes || 'Sin notas. Aca va resumen, objeciones, preferencias y ultimo acuerdo.'}
                </p>
              </details>

              <button
                onClick={saveSelectedContact}
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#6C4DFF] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Guardando...' : 'Guardar ficha'}
              </button>
              {saveMessage && <p className="text-center text-xs text-slate-500">{saveMessage}</p>}
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-950">Proximas capas del CRM</h3>
          <p className="text-sm text-slate-500">Radar de intencion, agenda, reactivacion y resenas quedan como modulos premium a activar despues.</p>
        </div>
        <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">Pendiente de definir flujo</span>
      </SectionCard>
    </div>
  )
}
