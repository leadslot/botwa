'use client'
import { useState, useEffect, useRef } from 'react'
import { Save, Loader2, ToggleLeft, ToggleRight, Wand2, ChevronDown, ChevronUp, Pencil, Plus, Trash2, Upload, UserX } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useDashboard } from '../DashboardContext'
import SetupWizard, { parseWizardDataFromPrompt } from './SetupWizard'

type PriceRow = { name: string; price: string }

// ─── Section editor types ─────────────────────────────────────────────────────

type SectionKey = 'identidad' | 'info' | 'servicios' | 'reglas' | 'faqs' | 'estilo'

const SECTIONS: { key: SectionKey; label: string; desc: string }[] = [
  { key: 'identidad', label: 'Identidad y perfil',    desc: 'Nombre, responsable, tono, perfil del bot' },
  { key: 'info',      label: 'Info básica',            desc: 'Dirección, horario, pagos, link' },
  { key: 'servicios', label: 'Servicios',              desc: 'Servicios y precios del rubro' },
  { key: 'reglas',    label: 'Reglas y derivación',   desc: 'Límites del bot y a dónde deriva' },
  { key: 'faqs',      label: 'Preguntas frecuentes',  desc: 'Pares pregunta → respuesta' },
  { key: 'estilo',    label: 'Estilo de respuesta',   desc: 'Largo de las respuestas' },
]

// ─── Mini section modal ───────────────────────────────────────────────────────

interface SectionModalProps {
  section: SectionKey
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  wizardData: Record<string, any>
  businessId: string
  onClose: () => void
  onSaved: (prompt: string) => void
}

function SectionModal({ section, wizardData, businessId, onClose, onSaved }: SectionModalProps) {
  // We'll open the full wizard pre-populated and jump to the right step
  const stepMap: Record<SectionKey, number> = {
    identidad: 3,
    info: 4,
    servicios: 5,
    reglas: 6,
    faqs: 7,
    estilo: 8,
  }
  return (
    <SetupWizard
      businessId={businessId}
      onClose={onClose}
      onSaved={onSaved}
      initialData={wizardData as Parameters<typeof SetupWizard>[0]['initialData']}
      initialStep={stepMap[section]}
    />
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SettingsForm() {
  const { business, loading, reload } = useDashboard()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [editSection, setEditSection] = useState<SectionKey | null>(null)
  const [sectionsExpanded, setSectionsExpanded] = useState(true)
  const [name, setName] = useState('')
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiEnabled, setAiEnabled] = useState(true)
  const [priceList, setPriceList] = useState<PriceRow[]>([])
  const [excludedNumbers, setExcludedNumbers] = useState<string[]>([])
  const [newNumber, setNewNumber] = useState('')
  const csvRef = useRef<HTMLInputElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!loading && business && !ready) {
      setName(business.name ?? '')
      setAiPrompt(business.ai_prompt ?? '')
      setAiEnabled(business.ai_enabled ?? true)
      setPriceList(business.price_list ?? [])
      setExcludedNumbers(business.excluded_numbers ?? [])
      setReady(true)
    }
  }, [loading, business, ready])

  if (!ready) return (
    <div className="space-y-4">
      <div className="animate-pulse space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 h-20" />
        <div className="bg-white rounded-2xl border border-gray-100 h-20" />
        <div className="bg-white rounded-2xl border border-gray-100 h-64" />
        <div className="bg-indigo-200 rounded-2xl h-12 opacity-40" />
      </div>
    </div>
  )

  const save = async () => {
    if (!business) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('businesses').update({
      name,
      ai_prompt: aiPrompt,
      ai_enabled: aiEnabled,
      price_list: priceList.filter(r => r.name.trim()),
      excluded_numbers: excludedNumbers.filter(Boolean),
    }).eq('id', business.id)
    setSaving(false)
    setSaved(true)
    reload()
    setTimeout(() => setSaved(false), 2000)
  }

  // ── Price list helpers ───────────────────────────────────────────────────────
  const addPriceRow = () => setPriceList(p => [...p, { name: '', price: '' }])
  const updatePriceRow = (i: number, field: 'name' | 'price', val: string) =>
    setPriceList(p => p.map((r, idx) => idx === i ? { ...r, [field]: val } : r))
  const removePriceRow = (i: number) => setPriceList(p => p.filter((_, idx) => idx !== i))

  const handleCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      const rows = text.split('\n').slice(1).map(line => {
        const parts = line.split(/[,;	]/)
        return { name: (parts[0] ?? '').replace(/"/g, '').trim(), price: (parts[1] ?? '').replace(/"/g, '').trim() }
      }).filter(r => r.name)
      setPriceList(prev => [...prev, ...rows])
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  // ── Excluded numbers helpers ─────────────────────────────────────────────────
  const addExcluded = () => {
    const n = newNumber.replace(/\D/g, '')
    if (n && !excludedNumbers.includes(n)) {
      setExcludedNumbers(p => [...p, n])
      setNewNumber('')
    }
  }

  const hasWizardData = aiPrompt.includes('<!-- WIZARD_DATA:')
  const parsedWizardData = hasWizardData ? parseWizardDataFromPrompt(aiPrompt) : null

  const handleWizardSaved = (prompt: string) => {
    setAiPrompt(prompt)
    reload()
  }

  return (
    <div className="space-y-6">
      {wizardOpen && business && (
        <SetupWizard
          businessId={business.id}
          onClose={() => setWizardOpen(false)}
          onSaved={handleWizardSaved}
          initialData={parsedWizardData ?? undefined}
          initialStep={parsedWizardData ? 1 : 1}
        />
      )}

      {editSection && business && parsedWizardData && (
        <SectionModal
          section={editSection}
          wizardData={parsedWizardData}
          businessId={business.id}
          onClose={() => setEditSection(null)}
          onSaved={(prompt) => { setAiPrompt(prompt); setEditSection(null); reload() }}
        />
      )}

      <div className="card bg-indigo-50 border-indigo-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-indigo-900">
              {hasWizardData ? 'Editar configuración completa' : 'Configurar con asistente'}
            </p>
            <p className="text-sm text-indigo-600 mt-0.5">
              {hasWizardData
                ? 'Abrí el wizard con todos tus datos ya cargados para modificar lo que quieras'
                : 'Respondé las preguntas y generamos el prompt automáticamente'}
            </p>
          </div>
          <button
            onClick={() => setWizardOpen(true)}
            className="btn-primary flex items-center gap-2 whitespace-nowrap"
          >
            <Wand2 className="w-4 h-4" /> {hasWizardData ? 'Editar' : 'Iniciar wizard'}
          </button>
        </div>
      </div>

      {/* Section editor — only shown when wizard data exists */}
      {hasWizardData && parsedWizardData && business && (
        <div className="card border-gray-100">
          <button
            type="button"
            onClick={() => setSectionsExpanded(v => !v)}
            className="w-full flex items-center justify-between text-left"
          >
            <div>
              <p className="font-semibold text-gray-900">Editar sección</p>
              <p className="text-sm text-gray-500">Modificá una parte sin rehacer el wizard completo</p>
            </div>
            {sectionsExpanded
              ? <ChevronUp className="w-5 h-5 text-gray-400 shrink-0" />
              : <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />}
          </button>

          {sectionsExpanded && (
            <div className="mt-4 space-y-2 border-t border-gray-100 pt-4">
              {SECTIONS.map(s => (
                <div key={s.key} className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{s.label}</p>
                    <p className="text-xs text-gray-500">{s.desc}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditSection(s.key)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-all"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Editar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="card flex items-center justify-between">
        <div>
          <p className="font-semibold text-gray-900">Bot activo</p>
          <p className="text-sm text-gray-500">Si lo desactivás, los mensajes llegan pero el bot no responde</p>
        </div>
        <button onClick={() => setAiEnabled(!aiEnabled)}>
          {aiEnabled ? <ToggleRight className="w-10 h-10 text-indigo-500" /> : <ToggleLeft className="w-10 h-10 text-gray-300" />}
        </button>
      </div>

      <div className="card">
        <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre del negocio</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
      </div>

      {!hasWizardData && (
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-gray-700">Prompt del asistente</label>
            <span className="text-xs text-gray-400">Define cómo habla el bot</span>
          </div>
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 mb-3">
            <p className="text-xs text-indigo-600">💡 Incluí: nombre del negocio, qué hace, preguntas frecuentes, horarios, precios</p>
          </div>
          <textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
            rows={12} placeholder="Ej: Sos el asistente de Centro Vital. Atendemos de lunes a viernes de 9 a 18hs..."
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none font-mono" />
        </div>
      )}

      {/* ── Lista de precios ──────────────────────────────────────────────────── */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-semibold text-gray-900">Lista de precios</p>
            <p className="text-sm text-gray-500">El bot va a usar estos precios exactos. Sin lista, no da precios.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => csvRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all">
              <Upload className="w-3.5 h-3.5" /> CSV
            </button>
            <input ref={csvRef} type="file" accept=".csv,.tsv,.txt" className="hidden" onChange={handleCSV} />
            <button type="button" onClick={addPriceRow}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition-all">
              <Plus className="w-3.5 h-3.5" /> Agregar
            </button>
          </div>
        </div>

        {priceList.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6 border border-dashed border-gray-200 rounded-xl">
            Sin precios cargados. El bot pedirá consulta para cualquier precio.
          </p>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2 px-1">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Producto / Servicio</span>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Precio</span>
              <span />
            </div>
            {priceList.map((row, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                <input
                  value={row.name}
                  onChange={e => updatePriceRow(i, 'name', e.target.value)}
                  placeholder="Ej: Tatuaje pequeño"
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
                <input
                  value={row.price}
                  onChange={e => updatePriceRow(i, 'price', e.target.value)}
                  placeholder="Ej: $15.000"
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
                <button type="button" onClick={() => removePriceRow(i)}
                  className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-gray-400 mt-3">Formato CSV: columna 1 = nombre, columna 2 = precio. Podés exportar desde Excel como CSV.</p>
      </div>

      {/* ── Contactos excluidos ───────────────────────────────────────────────── */}
      <div className="card">
        <div className="flex items-center gap-2 mb-1">
          <UserX className="w-4 h-4 text-gray-500" />
          <p className="font-semibold text-gray-900">Contactos excluidos</p>
        </div>
        <p className="text-sm text-gray-500 mb-4">El bot no responde a estos números. Ideal para familiares, amigos o tu propio número.</p>

        <div className="flex gap-2 mb-3">
          <input
            value={newNumber}
            onChange={e => setNewNumber(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addExcluded()}
            placeholder="Ej: 5491123456789 (sin + ni espacios)"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
          <button type="button" onClick={addExcluded}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-indigo-200 bg-indigo-50 text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition-all">
            <Plus className="w-3.5 h-3.5" /> Agregar
          </button>
        </div>

        {excludedNumbers.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-xl">Sin números excluidos</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {excludedNumbers.map(n => (
              <div key={n} className="flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1.5 text-sm text-gray-700">
                <span>+{n}</span>
                <button type="button" onClick={() => setExcludedNumbers(p => p.filter(x => x !== n))}
                  className="text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button onClick={save} disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {saved ? '¡Guardado!' : saving ? 'Guardando...' : 'Guardar cambios'}
      </button>
    </div>
  )
}
