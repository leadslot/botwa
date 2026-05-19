'use client'
import { useState, useEffect } from 'react'
import { Save, Loader2, ToggleLeft, ToggleRight, Wand2, ChevronDown, ChevronUp, Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useDashboard } from '../DashboardContext'
import SetupWizard, { parseWizardDataFromPrompt } from './SetupWizard'

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
  const [sectionsExpanded, setSectionsExpanded] = useState(false)
  const [name, setName] = useState('')
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiEnabled, setAiEnabled] = useState(true)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!loading && business && !ready) {
      setName(business.name ?? '')
      setAiPrompt(business.ai_prompt ?? '')
      setAiEnabled(business.ai_enabled ?? true)
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
    await supabase.from('businesses').update({ name, ai_prompt: aiPrompt, ai_enabled: aiEnabled }).eq('id', business.id)
    setSaving(false)
    setSaved(true)
    reload()
    setTimeout(() => setSaved(false), 2000)
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
            <p className="font-semibold text-indigo-900">Configurar con asistente</p>
            <p className="text-sm text-indigo-600 mt-0.5">Respondé las preguntas y generamos el prompt automáticamente</p>
          </div>
          <button
            onClick={() => setWizardOpen(true)}
            className="btn-primary flex items-center gap-2 whitespace-nowrap"
          >
            <Wand2 className="w-4 h-4" /> Iniciar wizard
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

      <button onClick={save} disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {saved ? '¡Guardado!' : saving ? 'Guardando...' : 'Guardar cambios'}
      </button>
    </div>
  )
}
