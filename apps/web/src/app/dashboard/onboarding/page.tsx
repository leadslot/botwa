'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ChevronRight, ShoppingCart, Headphones, Calendar, UtensilsCrossed, Briefcase, MessageCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ── Templates de rol ──────────────────────────────────────────────
const TEMPLATES = [
  {
    id: 'ventas',
    icon: ShoppingCart,
    label: 'Ventas',
    desc: 'Presenta productos, responde sobre precios y cierra consultas',
    fields: [
      { key: 'productos', label: '¿Qué vendés?', placeholder: 'Ej: ropa deportiva, accesorios, calzado' },
      { key: 'horario', label: 'Horario de atención', placeholder: 'Ej: Lunes a sábados 9 a 19hs' },
      { key: 'envio', label: 'Info de envío / entrega', placeholder: 'Ej: Envío a todo el país, 48hs hábiles' },
      { key: 'faq', label: 'Preguntas frecuentes (opcional)', placeholder: 'Ej: "¿Tienen local físico?" Sí, en Av. Corrientes 1234' },
    ],
    buildPrompt: (name: string, f: Record<string,string>) =>
`Sos el asistente de ventas de ${name}. Respondé consultas de clientes de forma amable, directa y con foco en cerrar la venta.

Lo que vendemos: ${f.productos || '(completar)'}
Horario de atención: ${f.horario || '(completar)'}
Envíos: ${f.envio || '(completar)'}
${f.faq ? `Info adicional:\n${f.faq}` : ''}

Reglas:
- Respondé siempre en el idioma del cliente.
- Si pregunta por precio y no lo tenés, decí que le pasás el catálogo o lo derivás con un asesor.
- Si no podés ayudar, decí: "En breve te contacta alguien de nuestro equipo."
- Nunca inventes información que no tenés.`
  },
  {
    id: 'soporte',
    icon: Headphones,
    label: 'Soporte',
    desc: 'Atiende problemas, reclamos y consultas post-venta',
    fields: [
      { key: 'servicio', label: '¿Qué producto o servicio ofrecés?', placeholder: 'Ej: software de facturación, app de delivery' },
      { key: 'problemas', label: 'Problemas más comunes', placeholder: 'Ej: no puedo iniciar sesión, el pago no procesó' },
      { key: 'horario', label: 'Horario de soporte', placeholder: 'Ej: Lunes a viernes 9 a 18hs' },
      { key: 'escalado', label: 'Cuándo escalar a humano', placeholder: 'Ej: si el cliente pide reembolso o lleva más de 48hs sin solución' },
    ],
    buildPrompt: (name: string, f: Record<string,string>) =>
`Sos el asistente de soporte de ${name}. Tu objetivo es resolver problemas del cliente de forma rápida y empática.

Servicio: ${f.servicio || '(completar)'}
Problemas comunes y soluciones: ${f.problemas || '(completar)'}
Horario de soporte: ${f.horario || '(completar)'}
Cuándo derivar a un agente: ${f.escalado || 'cuando el cliente lo pida expresamente'}

Reglas:
- Pedí siempre el nombre y el problema específico para poder ayudar mejor.
- Respondé en el idioma del cliente.
- Si no podés resolver, decí: "Voy a escalar tu caso a nuestro equipo, te contactan en breve."
- Nunca inventes soluciones que no conocés.`
  },
  {
    id: 'turnos',
    icon: Calendar,
    label: 'Turnos',
    desc: 'Gestiona reservas, consulta disponibilidad y horarios',
    fields: [
      { key: 'servicio', label: '¿Qué servicio ofrecés?', placeholder: 'Ej: consultas médicas, corte de cabello, masajes' },
      { key: 'horario', label: 'Días y horarios disponibles', placeholder: 'Ej: Martes a sábados, 10 a 19hs' },
      { key: 'duracion', label: 'Duración del turno', placeholder: 'Ej: 45 minutos' },
      { key: 'reserva', label: 'Cómo se reserva', placeholder: 'Ej: respondé este chat con nombre + día/hora deseada' },
    ],
    buildPrompt: (name: string, f: Record<string,string>) =>
`Sos el asistente de turnos de ${name}. Ayudás a los clientes a reservar y consultar disponibilidad.

Servicio: ${f.servicio || '(completar)'}
Disponibilidad: ${f.horario || '(completar)'}
Duración de cada turno: ${f.duracion || '(completar)'}
Cómo reservar: ${f.reserva || '(completar)'}

Reglas:
- Para reservar, pedí: nombre completo, servicio deseado, y día/hora preferida.
- Si el horario no está disponible, ofrecé la próxima alternativa.
- Confirmá siempre el turno repitiendo los datos al final.
- Respondé en el idioma del cliente.
- Si no podés confirmar disponibilidad, decí que alguien del equipo confirma en breve.`
  },
  {
    id: 'restaurante',
    icon: UtensilsCrossed,
    label: 'Restaurante',
    desc: 'Menú, pedidos, delivery y reservas de mesa',
    fields: [
      { key: 'menu', label: 'Platos / productos principales', placeholder: 'Ej: empanadas $800, milanesas $2500, delivery desde $5000' },
      { key: 'horario', label: 'Horario y días de atención', placeholder: 'Ej: Todos los días 12 a 15hs y 20 a 23hs' },
      { key: 'delivery', label: 'Info de delivery', placeholder: 'Ej: delivery propio, zona: Palermo, Belgrano. Mínimo $3000' },
      { key: 'reservas', label: 'Reservas de mesa (opcional)', placeholder: 'Ej: aceptamos reservas por este chat para más de 4 personas' },
    ],
    buildPrompt: (name: string, f: Record<string,string>) =>
`Sos el asistente de ${name}. Ayudás con consultas de menú, pedidos y reservas.

Menú y precios: ${f.menu || '(completar)'}
Horario: ${f.horario || '(completar)'}
Delivery: ${f.delivery || '(completar)'}
${f.reservas ? `Reservas: ${f.reservas}` : ''}

Reglas:
- Respondé rápido y amistoso.
- Si preguntan por algo que no está en el menú, decí que consultás con el local.
- Para pedidos de delivery, pedí: dirección, qué piden, y método de pago.
- Respondé en el idioma del cliente.`
  },
  {
    id: 'profesional',
    icon: Briefcase,
    label: 'Profesional',
    desc: 'Consultora, estudio, clínica o servicio especializado',
    fields: [
      { key: 'profesion', label: '¿Qué profesión o servicio?', placeholder: 'Ej: estudio contable, clínica dental, asesoría legal' },
      { key: 'servicios', label: 'Servicios que ofrecés', placeholder: 'Ej: declaraciones juradas, balances, AFIP' },
      { key: 'horario', label: 'Horario de atención', placeholder: 'Ej: Lunes a viernes 9 a 17hs' },
      { key: 'contacto', label: 'Cómo agendar / consultar', placeholder: 'Ej: respondé este chat o llamá al 11-1234-5678' },
    ],
    buildPrompt: (name: string, f: Record<string,string>) =>
`Sos el asistente virtual de ${name}, ${f.profesion || 'estudio profesional'}.

Servicios: ${f.servicios || '(completar)'}
Horario: ${f.horario || '(completar)'}
Para consultas o turnos: ${f.contacto || '(completar)'}

Reglas:
- Respondé de forma profesional y clara.
- No des asesoramiento técnico específico (precios, diagnósticos, dictámenes): derivá al profesional.
- Para agendar consulta, pedí nombre, motivo y disponibilidad horaria.
- Respondé en el idioma del cliente.
- Si no podés ayudar, decí: "Te va a contactar alguien de nuestro equipo a la brevedad."`
  },
  {
    id: 'personalizado',
    icon: MessageCircle,
    label: 'Personalizado',
    desc: 'Escribí tu propio prompt desde cero',
    fields: [],
    buildPrompt: (_name: string, _f: Record<string,string>) => '',
  },
]

// ─────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [fields, setFields] = useState<Record<string,string>>({})
  const [customPrompt, setCustomPrompt] = useState('')

  const template = TEMPLATES.find(t => t.id === templateId)

  const generatedPrompt = template && templateId !== 'personalizado'
    ? template.buildPrompt(name, fields)
    : customPrompt

  const handleFinish = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: { session: _s } } = await supabase.auth.getSession(); const user = _s?.user ?? null
    if (!user) return

    await supabase.from('businesses').insert({
      user_id: user.id,
      name,
      category: template?.label || 'Personalizado',
      ai_prompt: generatedPrompt,
      ai_enabled: true,
      messages_used: 0,
    })

    router.push('/dashboard/connect')
  }

  const allFieldsFilled = template?.fields.every(f =>
    f.key === 'faq' || f.key === 'reservas' || (fields[f.key] || '').trim()
  ) ?? false

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-xl">

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          {[1,2,3].map(n => (
            <div key={n} className={`h-2 rounded-full transition-all duration-300 ${n <= step ? 'bg-indigo-500 w-12' : 'bg-gray-200 w-8'}`} />
          ))}
        </div>

        <div className="card">

          {/* PASO 1 — Nombre */}
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-black text-gray-900 mb-1">¿Cómo se llama tu negocio?</h2>
              <p className="text-gray-500 text-sm mb-6">El bot se presentará con este nombre</p>
              <input
                type="text"
                placeholder="Ej: Clínica San Martín, Peluquería Luna, Estudio Rodríguez..."
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && name.trim() && setStep(2)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-6 transition-all"
                autoFocus
              />
              <button onClick={() => setStep(2)} disabled={!name.trim()}
                className="btn-primary w-full flex items-center justify-center gap-2">
                Continuar <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* PASO 2 — Elegir template */}
          {step === 2 && (
            <div>
              <h2 className="text-2xl font-black text-gray-900 mb-1">¿Para qué usás el bot?</h2>
              <p className="text-gray-500 text-sm mb-6">Elegí el modo y llenás solo los datos de tu negocio</p>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {TEMPLATES.map(t => {
                  const Icon = t.icon
                  return (
                    <button key={t.id} onClick={() => setTemplateId(t.id)}
                      className={`text-left p-4 rounded-xl border-2 transition-all ${
                        templateId === t.id
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-100 hover:border-indigo-200'
                      }`}>
                      <Icon className={`w-5 h-5 mb-2 ${templateId === t.id ? 'text-indigo-500' : 'text-gray-400'}`} />
                      <p className={`font-semibold text-sm ${templateId === t.id ? 'text-indigo-700' : 'text-gray-800'}`}>{t.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-tight">{t.desc}</p>
                    </button>
                  )
                })}
              </div>
              <button onClick={() => setStep(3)} disabled={!templateId}
                className="btn-primary w-full flex items-center justify-center gap-2">
                Continuar <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* PASO 3 — Datos del negocio o prompt personalizado */}
          {step === 3 && (
            <div>
              <h2 className="text-2xl font-black text-gray-900 mb-1">Datos de {name}</h2>
              <p className="text-gray-500 text-sm mb-6">
                {templateId === 'personalizado'
                  ? 'Escribí cómo querés que responda el bot'
                  : '5 minutos y el bot ya sabe todo sobre tu negocio'}
              </p>

              {templateId === 'personalizado' ? (
                <textarea
                  value={customPrompt}
                  onChange={e => setCustomPrompt(e.target.value)}
                  rows={10}
                  placeholder={`Ej: Sos el asistente de ${name}. Respondé consultas de clientes sobre...`}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-6 resize-none font-mono transition-all"
                />
              ) : (
                <div className="space-y-4 mb-6">
                  {template?.fields.map(f => (
                    <div key={f.key}>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        {f.label}
                        {(f.key === 'faq' || f.key === 'reservas') && (
                          <span className="text-gray-400 font-normal ml-1">(opcional)</span>
                        )}
                      </label>
                      <textarea
                        value={fields[f.key] || ''}
                        onChange={e => setFields({...fields, [f.key]: e.target.value})}
                        placeholder={f.placeholder}
                        rows={2}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none transition-all"
                      />
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={handleFinish}
                disabled={loading || (templateId === 'personalizado' ? !customPrompt.trim() : !allFieldsFilled)}
                className="btn-primary w-full flex items-center justify-center gap-2">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? 'Configurando...' : '¡Listo! Conectar WhatsApp →'}
              </button>
              <p className="text-xs text-gray-400 text-center mt-3">
                Podés editar todo esto después desde Configuración
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
