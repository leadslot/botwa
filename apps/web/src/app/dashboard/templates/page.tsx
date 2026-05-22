'use client'

import { useEffect, useState } from 'react'
import { FileText, Plus, Trash2, Pencil, X, Check, ChevronDown, ChevronUp } from 'lucide-react'

type Template = {
  id: string
  title: string
  body: string
  keywords: string[]
  channel: string
  created_at: string
}

const CHANNELS = [
  { value: 'all', label: 'Todos los canales' },
  { value: 'whatsapp_api', label: 'WhatsApp' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'email', label: 'Email' },
  { value: 'telegram', label: 'Telegram' },
]

function channelLabel(value: string) {
  return CHANNELS.find(c => c.value === value)?.label ?? value
}

function TemplateForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<Template>
  onSave: (data: Omit<Template, 'id' | 'created_at'>) => Promise<void>
  onCancel: () => void
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [body, setBody] = useState(initial?.body ?? '')
  const [channel, setChannel] = useState(initial?.channel ?? 'all')
  const [keywordsRaw, setKeywordsRaw] = useState((initial?.keywords ?? []).join(', '))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !body.trim()) {
      setError('El título y el cuerpo son obligatorios.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const keywords = keywordsRaw.split(',').map(k => k.trim().toLowerCase()).filter(Boolean)
      await onSave({ title, body, keywords, channel })
    } catch {
      setError('Error al guardar. Intentá de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Título de la plantilla</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Ej: Info cabañas, Confirmación reserva..."
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Canal</label>
          <select
            value={channel}
            onChange={e => setChannel(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
          >
            {CHANNELS.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Palabras clave <span className="font-normal text-slate-400">(separadas por coma — el bot las usa para detectar cuándo mandar esta plantilla)</span>
        </label>
        <input
          value={keywordsRaw}
          onChange={e => setKeywordsRaw(e.target.value)}
          placeholder="Ej: reserva, disponibilidad, precio, cabaña..."
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Cuerpo del mensaje <span className="font-normal text-slate-400">(pegá el texto que usás normalmente)</span>
        </label>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={8}
          placeholder="Hola! Gracias por escribirnos. Te paso la info de las cabañas..."
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition"
        >
          <X className="h-4 w-4" /> Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm text-white hover:bg-violet-700 disabled:opacity-50 transition"
        >
          <Check className="h-4 w-4" /> {saving ? 'Guardando...' : 'Guardar plantilla'}
        </button>
      </div>
    </form>
  )
}

function TemplateCard({
  template,
  onEdit,
  onDelete,
}: {
  template: Template
  onEdit: () => void
  onDelete: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 p-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
          <FileText className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-800 truncate">{template.title}</p>
          <div className="flex items-center gap-2 flex-wrap mt-0.5">
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
              {channelLabel(template.channel)}
            </span>
            {template.keywords.slice(0, 4).map(k => (
              <span key={k} className="rounded-full bg-violet-50 px-2 py-0.5 text-xs text-violet-600">{k}</span>
            ))}
            {template.keywords.length > 4 && (
              <span className="text-xs text-slate-400">+{template.keywords.length - 4} más</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setExpanded(v => !v)}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition"
            title="Ver texto"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button
            onClick={onEdit}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition"
            title="Editar"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 transition"
            title="Eliminar"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3">
          <pre className="whitespace-pre-wrap text-sm text-slate-600 font-sans leading-relaxed">{template.body}</pre>
        </div>
      )}
    </div>
  )
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Template | null>(null)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/templates')
    const data = await res.json()
    setTemplates(data.templates ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleCreate(fields: Omit<Template, 'id' | 'created_at'>) {
    await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    })
    setShowForm(false)
    load()
  }

  async function handleUpdate(fields: Omit<Template, 'id' | 'created_at'>) {
    if (!editing) return
    await fetch(`/api/templates/${editing.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    })
    setEditing(null)
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta plantilla?')) return
    await fetch(`/api/templates/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Plantillas</h1>
          <p className="mt-1 text-sm text-slate-500">
            Guardá tus mensajes frecuentes. El bot los usa automáticamente cuando detecta que la consulta encaja.
          </p>
        </div>
        {!showForm && !editing && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 transition"
          >
            <Plus className="h-4 w-4" /> Nueva plantilla
          </button>
        )}
      </div>

      {showForm && (
        <TemplateForm
          onSave={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      )}

      {editing && (
        <TemplateForm
          initial={editing}
          onSave={handleUpdate}
          onCancel={() => setEditing(null)}
        />
      )}

      {loading ? (
        <div className="py-12 text-center text-sm text-slate-400">Cargando...</div>
      ) : templates.length === 0 && !showForm ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-16 text-center">
          <FileText className="mx-auto mb-3 h-8 w-8 text-slate-300" />
          <p className="font-medium text-slate-500">Sin plantillas todavía</p>
          <p className="mt-1 text-sm text-slate-400">
            Creá tu primera plantilla para que el bot la use automáticamente.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 transition mx-auto"
          >
            <Plus className="h-4 w-4" /> Nueva plantilla
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map(t => (
            <TemplateCard
              key={t.id}
              template={t}
              onEdit={() => { setEditing(t); setShowForm(false) }}
              onDelete={() => handleDelete(t.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
