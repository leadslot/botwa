'use client'
import { useState, useEffect, useRef } from 'react'
import { Save, Loader2, ToggleLeft, ToggleRight, Wand2, ChevronDown, ChevronUp, Plus, Trash2, Upload, UserX, Download } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useDashboard } from '../DashboardContext'
import dynamic from 'next/dynamic'
import { parseWizardDataFromPrompt } from './SetupWizard'
const SetupWizard = dynamic(() => import('./SetupWizard'), { ssr: false })

type PriceRow = { name: string; price: string }

export default function SettingsForm() {
  const { business, loading, reload } = useDashboard()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [promptExpanded, setPromptExpanded] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [name, setName] = useState('')
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiEnabled, setAiEnabled] = useState(true)
  const [responseDelay, setResponseDelay] = useState(0)
  const [contextMessages, setContextMessages] = useState(10)
  const [priceList, setPriceList] = useState<PriceRow[]>([])
  const [excludedNumbers, setExcludedNumbers] = useState<string[]>([])
  const [newNumber, setNewNumber] = useState('')
  const [waContacts, setWaContacts] = useState<{number:string;name:string}[]>([])
  const [contactsLoaded, setContactsLoaded] = useState(false)
  const [contactSearch, setContactSearch] = useState('')
  const csvRef = useRef<HTMLInputElement>(null)
  const contactsCsvRef = useRef<HTMLInputElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!loading && business && !ready) {
      setName(business.name ?? '')
      setAiPrompt(business.ai_prompt ?? '')
      setAiEnabled(business.ai_enabled ?? true)
      setResponseDelay(business.response_delay_seconds ?? 0)
      setContextMessages(business.context_messages ?? 10)
      setPriceList(business.price_list ?? [])
      setExcludedNumbers(business.excluded_numbers ?? [])
      setReady(true)
    }
  }, [loading, business, ready])

  // ── Cargar contactos existentes — DEBE estar antes del early return (Rules of Hooks)
  useEffect(() => {
    if (!ready) return
    fetch('/api/contacts').then(r => r.json()).then(({ contacts }) => {
      if (contacts?.length > 0) {
        setWaContacts(contacts.map((c: { name: string; phone: string }) => ({ number: c.phone, name: c.name })))
        setContactsLoaded(true)
      }
    }).catch(() => {})
  }, [ready])

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
    setSaveError('')
    try {
      const supabase = createClient()
      const { error } = await supabase.from('businesses').update({
        name,
        ai_prompt: aiPrompt,
        ai_enabled: aiEnabled,
        response_delay_seconds: responseDelay,
        context_messages: contextMessages,
        price_list: priceList.filter(r => r.name.trim()),
        excluded_numbers: excludedNumbers.filter(Boolean),
      }).eq('id', business.id)
      if (error) {
        setSaveError('Error al guardar: ' + error.message)
      } else {
        setSaved(true)
        reload()
        setTimeout(() => setSaved(false), 3000)
      }
    } catch (e: unknown) {
      setSaveError('Error de conexión. Intentá de nuevo.')
      console.error('save error:', e)
    } finally {
      setSaving(false)
    }
  }

  // ── Price list helpers
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

  // ── Excluded numbers helpers
  const addExcluded = () => {
    const n = newNumber.replace(/\D/g, '')
    if (n && !excludedNumbers.includes(n)) {
      setExcludedNumbers(p => [...p, n])
      setNewNumber('')
    }
  }

  const toggleExcluded = (number: string) => {
    setExcludedNumbers(p =>
      p.includes(number) ? p.filter(x => x !== number) : [...p, number]
    )
  }

  const handleContactsCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async ev => {
      const text = ev.target?.result as string
      const rows = text.split('\n').map(line => {
        const parts = line.split(/[,;	]/)
        const name = (parts[0] ?? '').replace(/"/g, '').trim()
        const raw = (parts[1] ?? parts[0] ?? '').replace(/"/g, '').trim()
        const phone = raw.replace(/\D/g, '')
        return { name, phone }
      }).filter(r => r.phone.length >= 8)
      if (rows.length === 0) return
      // Guardar en Supabase y disparar resolución de LIDs
      await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts: rows }),
      })
      setWaContacts(rows.map(r => ({ number: r.phone, name: r.name })))
      setContactsLoaded(true)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const downloadPromptTemplate = () => {
    const template = `PLANTILLA BASE — RESPONBOT
Arquitectura: Universal + Módulo de categoría + Datos de tu negocio

──────────────────────────────────────────────
PARTE 1 — IDENTIDAD (completar con tus datos)
──────────────────────────────────────────────
Sos [NOMBRE O ROL] de [NOMBRE DEL NEGOCIO] ([RUBRO]).
Respondé por WhatsApp de forma [TONO — ej: amigable y rioplatense / formal / cercano].

──────────────────────────────────────────────
PARTE 2 — REGLAS UNIVERSALES (no cambiar)
──────────────────────────────────────────────
No decir que sos un bot ni una IA.
No repetir el saludo si la conversación ya empezó.
Responder solo al último mensaje usando el contexto anterior.
Hacer una sola pregunta por mensaje.
No inventar precios, turnos, diagnósticos ni disponibilidad.
No prometer nada que no esté en la información del negocio.
No enviar textos largos salvo que el cliente lo pida.
Si el cliente dice "ok", "gracias", "dale" → no responder o responder con máximo 3 palabras.
Si el cliente está enojado → responder con empatía y derivar a un humano.
Derivación: "Perfecto, te dejo la consulta encaminada y ahora lo revisa una persona para responderte bien."
Apertura para saludos cortos: "Hola, ¿cómo estás? Te habla [nombre] de [negocio]. ¿En qué te puedo ayudar?"

──────────────────────────────────────────────
PARTE 3 — MÓDULO DE CATEGORÍA (elegir el tuyo)
──────────────────────────────────────────────
Categorías disponibles:
  A) Belleza y estética (peluquería, estética, manicura, masajes, maquilladora, depilación)
  B) Salud y bienestar (médico, psicólogo, nutricionista, kinesiólogo, enfermería)
  C) Construcción y hogar (plomero, electricista, limpieza, técnico, pintor, carpintero)
  D) Tecnología y diseño (técnico celulares, diseñador, fotógrafo, videógrafo)
  E) Educación y entretenimiento (profesor, academia, DJ, eventos, animación)
  F) Comercio y servicios (tienda, e-commerce, restaurante, mecánico, gimnasio)
  G) Finanzas e inmuebles (abogado, contador, seguros, inmobiliaria)
  H) Veterinaria

[PEGAR AQUÍ EL MÓDULO DE TU CATEGORÍA — ver app para descargar módulo específico]

──────────────────────────────────────────────
PARTE 4 — DATOS DEL NEGOCIO (completar)
──────────────────────────────────────────────
DATOS DEL NEGOCIO
- Ubicación: [DIRECCIÓN O ZONA]
- Horario: [DÍAS Y HORARIOS DE ATENCIÓN]
- Pagos: [FORMAS DE PAGO QUE ACEPTÁS]
- Web/Catálogo: [LINK SI TENÉS]

SERVICIOS Y PRECIOS
[Listar servicios y precios. Si dependen de evaluación, aclararlo.]

PREGUNTAS FRECUENTES
- "[Pregunta 1]": [Respuesta 1]
- "[Pregunta 2]": [Respuesta 2]

REGLAS ESPECÍFICAS DEL NEGOCIO
- No resolver: [cosas que el bot no debe hacer]
- Cuándo derivar: [situaciones que requieren una persona]
- Info adicional: [cualquier dato importante]

ESTILO DE RESPUESTA
Respondé siempre en 2-3 oraciones máximo.

──────────────────────────────────────────────
TIP: Usá el wizard en la app para que se genere automáticamente con tu módulo y datos.
──────────────────────────────────────────────`

    const blob = new Blob([template], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'prompt-base-responbot.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  const hasWizardData = aiPrompt.includes('<!-- WIZARD_DATA:')
  const parsedWizardData = hasWizardData ? parseWizardDataFromPrompt(aiPrompt) : null

  const handleWizardSaved = (prompt: string) => {
    setAiPrompt(prompt)
    reload()
  }

  return (
    <div className="space-y-3 pb-20">
      {wizardOpen && business && (
        <SetupWizard
          businessId={business.id}
          onClose={() => setWizardOpen(false)}
          onSaved={handleWizardSaved}
          initialData={parsedWizardData ?? undefined}
          initialStep={parsedWizardData ? 1 : 1}
        />
      )}

      {/* Wizard card */}
      <div className="rounded-2xl border border-violet-100 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-indigo-900">
              {hasWizardData ? 'Editar configuración' : 'Configurar con asistente'}
            </p>
            <p className="mt-0.5 text-sm text-[#6C4DFF]">
              {hasWizardData
                ? 'Tu configuración actual fue generada con el asistente. Hacé clic para editarla.'
                : 'Respondé las preguntas y generamos el prompt automáticamente'}
            </p>
          </div>
          <button
            onClick={() => setWizardOpen(true)}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-gradient-to-r from-[#6C4DFF] to-[#A855F7] px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-violet-200"
          >
            <Wand2 className="w-4 h-4" /> {hasWizardData ? 'Editar' : 'Iniciar wizard'}
          </button>
        </div>
      </div>

      {/* Bot activo */}
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
        <div>
          <p className="font-semibold text-gray-900">Bot activo</p>
          <p className="text-sm text-gray-500">Si lo desactivás, los mensajes llegan pero el bot no responde</p>
        </div>
        <button onClick={() => setAiEnabled(!aiEnabled)}>
          {aiEnabled ? <ToggleRight className="w-10 h-10 text-[#6C4DFF]" /> : <ToggleLeft className="w-10 h-10 text-gray-300" />}
        </button>
      </div>

      {/* Delay de respuesta */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="font-semibold text-gray-900">Demora antes de responder</p>
            <p className="text-sm text-gray-500">El bot espera este tiempo antes de enviar la respuesta.</p>
          </div>
          <span className="ml-4 shrink-0 text-xl font-black text-[#6C4DFF]">
            {responseDelay === 0 ? 'Inmediato' : `${responseDelay}s`}
          </span>
        </div>
        <input
          type="range" min={0} max={60} step={1}
          value={responseDelay}
          onChange={e => setResponseDelay(Number(e.target.value))}
          className="mt-2 w-full accent-[#6C4DFF]"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>Inmediato</span>
          <span>15s</span>
          <span>30s</span>
          <span>45s</span>
          <span>1 min</span>
        </div>
      </div>

      {/* Memoria de conversación */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="font-semibold text-gray-900">Memoria de conversación</p>
            <p className="text-sm text-gray-500">Cuántos mensajes previos recuerda el bot al responder. Más memoria = más contexto, mayor costo por mensaje.</p>
          </div>
          <span className="ml-4 shrink-0 text-xl font-black text-[#6C4DFF]">
            {contextMessages === 0 ? 'Sin memoria' : contextMessages === 100 ? 'Ilimitada' : `${contextMessages} msgs`}
          </span>
        </div>
        <input
          type="range" min={0} max={100} step={5}
          value={contextMessages}
          onChange={e => setContextMessages(Number(e.target.value))}
          className="mt-2 w-full accent-[#6C4DFF]"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>Sin memoria</span>
          <span>10</span>
          <span>25</span>
          <span>50</span>
          <span>Ilimitada</span>
        </div>
      </div>

      {/* Nombre del negocio */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
        <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre del negocio</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#6C4DFF] transition-all" />
      </div>

      {/* Prompt del asistente */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
        <button type="button" onClick={() => setPromptExpanded(v => !v)}
          className="w-full flex items-center justify-between text-left">
          <p className="font-semibold text-gray-900">Prompt del asistente</p>
          {promptExpanded
            ? <ChevronUp className="w-5 h-5 text-gray-400 shrink-0" />
            : <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />}
        </button>
        {!promptExpanded && aiPrompt && (
          <p className="mt-2 text-xs text-gray-400 truncate font-mono">{aiPrompt.slice(0, 100)}…</p>
        )}
        {promptExpanded && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-sm">
              <p className="font-semibold text-amber-900 mb-2">¿No sabés qué escribir?</p>
              <p className="text-amber-700 text-xs mb-3">Copiá este mensaje, pegalo en ChatGPT o en tu IA favorita, completá los datos y pegá el resultado acá:</p>
              <div className="bg-white border border-amber-200 rounded-lg p-3 text-xs text-gray-700 font-mono whitespace-pre-wrap mb-3">{`Necesito que me escribas un prompt para un bot de WhatsApp de mi negocio. Incluí esta info:

- Nombre del negocio y rubro
- Horario de atención
- Servicios o productos que ofrezco (con precios si los tenés)
- Cómo querés que suene el bot (formal, amigable, rioplatense, etc.)
- Qué preguntas frecuentes suele recibir
- Qué NO debe hacer el bot (ej: no dar presupuestos exactos, no dar turnos)

El prompt debe ser en primera persona, como si el bot fuera un empleado de mi negocio.`}</div>
              <button
                type="button"
                onClick={() => {
                  const txt = `Necesito que me escribas un prompt para un bot de WhatsApp de mi negocio. Incluí esta info:\n\n- Nombre del negocio y rubro\n- Horario de atención\n- Servicios o productos que ofrezco (con precios si los tenés)\n- Cómo querés que suene el bot (formal, amigable, rioplatense, etc.)\n- Qué preguntas frecuentes suele recibir\n- Qué NO debe hacer el bot (ej: no dar presupuestos exactos, no dar turnos)\n\nEl prompt debe ser en primera persona, como si el bot fuera un empleado de mi negocio.`
                  navigator.clipboard.writeText(txt)
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100 border border-amber-300 text-xs font-semibold text-amber-800 hover:bg-amber-200 transition-all"
              >
                <Download className="w-3 h-3" /> Copiar instrucciones para IA
              </button>
            </div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-400">O editá el prompt directamente.</p>
              <button type="button" onClick={downloadPromptTemplate}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-all">
                <Download className="w-3 h-3" /> Descargar plantilla
              </button>
            </div>
            <textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
              rows={14} placeholder="Ej: Sos el asistente de Centro Vital. Atendemos de lunes a viernes de 9 a 18hs..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#6C4DFF] transition-all resize-none font-mono" />
          </div>
        )}
      </div>

      {/* Lista de precios */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-semibold text-gray-900">Lista de precios</p>
            <p className="text-sm text-gray-500">El bot usará estos precios exactos al responder consultas.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => csvRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all">
              <Upload className="w-3.5 h-3.5" /> CSV
            </button>
            <input ref={csvRef} type="file" accept=".csv,.tsv,.txt" className="hidden" onChange={handleCSV} />
            <button type="button" onClick={addPriceRow}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-violet-200 bg-[#F1EDFF] text-sm font-medium text-[#6C4DFF] hover:bg-[#F1EDFF] transition-all">
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
                  placeholder="Ej: Consulta inicial"
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6C4DFF] transition-all"
                />
                <input
                  value={row.price}
                  onChange={e => updatePriceRow(i, 'price', e.target.value)}
                  placeholder="Ej: $15.000"
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6C4DFF] transition-all"
                />
                <button type="button" onClick={() => removePriceRow(i)}
                  className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        {priceList.length === 0 && (
          <p className="text-xs text-gray-400 mt-3">Podés importar directo desde Excel: Archivo → Guardar como → CSV.</p>
        )}
      </div>

      {/* Contactos excluidos */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <UserX className="w-4 h-4 text-gray-500" />
            <p className="font-semibold text-gray-900">Contactos excluidos</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => contactsCsvRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-violet-200 bg-[#F1EDFF] text-sm font-medium text-[#6C4DFF] hover:bg-[#F1EDFF] transition-all">
              <Upload className="w-3.5 h-3.5" /> Subir lista CSV
            </button>
            <input ref={contactsCsvRef} type="file" accept=".csv,.tsv,.txt" className="hidden" onChange={handleContactsCSV} />
          </div>
        </div>
        <p className="text-sm text-gray-500 mb-2">El bot ignora completamente estos números.</p>
        <p className="text-xs text-gray-400 mb-4">CSV: columna A = nombre, columna B = número. O subí solo números sin encabezado.</p>

        {contactsLoaded && (
          <div className="border border-gray-200 rounded-xl mb-4 overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
              <input
                value={contactSearch}
                onChange={e => setContactSearch(e.target.value)}
                placeholder="Buscar contacto..."
                className="w-full bg-transparent text-sm focus:outline-none"
              />
            </div>
            <div className="max-h-60 overflow-y-auto divide-y divide-gray-50">
              {waContacts.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">El CSV no tiene contactos válidos.</p>
              ) : (
                waContacts
                  .filter(c => !contactSearch ||
                    (c.name && c.name.toLowerCase().includes(contactSearch.toLowerCase())) ||
                    c.number.includes(contactSearch))
                  .map(c => {
                    const excluded = excludedNumbers.includes(c.number)
                    return (
                      <label key={c.number} className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors ${excluded ? 'bg-red-50' : ''}`}>
                        <input type="checkbox" checked={excluded} onChange={() => toggleExcluded(c.number)}
                          className="rounded border-gray-300 text-[#6C4DFF] focus:ring-[#6C4DFF]" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{c.name || `+${c.number}`}</p>
                          {c.name && <p className="text-xs text-gray-400">+{c.number}</p>}
                        </div>
                        {excluded && <span className="text-xs text-red-500 font-medium shrink-0">Excluido</span>}
                      </label>
                    )
                  })
              )}
            </div>
          </div>
        )}

        <div className="flex gap-2 mb-3">
          <input
            value={newNumber}
            onChange={e => setNewNumber(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addExcluded()}
            placeholder="O agregá un número: 5491123456789"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6C4DFF] transition-all"
          />
          <button type="button" onClick={addExcluded}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all">
            <Plus className="w-3.5 h-3.5" /> Agregar
          </button>
        </div>

        {excludedNumbers.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-xl">Sin números excluidos</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {excludedNumbers.map(n => {
              const contact = waContacts.find(c => c.number === n)
              return (
                <div key={n} className="flex items-center gap-1.5 bg-red-50 border border-red-100 rounded-full px-3 py-1.5 text-sm text-red-700">
                  <span>{contact?.name || `+${n}`}</span>
                  <button type="button" onClick={() => setExcludedNumbers(p => p.filter(x => x !== n))}
                    className="text-red-400 hover:text-red-600 transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {saveError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {saveError}
        </div>
      )}

      <button onClick={save} disabled={saving} className={`sticky bottom-3 z-10 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#6C4DFF] to-[#A855F7] px-5 py-3 text-sm font-black text-white shadow-2xl shadow-violet-200 ${saved ? '!from-green-500 !to-green-500' : ''}`}>
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {saved ? '✓ Guardado' : saving ? 'Guardando...' : 'Guardar cambios'}
      </button>
    </div>
  )
}
