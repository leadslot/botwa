'use client'
import { useState } from 'react'
import {
  X, ChevronRight, ChevronLeft, Wand2, Loader2,
  Scissors, Pen, Sparkles, Heart, Stethoscope, Brain,
  Wrench, Home, Settings, Briefcase, ShoppingBag, Package,
  UtensilsCrossed, BookOpen, Car, Dumbbell,
  Palette, Zap, PawPrint, Apple, Activity, HeartPulse,
  PaintBucket, Hammer, Leaf, Truck, Smartphone, Monitor,
  Camera, Music, CalendarDays, Shield, Building2,
  TrendingUp, Headphones, Info, Megaphone,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ─── Types ───────────────────────────────────────────────────────────────────

type RubroKey =
  | 'peluqueria' | 'tatuajes' | 'manicura' | 'masajes' | 'medico'
  | 'psicologo' | 'plomero' | 'limpieza' | 'tecnico' | 'abogado'
  | 'tienda' | 'ecommerce' | 'restaurante' | 'profesor' | 'mecanico' | 'gimnasio'
  | 'maquilladora' | 'depilacion' | 'peluqueria_canina'
  | 'nutricionista' | 'kinesiologo' | 'enfermeria'
  | 'pintor' | 'carpintero' | 'jardinero' | 'mudanzas'
  | 'tecnico_celulares' | 'disenador' | 'fotografo'
  | 'profesor_musica' | 'dj' | 'eventos'
  | 'seguros' | 'inmobiliaria'
  | 'veterinaria' | 'lavadero'

type ResponseStyle = 'corta' | 'normal' | 'detallada'
type BotProfile = 'ventas' | 'atencion' | 'informativo' | 'marketing' | 'soporte' | 'cobranzas' | 'reservas'

interface Faq { question: string; answer: string }

interface WizardData {
  // Step 1
  rubro: RubroKey
  // Step 2
  botProfiles: BotProfile[]
  // Step 3
  businessName: string
  contactName: string
  tone: string
  mainChannels: string[]
  // Step 4
  address: string
  hours: string
  payments: string[]
  websiteLink: string
  bookingLink: string
  // Step 5 — rubro-specific fields
  specific: Record<string, string>
  specificMulti: Record<string, string[]>
  // Step 6
  botLimits: string
  escalationContact: string
  extraInfo: string
  // Step 7
  faqs: Faq[]
  // Step 8
  responseStyle: ResponseStyle
}

// ─── Static data ─────────────────────────────────────────────────────────────

const BOT_PROFILES: {
  key: BotProfile
  label: string
  description: string
  Icon: React.ElementType
  promptInstruction: string
}[] = [
  {
    key: 'ventas',
    label: 'Ventas',
    description: 'El bot ayuda a cerrar ventas: responde consultas de productos, precios, disponibilidad y guía al cliente hacia la compra o turno.',
    Icon: TrendingUp,
    promptInstruction: 'Tu objetivo es guiar al cliente hacia agendar un turno o concretar la compra. Detectá la intención y avanzá hacia el cierre sin presionar.',
  },
  {
    key: 'atencion',
    label: 'Atención al cliente',
    description: 'El bot resuelve dudas, gestiona reclamos, da seguimiento y retiene clientes con respuestas rápidas y empáticas.',
    Icon: Headphones,
    promptInstruction: 'Tu objetivo es resolver la consulta rápido y que el cliente quede satisfecho. Si no podés resolver, derivá sin hacerlo esperar.',
  },
  {
    key: 'informativo',
    label: 'Informativo',
    description: 'El bot responde preguntas frecuentes, da información del negocio, horarios y deriva cuando necesita más atención.',
    Icon: Info,
    promptInstruction: 'Tu objetivo es dar información precisa y clara. No vendas, solo informá y derivá si necesitan más.',
  },
  {
    key: 'marketing',
    label: 'Marketing',
    description: 'El bot presenta novedades, promociones, capta leads y mantiene el interés del cliente con mensajes atractivos.',
    Icon: Megaphone,
    promptInstruction: 'Tu objetivo es generar interés. Mencioná promociones cuando sea natural, sin ser invasivo.',
  },
  {
    key: 'soporte',
    label: 'Soporte técnico',
    description: 'El bot guía al cliente en problemas técnicos, paso a paso, antes de escalar a un técnico humano.',
    Icon: Settings,
    promptInstruction: 'Tu objetivo es ayudar a resolver el problema técnico guiando al cliente paso a paso. Si no se resuelve, derivá a un técnico.',
  },
  {
    key: 'cobranzas',
    label: 'Cobranzas / Recordatorios',
    description: 'El bot envía recordatorios de pago, confirma recibos y gestiona vencimientos de forma amable.',
    Icon: Shield,
    promptInstruction: 'Tu objetivo es recordar o confirmar pagos de forma amable y clara. No presiones, sé directo y profesional.',
  },
  {
    key: 'reservas',
    label: 'Reservas / Agenda',
    description: 'El bot toma reservas, confirma disponibilidad y envía recordatorios de citas.',
    Icon: CalendarDays,
    promptInstruction: 'Tu objetivo es coordinar reservas y turnos. Confirmá disponibilidad, capturá los datos necesarios y recordá al cliente la cita.',
  },
]

const FIXED_RULES = `
REGLAS DE COMPORTAMIENTO (NO NEGOCIABLES)
- Solo respondé preguntas relacionadas con el negocio. Si preguntan algo fuera del tema (clima, noticias, chistes, etc.), respondé: "Solo puedo ayudarte con consultas sobre el negocio."
- Nunca respondas más de 2 mensajes seguidos sin esperar respuesta del cliente.
- Si el cliente mandó 3 o más mensajes seguidos sin que respondas, respondé solo el último.
- Si el cliente dice "ok", "gracias", "dale", "joya", "👍" o similar, no respondas o respondé con máximo 3 palabras.
- Nunca inventes información que no tenés. Si no sabés, decí "No tengo ese dato, pero podés consultar directamente."
- PRECIOS: Si no tenés el precio exacto en tu información, NUNCA lo estimes ni inventes. Respondé: "Los precios los manejamos por consulta, contame qué tenés en mente y te doy un presupuesto."
- Nunca prometés cosas que no están confirmadas (precios exactos, fechas, disponibilidad).
- Si el cliente está enojado o hace un reclamo fuerte, respondé con empatía y derivá a un humano.
- No enviés links externos salvo los configurados en este perfil.
- Nunca digas que sos un bot o una IA.`.trim()

const RUBRO_CATEGORIES: { label: string; keys: RubroKey[] }[] = [
  {
    label: 'Belleza y estética',
    keys: ['peluqueria', 'tatuajes', 'manicura', 'masajes', 'maquilladora', 'depilacion', 'peluqueria_canina'],
  },
  {
    label: 'Salud y bienestar',
    keys: ['medico', 'psicologo', 'nutricionista', 'kinesiologo', 'enfermeria'],
  },
  {
    label: 'Construcción y hogar',
    keys: ['plomero', 'limpieza', 'tecnico', 'pintor', 'carpintero', 'jardinero', 'mudanzas'],
  },
  {
    label: 'Tecnología y diseño',
    keys: ['tecnico_celulares', 'disenador', 'fotografo'],
  },
  {
    label: 'Educación y entretenimiento',
    keys: ['profesor', 'profesor_musica', 'dj', 'eventos'],
  },
  {
    label: 'Comercio y servicios',
    keys: ['tienda', 'ecommerce', 'restaurante', 'mecanico', 'gimnasio', 'lavadero'],
  },
  {
    label: 'Finanzas e inmuebles',
    keys: ['abogado', 'seguros', 'inmobiliaria'],
  },
  {
    label: 'Veterinaria',
    keys: ['veterinaria'],
  },
]

const RUBRO_MAP: Record<RubroKey, { label: string; Icon: React.ElementType }> = {
  peluqueria:      { label: 'Peluquería / Barbería',          Icon: Scissors },
  tatuajes:        { label: 'Tatuajes / Piercings',            Icon: Pen },
  manicura:        { label: 'Manicura / Estética',             Icon: Sparkles },
  masajes:         { label: 'Masajes / Spa',                   Icon: Heart },
  medico:          { label: 'Médico / Odontólogo',             Icon: Stethoscope },
  psicologo:       { label: 'Psicólogo / Terapeuta',           Icon: Brain },
  plomero:         { label: 'Plomero / Electricista / Gas',    Icon: Wrench },
  limpieza:        { label: 'Limpieza',                        Icon: Home },
  tecnico:         { label: 'Técnico / Aire acondicionado',    Icon: Settings },
  abogado:         { label: 'Abogado / Contador / Arquitecto', Icon: Briefcase },
  tienda:          { label: 'Tienda física',                   Icon: ShoppingBag },
  ecommerce:       { label: 'E-commerce',                      Icon: Package },
  restaurante:     { label: 'Restaurante / Delivery',          Icon: UtensilsCrossed },
  profesor:        { label: 'Profesor / Academia',             Icon: BookOpen },
  mecanico:        { label: 'Mecánico / Gomería',              Icon: Car },
  gimnasio:        { label: 'Gimnasio / Entrenador',           Icon: Dumbbell },
  maquilladora:    { label: 'Maquilladora / Micropigmentación',Icon: Palette },
  depilacion:      { label: 'Depilación',                      Icon: Zap },
  peluqueria_canina: { label: 'Peluquería canina',             Icon: PawPrint },
  nutricionista:   { label: 'Nutricionista / Dietista',        Icon: Apple },
  kinesiologo:     { label: 'Kinesiólogo / Fisioterapeuta',    Icon: Activity },
  enfermeria:      { label: 'Enfermería a domicilio',          Icon: HeartPulse },
  pintor:          { label: 'Pintor / Yesero',                 Icon: PaintBucket },
  carpintero:      { label: 'Carpintero / Herrero',            Icon: Hammer },
  jardinero:       { label: 'Jardinero / Paisajista',          Icon: Leaf },
  mudanzas:        { label: 'Mudanzas / Fletes',               Icon: Truck },
  tecnico_celulares: { label: 'Técnico celulares / PCs',       Icon: Smartphone },
  disenador:       { label: 'Diseñador gráfico / Web',         Icon: Monitor },
  fotografo:       { label: 'Fotógrafo / Videógrafo',          Icon: Camera },
  profesor_musica: { label: 'Profesor de música / Arte',       Icon: Music },
  dj:              { label: 'DJ / Animador de eventos',        Icon: Sparkles },
  eventos:         { label: 'Organizador de eventos / Catering',Icon: CalendarDays },
  seguros:         { label: 'Seguros / Broker',                Icon: Shield },
  inmobiliaria:    { label: 'Inmobiliaria',                    Icon: Building2 },
  veterinaria:     { label: 'Veterinaria completa',            Icon: Stethoscope },
  lavadero:        { label: 'Lavadero de autos',               Icon: Car },
}

const TONES = [
  { value: 'amigable y rioplatense',   label: 'Amigable y rioplatense' },
  { value: 'formal y profesional',     label: 'Formal y profesional' },
  { value: 'neutral',                  label: 'Neutral' },
  { value: 'divertido y cercano',      label: 'Divertido y cercano' },
]

const PAYMENT_OPTIONS = ['Efectivo', 'MercadoPago', 'Transferencia', 'Tarjeta', 'Cripto']
const CHANNEL_OPTIONS = ['WhatsApp', 'Instagram', 'Facebook', 'Email', 'Telegram']

type FieldDef =
  | { key: string; label: string; type: 'textarea' | 'text'; placeholder?: string }
  | { key: string; label: string; type: 'select'; options: string[] }
  | { key: string; label: string; type: 'pills'; options: string[] }
  | { key: string; label: string; type: 'conditional_text'; condition_key: string; condition_value: string; placeholder?: string }

const RUBRO_FIELDS: Record<string, FieldDef[]> = {
  peluqueria: [
    { key: 'servicios', label: '¿Qué servicios ofrecés?', type: 'textarea', placeholder: 'Ej: Corte de pelo, barba, color, mechas...' },
    { key: 'precios',   label: '¿Cómo son los precios?',  type: 'textarea', placeholder: 'Ej: Corte $5.000, barba $3.000, mechas desde $15.000' },
    { key: 'turno',     label: '¿Cómo se saca turno?',    type: 'textarea', placeholder: 'Ej: Por WhatsApp o Instagram, con 48hs de anticipación' },
    { key: 'duracion',  label: '¿Cuánto dura cada servicio aprox?', type: 'text', placeholder: 'Ej: Corte 30min, mechas 2hs' },
  ],
  tatuajes: [
    { key: 'estilos',   label: '¿Qué estilos o servicios ofrecés?', type: 'textarea', placeholder: 'Ej: Líneas finas, blackwork, piercings, retoques...' },
    { key: 'cotizacion',label: '¿Cómo cotizás?', type: 'textarea', placeholder: 'Ej: Según referencia, tamaño, zona y complejidad. Se confirma por WhatsApp.' },
    { key: 'turno',     label: '¿Cómo se reserva un turno?', type: 'textarea', placeholder: 'Ej: Se coordina por WhatsApp y se confirma con seña si corresponde.' },
    { key: 'restricciones', label: '¿Hay condiciones o restricciones?', type: 'textarea', placeholder: 'Ej: Requiere consulta previa, documentación o autorización según el caso.' },
  ],
  manicura: [
    { key: 'servicios', label: '¿Qué servicios ofrecés?', type: 'textarea', placeholder: 'Ej: Manicura, pedicura, kapping, nail art, semipermanente...' },
    { key: 'precios',   label: '¿Cómo son los precios?',  type: 'textarea', placeholder: 'Ej: Manicura $4.000, kapping $8.000, nail art desde $10.000' },
    { key: 'turno',     label: '¿Cómo se saca turno?',    type: 'textarea', placeholder: 'Ej: Por WhatsApp, mínimo 24hs antes' },
    { key: 'duracion',  label: '¿Cuánto dura cada servicio aprox?', type: 'text', placeholder: 'Ej: Manicura 45min, kapping 1.5hs' },
  ],
  masajes: [
    { key: 'servicios', label: '¿Qué servicios ofrecés?', type: 'textarea', placeholder: 'Ej: Masajes relajantes, descontracturantes, piedras calientes, reflexología...' },
    { key: 'precios',   label: '¿Cómo son los precios?',  type: 'textarea', placeholder: 'Ej: 60min $8.000, 90min $11.000' },
    { key: 'turno',     label: '¿Cómo se saca turno?',    type: 'textarea', placeholder: 'Ej: Por WhatsApp con 24hs de anticipación' },
    { key: 'duracion',  label: '¿Cuánto dura cada sesión aprox?', type: 'text', placeholder: 'Ej: 60 o 90 minutos según el servicio' },
  ],
  medico: [
    { key: 'especialidad', label: '¿Qué especialidad o servicios ofrecés?', type: 'textarea', placeholder: 'Ej: Clínica médica, dermatología, odontología general...' },
    { key: 'obras_sociales', label: '¿Obras sociales o prepagas que aceptás?', type: 'textarea', placeholder: 'Ej: OSDE, Swiss Medical, PAMI, particular...' },
    { key: 'turno', label: '¿Cómo se saca turno?', type: 'textarea', placeholder: 'Ej: Por WhatsApp o teléfono, lunes a viernes de 9 a 18hs' },
    { key: 'duracion', label: '¿Cuánto dura la consulta aprox?', type: 'text', placeholder: 'Ej: 30 minutos' },
  ],
  psicologo: [
    { key: 'especialidad', label: '¿Qué especialidad o servicios ofrecés?', type: 'textarea', placeholder: 'Ej: Psicología clínica, TCC, adultos y adolescentes...' },
    { key: 'obras_sociales', label: '¿Obras sociales o prepagas que aceptás?', type: 'textarea', placeholder: 'Ej: OSDE, particular. Sesiones online también.' },
    { key: 'turno', label: '¿Cómo se saca turno?', type: 'textarea', placeholder: 'Ej: Por WhatsApp, primera entrevista es de evaluación' },
    { key: 'duracion', label: '¿Cuánto dura la sesión aprox?', type: 'text', placeholder: 'Ej: 50 minutos' },
  ],
  plomero: [
    { key: 'trabajos', label: '¿Qué trabajos hacés?', type: 'textarea', placeholder: 'Ej: Destape, instalaciones, pérdidas, termotanques...' },
    { key: 'presupuesto', label: '¿Cómo es el sistema de presupuesto?', type: 'textarea', placeholder: 'Ej: Presupuesto gratuito en el lugar, mano de obra + materiales' },
    { key: 'zona', label: '¿Zona de cobertura?', type: 'text', placeholder: 'Ej: CABA y GBA Norte' },
    { key: 'urgencias', label: '¿Hacés urgencias?', type: 'select', options: ['Sí', 'No', 'Solo ciertos casos'] },
  ],
  limpieza: [
    { key: 'tipo', label: '¿Qué tipo de limpieza hacés?', type: 'textarea', placeholder: 'Ej: Hogares, oficinas, post obra, vidrios...' },
    { key: 'cotizacion', label: '¿Cómo cotizás?', type: 'textarea', placeholder: 'Ej: Por m² o por horas. Presupuesto sin cargo.' },
    { key: 'zona', label: '¿Zona de cobertura?', type: 'text', placeholder: 'Ej: Capital Federal y zona oeste GBA' },
    { key: 'materiales', label: '¿Traés materiales?', type: 'select', options: ['Sí', 'No', 'Opcional'] },
  ],
  tecnico: [
    { key: 'trabajos', label: '¿Qué trabajos hacés?', type: 'textarea', placeholder: 'Ej: Instalación y service de AC, heladeras, lavarropas...' },
    { key: 'presupuesto', label: '¿Cómo es el sistema de presupuesto?', type: 'textarea', placeholder: 'Ej: Diagnóstico incluido, mano de obra aparte de repuestos' },
    { key: 'zona', label: '¿Zona de cobertura?', type: 'text', placeholder: 'Ej: CABA y GBA' },
    { key: 'urgencias', label: '¿Hacés urgencias?', type: 'select', options: ['Sí', 'No', 'Solo ciertos casos'] },
  ],
  abogado: [
    { key: 'especialidad', label: '¿En qué especialidad trabajás?', type: 'textarea', placeholder: 'Ej: Derecho laboral, civil, familia, contabilidad impositiva...' },
    { key: 'honorarios', label: '¿Cómo son los honorarios o consultas?', type: 'textarea', placeholder: 'Ej: Consulta inicial acordada. Honorarios según complejidad.' },
    { key: 'agenda', label: '¿Cómo se agenda una consulta?', type: 'textarea', placeholder: 'Ej: Por WhatsApp, lunes a viernes de 9 a 18hs' },
    { key: 'primera', label: '¿Primera consulta es gratuita?', type: 'select', options: ['Sí', 'No', 'Depende'] },
  ],
  tienda: [
    { key: 'productos', label: '¿Qué productos vendés?', type: 'textarea', placeholder: 'Ej: Ropa femenina, calzado, accesorios...' },
    { key: 'envios', label: '¿Hacés envíos?', type: 'select', options: ['Sí', 'No', 'Solo zona'] },
    { key: 'precios', label: '¿Cuál es el rango de precios?', type: 'textarea', placeholder: 'Ej: Remeras desde $X, pantalones desde $Y' },
    { key: 'pedido', label: '¿Cómo se hace un pedido?', type: 'textarea', placeholder: 'Ej: Por WhatsApp con foto del producto, pago por transferencia o MercadoPago' },
  ],
  ecommerce: [
    { key: 'productos', label: '¿Qué productos vendés?', type: 'textarea', placeholder: 'Ej: Suplementos deportivos, productos naturales...' },
    { key: 'envios', label: '¿Hacés envíos?', type: 'select', options: ['Sí', 'No', 'Solo zona'] },
    { key: 'precios', label: '¿Cuál es el rango de precios?', type: 'textarea', placeholder: 'Ej: Desde $X. Descuentos por volumen.' },
    { key: 'pedido', label: '¿Cómo se hace un pedido?', type: 'textarea', placeholder: 'Ej: Por el sitio web o por WhatsApp. Envío en 24-48hs.' },
  ],
  restaurante: [
    { key: 'platos', label: '¿Qué platos o productos ofrecés?', type: 'textarea', placeholder: 'Ej: Pastas, milanesas, ensaladas, postres caseros...' },
    { key: 'delivery', label: '¿Hacés delivery?', type: 'select', options: ['Sí', 'No'] },
    { key: 'zona_delivery', label: '¿Zona de delivery?', type: 'text', placeholder: 'Ej: 5km a la redonda, sin cargo mínimo $500' },
    { key: 'reservas', label: '¿Aceptás reservas?', type: 'select', options: ['Sí', 'No'] },
  ],
  profesor: [
    { key: 'materias', label: '¿Qué enseñás?', type: 'textarea', placeholder: 'Ej: Matemática, inglés, guitarra, programación...' },
    { key: 'modalidad', label: '¿Modalidad?', type: 'select', options: ['Presencial', 'Virtual', 'Ambas'] },
    { key: 'precios', label: '¿Cuáles son los precios?', type: 'textarea', placeholder: 'Ej: Clase individual $X/hora, pack 4 clases $Y' },
    { key: 'inscripcion', label: '¿Cómo se inscribe un alumno?', type: 'textarea', placeholder: 'Ej: Por WhatsApp, clase de prueba gratuita' },
  ],
  mecanico: [
    { key: 'trabajos', label: '¿Qué trabajos hacés?', type: 'textarea', placeholder: 'Ej: Service, frenos, gomería, electricidad, diagnóstico...' },
    { key: 'presupuesto', label: '¿Cómo es el sistema de presupuesto?', type: 'textarea', placeholder: 'Ej: Revisión gratuita, presupuesto antes de cualquier trabajo' },
    { key: 'zona', label: '¿Zona de cobertura?', type: 'text', placeholder: 'Ej: Villa del Parque, CABA' },
    { key: 'urgencias', label: '¿Hacés urgencias / grúa?', type: 'select', options: ['Sí', 'No', 'Solo ciertos casos'] },
  ],
  gimnasio: [
    { key: 'servicios', label: '¿Qué servicios ofrecés?', type: 'textarea', placeholder: 'Ej: Musculación, clases grupales, entrenamiento personalizado...' },
    { key: 'precios', label: '¿Cómo son los precios?', type: 'textarea', placeholder: 'Ej: Mensual $X, clases sueltas $Y, pack 10 clases $Z' },
    { key: 'turno', label: '¿Cómo se saca turno / se inscribe?', type: 'textarea', placeholder: 'Ej: Ir al local o WhatsApp para reservar lugar en clases' },
    { key: 'duracion', label: '¿Cuánto dura cada clase/sesión aprox?', type: 'text', placeholder: 'Ej: 1 hora' },
  ],
  maquilladora: [
    { key: 'servicios', label: '¿Qué servicios ofrecés?', type: 'textarea', placeholder: 'Ej: Maquillaje de novia, micropigmentación de cejas, labios...' },
    { key: 'precios', label: '¿Cómo son los precios?', type: 'textarea', placeholder: 'Ej: Maquillaje novia $X, micropigmentación cejas $Y' },
    { key: 'turno', label: '¿Cómo se saca turno y qué seña pedís?', type: 'textarea', placeholder: 'Ej: Por WhatsApp, seña del 30% para reservar' },
    { key: 'duracion', label: '¿Cuánto dura cada servicio?', type: 'textarea', placeholder: 'Ej: Maquillaje 1.5hs, micropigmentación 2-3hs' },
    { key: 'cuidados', label: '¿Hay restricciones o cuidados post?', type: 'textarea', placeholder: 'Ej: No exposición al sol 30 días, no maquillaje encima...' },
    { key: 'modalidad', label: '¿Trabajás a domicilio o solo en tu espacio?', type: 'select', options: ['Solo estudio', 'A domicilio', 'Ambos'] },
  ],
  nutricionista: [
    { key: 'pacientes', label: '¿Qué tipo de pacientes atendés?', type: 'textarea', placeholder: 'Ej: Pérdida de peso, deportistas, patologías específicas...' },
    { key: 'modalidad', label: '¿Modalidad?', type: 'select', options: ['Presencial', 'Virtual', 'Ambas'] },
    { key: 'honorarios', label: '¿Cómo son los honorarios?', type: 'textarea', placeholder: 'Ej: Consulta inicial $X, seguimiento mensual $Y' },
    { key: 'agenda', label: '¿Cómo se agenda una consulta?', type: 'textarea', placeholder: 'Ej: Por WhatsApp, lunes a viernes de 9 a 18hs' },
    { key: 'obras_sociales', label: '¿Trabajás con obras sociales?', type: 'select', options: ['Sí', 'No', 'Consultar'] },
    { key: 'seguimiento', label: '¿Hacés seguimiento continuo?', type: 'select', options: ['Sí', 'No', 'Paquetes'] },
  ],
  kinesiologo: [
    { key: 'tratamientos', label: '¿Qué tratamientos ofrecés?', type: 'textarea', placeholder: 'Ej: Rehabilitación post-quirúrgica, columna, deportiva...' },
    { key: 'modalidad', label: '¿Atendés en consultorio, domicilio o ambos?', type: 'select', options: ['Consultorio', 'Domicilio', 'Ambos'] },
    { key: 'honorarios', label: '¿Cómo son los honorarios?', type: 'textarea', placeholder: 'Ej: Sesión $X, pack 10 sesiones $Y' },
    { key: 'obras_sociales', label: '¿Trabajás con obras sociales?', type: 'select', options: ['Sí', 'No', 'Consultar'] },
    { key: 'duracion', label: '¿Cuánto dura cada sesión?', type: 'text', placeholder: 'Ej: 45-60 minutos' },
    { key: 'turno', label: '¿Cómo se saca turno?', type: 'textarea', placeholder: 'Ej: Por WhatsApp, turnos de lunes a viernes' },
  ],
  disenador: [
    { key: 'servicios', label: '¿Qué servicios ofrecés?', type: 'textarea', placeholder: 'Ej: Logos, branding, páginas web, redes...' },
    { key: 'presupuesto', label: '¿Cómo trabajás los presupuestos?', type: 'textarea', placeholder: 'Ej: Por proyecto, por hora. Presupuesto gratis.' },
    { key: 'tiempos', label: '¿Cuáles son tus tiempos de entrega?', type: 'textarea', placeholder: 'Ej: Logo 5-7 días, web 3-4 semanas' },
    { key: 'sena', label: '¿Pedís seña o anticipo?', type: 'select', options: ['Sí', 'No'] },
    { key: 'sena_monto', label: '¿Cuánto de seña?', type: 'conditional_text', condition_key: 'sena', condition_value: 'Sí', placeholder: 'Ej: 50% al inicio' },
    { key: 'revisiones', label: '¿Incluís revisiones?', type: 'textarea', placeholder: 'Ej: 2 revisiones incluidas en el precio' },
    { key: 'alcance', label: '¿Trabajás con clientes de todo el país?', type: 'select', options: ['Sí', 'Solo local'] },
  ],
  fotografo: [
    { key: 'trabajos', label: '¿Qué tipo de trabajos hacés?', type: 'textarea', placeholder: 'Ej: Casamientos, 15 años, producto, corporativo...' },
    { key: 'precios', label: '¿Cómo son los precios o paquetes?', type: 'textarea', placeholder: 'Ej: Sesión de 2hs $X, casamiento desde $Y' },
    { key: 'cobertura', label: '¿Zona de cobertura o viajás?', type: 'textarea', placeholder: 'Ej: AMBA, viajo al interior con gastos a cargo del cliente' },
    { key: 'entrega', label: '¿Entregás editadas? ¿En cuánto tiempo?', type: 'textarea', placeholder: 'Ej: Sí, entrega en 2-3 semanas por galería digital' },
    { key: 'sena', label: '¿Pedís seña?', type: 'select', options: ['Sí', 'No'] },
    { key: 'sena_monto', label: '¿Cuánto de seña?', type: 'conditional_text', condition_key: 'sena', condition_value: 'Sí', placeholder: 'Ej: 30% para reservar la fecha' },
  ],
  eventos: [
    { key: 'tipo_eventos', label: '¿Qué tipo de eventos organizás?', type: 'textarea', placeholder: 'Ej: Casamientos, corporativos, cumpleaños, baby showers...' },
    { key: 'incluye', label: '¿Qué incluye el servicio?', type: 'textarea', placeholder: 'Ej: Decoración, catering, coordinación, animación...' },
    { key: 'precios', label: '¿Cómo son los precios o paquetes?', type: 'textarea', placeholder: 'Ej: Paquete básico $X, premium $Y. Presupuesto personalizado.' },
    { key: 'zona', label: '¿Zona de cobertura?', type: 'text', placeholder: 'Ej: AMBA y alrededores' },
    { key: 'anticipacion', label: '¿Con cuánta anticipación hay que reservar?', type: 'text', placeholder: 'Ej: Mínimo 30 días antes' },
    { key: 'sena', label: '¿Pedís seña?', type: 'select', options: ['Sí', 'No'] },
    { key: 'sena_monto', label: '¿Cuánto de seña?', type: 'conditional_text', condition_key: 'sena', condition_value: 'Sí', placeholder: 'Ej: 40% al confirmar' },
  ],
  seguros: [
    { key: 'tipos_seguros', label: '¿Qué tipo de seguros comercializás?', type: 'pills', options: ['Auto', 'Hogar', 'Vida', 'Salud', 'Comercio', 'Otros'] },
    { key: 'companias', label: '¿Con qué compañías trabajás?', type: 'textarea', placeholder: 'Ej: Zurich, San Cristóbal, Sancor, La Caja...' },
    { key: 'cotizacion', label: '¿Cómo es el proceso de cotización?', type: 'textarea', placeholder: 'Ej: Pedimos datos del vehículo y enviamos opciones en el día' },
    { key: 'siniestros', label: '¿Ayudás con siniestros?', type: 'select', options: ['Sí', 'No', 'Solo gestión'] },
    { key: 'contacto', label: '¿Cómo contacta un cliente para cotizar?', type: 'textarea', placeholder: 'Ej: Por este WhatsApp o llamando directamente' },
  ],
  inmobiliaria: [
    { key: 'operaciones', label: '¿Qué tipo de operaciones hacés?', type: 'pills', options: ['Alquiler', 'Venta', 'Tasaciones', 'Administración'] },
    { key: 'zona', label: '¿En qué zona trabajás?', type: 'textarea', placeholder: 'Ej: Palermo, Belgrano, zona norte GBA...' },
    { key: 'disponibilidad', label: '¿Tenés propiedades disponibles actualmente?', type: 'select', options: ['Sí, muchas', 'Sí, pocas', 'Consultar'] },
    { key: 'comision', label: '¿Cómo es la comisión?', type: 'textarea', placeholder: 'Ej: 4% del valor en venta, 1 mes en alquiler' },
    { key: 'contacto', label: '¿Cómo contacta un interesado para ver una propiedad?', type: 'textarea', placeholder: 'Ej: Por este WhatsApp, coordinamos visita con el asesor' },
  ],
  depilacion: [
    { key: 'metodos', label: '¿Qué métodos ofrecés?', type: 'pills', options: ['Láser', 'Cera', 'Hilo', 'Definitiva'] },
    { key: 'precios', label: '¿Cuáles son los precios?', type: 'textarea', placeholder: 'Ej: Axila $X, piernas completas $Y, zona bikini $Z' },
    { key: 'turno', label: '¿Cómo se saca turno?', type: 'textarea', placeholder: 'Ej: Por WhatsApp, con 24hs de anticipación' },
    { key: 'duracion', label: '¿Cuánto dura cada sesión aprox?', type: 'text', placeholder: 'Ej: 30-60 minutos según la zona' },
    { key: 'restricciones', label: '¿Hay restricciones?', type: 'textarea', placeholder: 'Ej: No embarazadas, no piel con lesiones activas...' },
  ],
  peluqueria_canina: [
    { key: 'razas', label: '¿Qué razas o tamaños atendés?', type: 'textarea', placeholder: 'Ej: Todas las razas, pequeños y medianos solamente...' },
    { key: 'servicios', label: '¿Qué servicios ofrecés?', type: 'textarea', placeholder: 'Ej: Baño, corte, sanitaria, spa canino...' },
    { key: 'precios', label: '¿Cuáles son los precios?', type: 'textarea', placeholder: 'Ej: Baño pequeño $X, corte mediano $Y' },
    { key: 'turno', label: '¿Cómo se saca turno?', type: 'textarea', placeholder: 'Ej: Por WhatsApp con nombre del perro y raza' },
    { key: 'domicilio', label: '¿Hacés servicio a domicilio?', type: 'select', options: ['Sí', 'No'] },
  ],
  enfermeria: [
    { key: 'servicios', label: '¿Qué servicios ofrecés?', type: 'textarea', placeholder: 'Ej: Curaciones, colocación de vías, inyecciones, control de PA...' },
    { key: 'zona', label: '¿Zona de cobertura?', type: 'text', placeholder: 'Ej: CABA y GBA' },
    { key: 'precios', label: '¿Cómo son los precios?', type: 'textarea', placeholder: 'Ej: Visita $X, inyección $Y, curación $Z' },
    { key: 'urgencias', label: '¿Atendés urgencias?', type: 'select', options: ['Sí', 'No', 'Solo ciertos casos'] },
    { key: 'obras_sociales', label: '¿Trabajás con obras sociales?', type: 'select', options: ['Sí', 'No', 'Consultar'] },
  ],
  mudanzas: [
    { key: 'servicios', label: '¿Qué tipo de servicios ofrecés?', type: 'textarea', placeholder: 'Ej: Mudanzas completas, fletes, embalaje, guardamuebles...' },
    { key: 'zona', label: '¿Zona de cobertura?', type: 'text', placeholder: 'Ej: AMBA, interior del país' },
    { key: 'cotizacion', label: '¿Cómo cotizás?', type: 'select', options: ['Por hora', 'Por distancia', 'Precio fijo', 'Visita previa'] },
    { key: 'equipo', label: '¿Tenés personal y vehículo propio?', type: 'select', options: ['Sí', 'No', 'Tercerizado'] },
  ],
  tecnico_celulares: [
    { key: 'reparaciones', label: '¿Qué reparaciones hacés?', type: 'textarea', placeholder: 'Ej: Pantallas, baterías, cámaras, software, PCs...' },
    { key: 'garantia', label: '¿Trabajás con garantía?', type: 'select', options: ['Sí', 'No'] },
    { key: 'garantia_tiempo', label: '¿Cuánto tiempo de garantía?', type: 'conditional_text', condition_key: 'garantia', condition_value: 'Sí', placeholder: 'Ej: 90 días' },
    { key: 'domicilio', label: '¿Hacés servicio a domicilio?', type: 'select', options: ['Sí', 'No', 'Zona específica'] },
    { key: 'precios', label: '¿Cómo son los precios?', type: 'textarea', placeholder: 'Ej: Pantalla iPhone desde $X, pantalla Samsung desde $Y' },
  ],
  profesor_musica: [
    { key: 'ensenanza', label: '¿Qué enseñás?', type: 'textarea', placeholder: 'Ej: Guitarra, piano, canto, dibujo, pintura...' },
    { key: 'modalidad', label: '¿Modalidad?', type: 'select', options: ['Presencial', 'Virtual', 'Ambas'] },
    { key: 'edades', label: '¿Para qué edades?', type: 'text', placeholder: 'Ej: Niños desde 6 años y adultos' },
    { key: 'precios', label: '¿Cuáles son los precios?', type: 'textarea', placeholder: 'Ej: Clase individual $X/hora, mensual $Y (4 clases)' },
    { key: 'duracion', label: '¿Cuánto dura cada clase?', type: 'text', placeholder: 'Ej: 45 minutos a 1 hora' },
  ],
  veterinaria: [
    { key: 'servicios', label: '¿Qué servicios ofrecés?', type: 'textarea', placeholder: 'Ej: Consultas, vacunas, cirugías, internación, emergencias...' },
    { key: 'animales', label: '¿Qué animales atendés?', type: 'pills', options: ['Perros', 'Gatos', 'Aves', 'Exóticos', 'Otros'] },
    { key: 'turno', label: '¿Cómo se saca turno?', type: 'textarea', placeholder: 'Ej: Por WhatsApp o llamando, también sin turno para urgencias' },
    { key: 'urgencias', label: '¿Atendés urgencias?', type: 'select', options: ['Sí', 'No', 'Horario específico'] },
    { key: 'obras_sociales', label: '¿Aceptás obras sociales para mascotas?', type: 'select', options: ['Sí', 'No', 'Consultar'] },
  ],
  pintor: [
    { key: 'trabajos', label: '¿Qué trabajos hacés?', type: 'textarea', placeholder: 'Ej: Interior, exterior, frentes, yeso, texturado...' },
    { key: 'zona', label: '¿Zona de cobertura?', type: 'text', placeholder: 'Ej: CABA y zona oeste GBA' },
    { key: 'cotizacion', label: '¿Cómo cotizás?', type: 'select', options: ['Visita previa', 'Por foto/video', 'Precio fijo por trabajo'] },
    { key: 'urgencias', label: '¿Hacés urgencias o trabajos en el día?', type: 'select', options: ['Sí', 'No', 'Depende'] },
  ],
  carpintero: [
    { key: 'trabajos', label: '¿Qué trabajos hacés?', type: 'textarea', placeholder: 'Ej: Muebles a medida, reparaciones, rejas, portones, soldadura...' },
    { key: 'zona', label: '¿Zona de cobertura?', type: 'text', placeholder: 'Ej: CABA y GBA Sur' },
    { key: 'cotizacion', label: '¿Cómo cotizás?', type: 'select', options: ['Visita previa', 'Por foto/video', 'Precio fijo por trabajo'] },
    { key: 'urgencias', label: '¿Hacés urgencias o trabajos en el día?', type: 'select', options: ['Sí', 'No', 'Depende'] },
  ],
  jardinero: [
    { key: 'trabajos', label: '¿Qué trabajos hacés?', type: 'textarea', placeholder: 'Ej: Mantenimiento de jardines, diseño, podas, colocación de césped...' },
    { key: 'zona', label: '¿Zona de cobertura?', type: 'text', placeholder: 'Ej: Zona norte GBA' },
    { key: 'cotizacion', label: '¿Cómo cotizás?', type: 'select', options: ['Visita previa', 'Por foto/video', 'Precio fijo por trabajo'] },
    { key: 'urgencias', label: '¿Hacés urgencias o trabajos en el día?', type: 'select', options: ['Sí', 'No', 'Depende'] },
  ],
  lavadero: [
    { key: 'servicios', label: '¿Qué servicios ofrecés?', type: 'textarea', placeholder: 'Ej: Lavado simple, encerado, detailing interior/exterior...' },
    { key: 'precios', label: '¿Cuáles son los precios?', type: 'textarea', placeholder: 'Ej: Lavado simple $X, encerado $Y, detailing completo $Z' },
    { key: 'turno', label: '¿Hay que sacar turno o se atiende sin turno?', type: 'select', options: ['Solo con turno', 'Sin turno', 'Ambos'] },
    { key: 'duracion', label: '¿Cuánto tarda cada servicio aprox?', type: 'text', placeholder: 'Ej: Lavado 30min, detailing 3-4hs' },
  ],
  dj: [
    { key: 'eventos', label: '¿Qué tipo de eventos hacés?', type: 'textarea', placeholder: 'Ej: Casamientos, fiestas de 15, corporativos, cumpleaños...' },
    { key: 'precios', label: '¿Cuáles son tus precios o cómo se cotiza?', type: 'textarea', placeholder: 'Ej: Presupuesto personalizado según horas y tipo de evento' },
    { key: 'zona', label: '¿Zona o distancia máxima?', type: 'text', placeholder: 'Ej: AMBA, viajo al interior' },
    { key: 'equipo', label: '¿Tenés equipo propio?', type: 'select', options: ['Sí', 'No', 'Parcial'] },
  ],
}

const STYLE_OPTIONS: { key: ResponseStyle; label: string; desc: string; tokens: number; example: string }[] = [
  {
    key: 'corta', label: 'Corta', tokens: 100,
    desc: 'Respuestas de 1-2 líneas. Ideal para consultas simples y negocios de alto volumen.',
    example: '"Sí, tenemos lugar el jueves. ¿Mañana o tarde?"',
  },
  {
    key: 'normal', label: 'Normal', tokens: 180,
    desc: 'Respuestas de 2-3 líneas. Balance entre información y brevedad.',
    example: '"Tenemos lugar el jueves y viernes. ¿Qué día te viene mejor? El turno dura aprox 1 hora."',
  },
  {
    key: 'detallada', label: 'Detallada', tokens: 300,
    desc: 'Respuestas más completas. Ideal para servicios complejos o productos con mucha info.',
    example: '"Para el servicio que mencionás necesitaríamos una consulta previa para evaluar..."',
  },
]

// ─── Módulos por categoría ────────────────────────────────────────────────────

const CATEGORY_MODULES: Record<string, string> = {
  'Belleza y estética': `MÓDULO — BELLEZA Y ESTÉTICA
Pedir datos uno por vez en este orden:
1. Qué servicio quiere
2. Para cuándo lo necesita
3. Zona, tamaño, largo, estilo o tipo de trabajo, según corresponda
4. Referencia o foto si ayuda
No inventar precios si dependen de evaluación. No prometer resultados exactos. No confirmar turnos sin disponibilidad real.
Ejemplos: "Dale, ¿qué servicio querías hacerte?" / "Perfecto, ¿para cuándo lo estabas buscando?" / "Si tenés una referencia, mandamela y lo vemos mejor."`,

  'Salud y bienestar': `MÓDULO — SALUD Y BIENESTAR
Pedir datos uno por vez en este orden:
1. Motivo general de consulta
2. Si es una urgencia
3. Edad del paciente, si corresponde
4. Obra social o particular, si corresponde
5. Preferencia de día y horario
6. Modalidad: presencial, online o domicilio
No dar diagnósticos. No indicar medicación. No interpretar síntomas como certeza.
Si el cliente menciona dolor fuerte, sangrado, dificultad para respirar, desmayo, fiebre alta o riesgo de vida: "Por lo que contás, mejor que lo vea un profesional cuanto antes. Si es urgente, acercate a una guardia o llamá a emergencias."`,

  'Construcción y hogar': `MÓDULO — CONSTRUCCIÓN Y HOGAR
Pedir datos uno por vez en este orden:
1. Qué problema o trabajo necesita
2. Zona o barrio
3. Si es urgente o puede coordinarse
4. Fotos o video del problema, si aplica
5. Medidas aproximadas, si aplica
6. Día y horario posible
No prometer precio cerrado sin ver el trabajo. No confirmar disponibilidad sin agenda. Si es gas, electricidad o riesgo de fuga/corto, priorizar seguridad antes que cualquier otra cosa.
Ejemplos: "Dale, ¿qué trabajo necesitás hacer?" / "¿En qué zona estás?" / "¿Es algo urgente o se puede coordinar?"`,

  'Tecnología y diseño': `MÓDULO — TECNOLOGÍA Y DISEÑO
Pedir datos uno por vez en este orden:
1. Qué necesita (reparación, diseño, desarrollo, edición, fotos, video o soporte)
2. Para cuándo lo necesita
3. Si tiene referencias, archivos o ejemplos
4. Presupuesto aproximado, solo si corresponde
5. Modalidad: presencial, online, retiro o envío según rubro
No prometer tiempos exactos sin revisar. No dar diagnóstico técnico definitivo sin evaluar. No confirmar precio cerrado si depende del trabajo.
Ejemplos: "Dale, ¿qué necesitás hacer puntualmente?" / "Perfecto, ¿para cuándo lo necesitás?" / "Si tenés una referencia o archivo, mandamelo y lo veo mejor."`,

  'Educación y entretenimiento': `MÓDULO — EDUCACIÓN Y ENTRETENIMIENTO
Pedir datos uno por vez en este orden:
1. Qué servicio necesita
2. Para qué fecha o desde cuándo
3. Modalidad: presencial, online, evento, clase, curso
4. Cantidad de personas, si aplica
5. Zona del evento o clase, si aplica
6. Duración estimada, si aplica
No confirmar disponibilidad sin agenda. No inventar precios. No prometer resultados educativos o artísticos garantizados.
Ejemplos: "Dale, ¿qué servicio estabas buscando?" / "¿Para qué fecha sería?" / "¿Sería presencial u online?" / "¿Para cuántas personas?"`,

  'Comercio y servicios': `MÓDULO — COMERCIO Y SERVICIOS
Pedir datos uno por vez en este orden:
1. Qué producto o servicio busca
2. Si quiere precio, disponibilidad o turno
3. Zona o modalidad de entrega, si aplica
4. Día y horario, si aplica
5. Medio de pago, si el cliente pregunta
No inventar stock. No inventar precios. No confirmar pedidos si falta dirección, producto o forma de pago. No confirmar turnos sin disponibilidad real.
Para delivery: asegurar qué quiere pedir → dirección/zona → medio de pago → confirmar pedido solo cuando todos los datos están.`,

  'Finanzas e inmuebles': `MÓDULO — FINANZAS E INMUEBLES
Pedir datos uno por vez en este orden:
1. Qué tipo de consulta tiene
2. Si es urgente
3. Ciudad o zona
4. Si busca comprar, vender, alquilar, asegurar, declarar, consultar o presupuestar
5. Medio de contacto para seguimiento
No dar asesoramiento legal, contable, financiero o contractual definitivo. No prometer resultados. No inventar valores, tasas, honorarios ni condiciones. Derivar rápido si la consulta es delicada.
Respuesta de derivación: "Con eso ya me ubico mejor, lo revisa una persona y te responden bien."`,

  'Veterinaria': `MÓDULO — VETERINARIA
Pedir datos uno por vez en este orden:
1. Qué le pasa a la mascota o qué servicio necesita
2. Qué animal es
3. Edad aproximada
4. Si es urgencia
5. Zona o modalidad, si aplica
6. Preferencia de turno
No diagnosticar. No indicar medicación. No reemplazar atención veterinaria.
Si menciona dificultad para respirar, sangrado, convulsiones, intoxicación, accidente, dolor fuerte, no come/no toma agua hace mucho: derivar a guardia veterinaria de inmediato.`,
}

function getCategoryModule(rubro: RubroKey): string {
  const cat = RUBRO_CATEGORIES.find(c => c.keys.includes(rubro))
  if (!cat) return ''
  return CATEGORY_MODULES[cat.label] ?? ''
}

const UNIVERSAL_PROMPT = `REGLAS UNIVERSALES (NO NEGOCIABLES)
No decir que sos un bot ni una IA.
No hablar en tercera persona.
No repetir el saludo si la conversación ya empezó.
Responder solo al último mensaje usando el contexto anterior.
Hacer una sola pregunta por mensaje.
No inventar precios, turnos, diagnósticos ni disponibilidad.
No prometer nada que no esté en la información del negocio.
No enviar textos largos salvo que el cliente lo pida.
No presionar al cliente.
Si el cliente dice "ok", "gracias", "dale" o manda un emoji de aceptación, no responder o responder con máximo 3 palabras.
Si el cliente está enojado o hace un reclamo fuerte: responder con empatía y derivar a un humano.
Derivar cuando: el cliente pide hablar con alguien, la consulta supera lo que el bot puede resolver, hay riesgo legal/médico/técnico/económico, o falta información para cerrar.
Respuesta de derivación: "Perfecto, te dejo la consulta encaminada y ahora lo revisa una persona para responderte bien."
Apertura si el cliente escribe un saludo corto ("hola", "info", "precio", "turnos"): "Hola, ¿cómo estás? Te habla [nombre] de [negocio]. ¿En qué te puedo ayudar?"`

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildPrompt(d: WizardData): string {
  const rubroInfo = RUBRO_MAP[d.rubro]
  const rubroLabel = rubroInfo?.label ?? d.rubro
  const styleOption = STYLE_OPTIONS.find(s => s.key === d.responseStyle)!
  const styleLine = d.responseStyle === 'corta'
    ? '1-2 oraciones máximo'
    : d.responseStyle === 'normal'
      ? '2-3 oraciones máximo'
      : 'hasta 4 oraciones'

  const profileInstruction = (d.botProfiles ?? []).length > 0
    ? (d.botProfiles ?? []).map(k => BOT_PROFILES.find(p => p.key === k)?.promptInstruction).filter(Boolean).join(' ')
    : ''

  const faqLines = d.faqs
    .filter(f => f.question.trim() && f.answer.trim())
    .map(f => `- "${f.question.trim()}": ${f.answer.trim()}`)
    .join('\n')

  const fields = RUBRO_FIELDS[d.rubro] ?? []
  const serviceLines = fields
    .map(f => {
      if (f.type === 'pills') {
        const vals = d.specificMulti[f.key]
        if (!vals || vals.length === 0) return null
        return `- ${f.label.replace('¿', '').replace('?', '').trim()}: ${vals.join(', ')}`
      }
      if (f.type === 'conditional_text') {
        const val = d.specific[f.key]?.trim()
        if (!val) return null
        return `- ${f.label.replace('¿', '').replace('?', '').trim()}: ${val}`
      }
      const val = d.specific[f.key]?.trim()
      if (!val) return null
      return `- ${f.label.replace('¿', '').replace('?', '').trim()}: ${val}`
    })
    .filter(Boolean)
    .join('\n')

  const wizardDataComment = `<!-- WIZARD_DATA: ${JSON.stringify({
    rubro: d.rubro,
    botProfiles: d.botProfiles,
    businessName: d.businessName,
    contactName: d.contactName,
    tone: d.tone,
    mainChannels: d.mainChannels,
    address: d.address,
    hours: d.hours,
    payments: d.payments,
    websiteLink: d.websiteLink,
    bookingLink: d.bookingLink,
    specific: d.specific,
    specificMulti: d.specificMulti,
    botLimits: d.botLimits,
    escalationContact: d.escalationContact,
    extraInfo: d.extraInfo,
    faqs: d.faqs,
    responseStyle: d.responseStyle,
  })} -->`

  const categoryModule = getCategoryModule(d.rubro)

  const channelsLine = d.mainChannels?.length
    ? d.mainChannels.join(', ')
    : 'distintos canales'

  const escalationLine = d.escalationContact
    ? `Si no podés resolver, derivá indicando que alguien del equipo va a responder. El contacto del equipo es: ${d.escalationContact} (no lo compartas con el cliente salvo que te lo pidan explícitamente).`
    : 'Si no podés resolver, respondé solo: "Quedó anotado, alguien del equipo lo ve." No agregues más información ni respondas nuevos mensajes hasta que un humano tome el hilo.'

  const prompt = `Sos ${d.contactName || 'del equipo'} de ${d.businessName} (${rubroLabel}).
Respondés consultas de forma ${d.tone} a través de: ${channelsLine}.
Cada canal tiene su propio estilo (WhatsApp: breve y directo; Instagram: moderno y conciso; Facebook: amable y claro; Email: ordenado y completo). Adaptá el tono al canal pero siempre con la misma información.

${UNIVERSAL_PROMPT}

${categoryModule}

PERFIL DE RESPUESTA
${profileInstruction}

DATOS DEL NEGOCIO
- Ubicación: ${d.address || 'no especificada'}
- Horario: ${d.hours || 'no especificado'}
- Pagos: ${d.payments.length ? d.payments.join(', ') : 'no especificado'}${d.websiteLink ? `\n- Web/Catálogo: ${d.websiteLink}` : ''}${d.bookingLink ? `\n- Turnos/Reservas: ${d.bookingLink}` : ''}

SERVICIOS Y PRECIOS
${serviceLines || 'Consultar directamente con el negocio'}

${faqLines ? `PREGUNTAS FRECUENTES\n${faqLines}\n` : ''}REGLAS ESPECÍFICAS DEL NEGOCIO
${d.botLimits ? `- No resolver: ${d.botLimits}` : '- Sin restricciones adicionales'}${d.extraInfo ? `\n- Info adicional: ${d.extraInfo}` : ''}

DERIVACIÓN
${escalationLine}

ESTILO DE RESPUESTA
Respondé siempre en ${styleLine}. Tokens máximos: ${styleOption.tokens}.

${wizardDataComment}`.trim()

  return prompt
}

export function parseWizardDataFromPrompt(prompt: string): Partial<WizardData> | null {
  const match = prompt.match(/<!-- WIZARD_DATA: (.+?) -->/)
  if (!match) return null
  try {
    return JSON.parse(match[1]) as Partial<WizardData>
  } catch {
    return null
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  businessId?: string
  onClose: () => void
  onSaved: (prompt: string) => void
  initialData?: Partial<WizardData>
  initialStep?: number
}

const TOTAL_STEPS = 8

export default function SetupWizard({ businessId, onClose, onSaved, initialData, initialStep }: Props) {
  const [step, setStep] = useState(initialStep ?? 1)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState<WizardData>({
    rubro: 'tienda',
    botProfiles: ['ventas'],
    businessName: '', contactName: '', tone: 'amigable y rioplatense',
    mainChannels: ['WhatsApp'],
    address: '', hours: '', payments: [], websiteLink: '', bookingLink: '',
    specific: {},
    specificMulti: {},
    botLimits: '', escalationContact: '', extraInfo: '',
    faqs: [{ question: '', answer: '' }, { question: '', answer: '' }],
    responseStyle: 'normal',
    ...initialData,
  })

  const set = <K extends keyof WizardData>(field: K, value: WizardData[K]) =>
    setData(prev => ({ ...prev, [field]: value }))

  const setSpecific = (key: string, value: string) =>
    setData(prev => ({ ...prev, specific: { ...prev.specific, [key]: value } }))

  const toggleSpecificMulti = (key: string, value: string) =>
    setData(prev => {
      const current = prev.specificMulti[key] ?? []
      const next = current.includes(value)
        ? current.filter(x => x !== value)
        : [...current, value]
      return { ...prev, specificMulti: { ...prev.specificMulti, [key]: next } }
    })

  const togglePayment = (p: string) =>
    set('payments', data.payments.includes(p)
      ? data.payments.filter(x => x !== p)
      : [...data.payments, p])

  const setFaq = (i: number, field: 'question' | 'answer', value: string) => {
    const faqs = [...data.faqs]
    faqs[i] = { ...faqs[i], [field]: value }
    set('faqs', faqs)
  }

  const addFaq = () => {
    if (data.faqs.length < 5) set('faqs', [...data.faqs, { question: '', answer: '' }])
  }

  const finish = async () => {
    const prompt = buildPrompt(data)
    if (businessId) {
      setSaving(true)
      const supabase = createClient()
      const updates: Record<string, unknown> = { ai_prompt: prompt }
      if (data.escalationContact.trim()) {
        updates.escalation_contact = data.escalationContact.trim()
        // Auto-agregar contacto a excluidos para que el bot no le responda
        const { data: biz } = await supabase.from('businesses').select('excluded_numbers').eq('id', businessId).single()
        const existing: string[] = biz?.excluded_numbers ?? []
        const phone = data.escalationContact.replace(/\D/g, '')
        if (phone && !existing.includes(phone)) {
          updates.excluded_numbers = [...existing, phone]
        }
      }
      await supabase.from('businesses').update(updates).eq('id', businessId)
      setSaving(false)
    }
    onSaved(prompt)
    onClose()
  }

  const inp = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all bg-white'
  const lbl = 'block text-sm font-semibold text-gray-700 mb-2'
  const ta  = `${inp} resize-none`

  const fields = RUBRO_FIELDS[data.rubro] ?? []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-indigo-500" />
            <span className="font-bold text-gray-900">Configurar con asistente</span>
            <span className="text-sm text-gray-400 ml-1">Paso {step} de {TOTAL_STEPS}</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-100 shrink-0">
          <div
            className="h-full bg-indigo-500 transition-all duration-300"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* STEP 1 — Rubro */}
          {step === 1 && (
            <>
              <h2 className="font-bold text-gray-900 text-lg">¿A qué se dedica tu negocio?</h2>
              <div className="space-y-4">
                {RUBRO_CATEGORIES.map(cat => (
                  <div key={cat.label}>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{cat.label}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {cat.keys.map(key => {
                        const { label, Icon } = RUBRO_MAP[key]
                        return (
                          <button
                            key={key}
                            onClick={() => { set('rubro', key); setStep(2) }}
                            className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 text-center transition-all text-sm font-medium
                              ${data.rubro === key
                                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                : 'border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/50 text-gray-700'}`}
                          >
                            <Icon className="w-6 h-6" />
                            {label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* STEP 2 — Perfil del bot */}
          {step === 2 && (
            <>
              <h2 className="font-bold text-gray-900 text-lg">¿Cuál es el propósito del bot?</h2>
              <p className="text-sm text-gray-500">Podés elegir uno o varios perfiles. El bot combinará los objetivos seleccionados.</p>
              <div className="flex flex-wrap gap-2">
                {BOT_PROFILES.map(profile => {
                  const Icon = profile.Icon
                  const selected = (data.botProfiles ?? []).includes(profile.key)
                  return (
                    <button
                      key={profile.key}
                      type="button"
                      onClick={() => {
                        const current = data.botProfiles ?? []
                        set('botProfiles', selected
                          ? current.filter(k => k !== profile.key)
                          : [...current, profile.key])
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 text-sm font-semibold transition-all
                        ${selected
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-indigo-300 hover:bg-indigo-50/40'}`}
                    >
                      <Icon className="w-4 h-4" />
                      {profile.label}
                    </button>
                  )
                })}
              </div>
              {(data.botProfiles ?? []).length > 0 && (
                <div className="space-y-2 pt-2">
                  {(data.botProfiles ?? []).map(k => {
                    const p = BOT_PROFILES.find(x => x.key === k)
                    if (!p) return null
                    return (
                      <div key={k} className="text-sm text-gray-600 bg-gray-50 rounded-xl px-4 py-2">
                        <span className="font-semibold text-gray-800">{p.label}:</span> {p.description}
                      </div>
                    )
                  })}
                </div>
              )}
              {(data.botProfiles ?? []).length === 0 && (
                <p className="text-sm text-amber-600">Seleccioná al menos un perfil para continuar.</p>
              )}
            </>
          )}

          {/* STEP 3 — Identidad */}
          {step === 3 && (
            <>
              <h2 className="font-bold text-gray-900 text-lg">Identidad del negocio</h2>
              <div>
                <label className={lbl}>Nombre del negocio</label>
                <input className={inp} value={data.businessName} onChange={e => set('businessName', e.target.value)} placeholder="Ej: Tienda Norte, Centro Vital, Servicios Sol" />
              </div>
              <div>
                <label className={lbl}>Nombre del responsable que habla</label>
                <input className={inp} value={data.contactName} onChange={e => set('contactName', e.target.value)} placeholder="Ej: Laura, Marcos, El equipo" />
              </div>
              <div>
                <label className={lbl}>Tono de respuesta</label>
                <select className={inp} value={data.tone} onChange={e => set('tone', e.target.value)}>
                  {TONES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>¿En qué canales va a responder el bot?</label>
                <p className="text-xs text-gray-400 mb-2">El bot usa la misma información en todos los canales, adaptando el estilo a cada uno.</p>
                <div className="flex flex-wrap gap-2">
                  {CHANNEL_OPTIONS.map(ch => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => {
                        const cur = data.mainChannels ?? []
                        set('mainChannels', cur.includes(ch) ? cur.filter(x => x !== ch) : [...cur, ch])
                      }}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all
                        ${(data.mainChannels ?? []).includes(ch)
                          ? 'bg-indigo-500 text-white border-indigo-500'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* STEP 4 — Info básica */}
          {step === 4 && (
            <>
              <h2 className="font-bold text-gray-900 text-lg">Información básica</h2>
              <div>
                <label className={lbl}>Dirección / zona</label>
                <input className={inp} value={data.address} onChange={e => set('address', e.target.value)} placeholder="Ej: Belgrano, CABA — Av. Cabildo 1234" />
              </div>
              <div>
                <label className={lbl}>Horario de atención</label>
                <input className={inp} value={data.hours} onChange={e => set('hours', e.target.value)} placeholder="Ej: Lunes a sábados de 11 a 20hs" />
              </div>
              <div>
                <label className={lbl}>Métodos de pago</label>
                <div className="flex flex-wrap gap-2">
                  {PAYMENT_OPTIONS.map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => togglePayment(p)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all
                        ${data.payments.includes(p)
                          ? 'bg-indigo-500 text-white border-indigo-500'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={lbl}>Link web o catálogo <span className="text-gray-400 font-normal">(opcional)</span></label>
                <input className={inp} value={data.websiteLink} onChange={e => set('websiteLink', e.target.value)} placeholder="https://..." />
              </div>
              <div>
                <label className={lbl}>Link de turnos / reservas <span className="text-gray-400 font-normal">(opcional)</span></label>
                <p className="text-xs text-gray-400 mb-2">Ej: Booksy, Calendly, Turnify, WhatsApp link, etc.</p>
                <input className={inp} value={data.bookingLink} onChange={e => set('bookingLink', e.target.value)} placeholder="https://booksy.com/..." />
              </div>
            </>
          )}

          {/* STEP 5 — Servicios del rubro */}
          {step === 5 && (
            <>
              <h2 className="font-bold text-gray-900 text-lg">Servicios y precios</h2>
              {fields.map(f => {
                if (f.type === 'conditional_text') {
                  const condVal = data.specific[f.condition_key]
                  if (condVal !== f.condition_value) return null
                  return (
                    <div key={f.key}>
                      <label className={lbl}>{f.label}</label>
                      <input className={inp} value={data.specific[f.key] ?? ''} onChange={e => setSpecific(f.key, e.target.value)} placeholder={f.placeholder} />
                    </div>
                  )
                }
                if (f.type === 'pills') {
                  const selected = data.specificMulti[f.key] ?? []
                  return (
                    <div key={f.key}>
                      <label className={lbl}>{f.label}</label>
                      <div className="flex flex-wrap gap-2">
                        {f.options.map(o => (
                          <button
                            key={o}
                            type="button"
                            onClick={() => toggleSpecificMulti(f.key, o)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all
                              ${selected.includes(o)
                                ? 'bg-indigo-500 text-white border-indigo-500'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}
                          >
                            {o}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                }
                return (
                  <div key={f.key}>
                    <label className={lbl}>{f.label}</label>
                    {f.type === 'textarea' && (
                      <textarea className={ta} rows={3} value={data.specific[f.key] ?? ''} onChange={e => setSpecific(f.key, e.target.value)} placeholder={f.placeholder} />
                    )}
                    {f.type === 'text' && (
                      <input className={inp} value={data.specific[f.key] ?? ''} onChange={e => setSpecific(f.key, e.target.value)} placeholder={f.placeholder} />
                    )}
                    {f.type === 'select' && (
                      <select className={inp} value={data.specific[f.key] ?? (f.options[0] ?? '')} onChange={e => setSpecific(f.key, e.target.value)}>
                        {f.options.map(o => <option key={o}>{o}</option>)}
                      </select>
                    )}
                  </div>
                )
              })}
            </>
          )}

          {/* STEP 6 — Reglas y límites */}
          {step === 6 && (
            <>
              <h2 className="font-bold text-gray-900 text-lg">Reglas y límites</h2>
              <div>
                <label className={lbl}>¿Qué NO puede hacer o resolver el bot?</label>
                <textarea className={ta} rows={3} value={data.botLimits} onChange={e => set('botLimits', e.target.value)} placeholder="Ej: No dar diagnósticos, no cotizar sin ver el trabajo..." />
              </div>
              <div>
                <label className={lbl}>Tu número / email de contacto para derivaciones <span className="text-gray-400 font-normal">(opcional)</span></label>
                <p className="text-xs text-gray-400 mb-2">
                  Si lo completás: cuando el bot no pueda resolver, avisa que alguien del equipo responde y se queda esperando.<br/>
                  Si no lo completás: el bot deja de responder esa conversación y la marca como pendiente en el tablero para que lo atiendas vos.
                  <br/>Este número también se agrega automáticamente a excluidos para que el bot no te responda a vos.
                </p>
                <input className={inp} value={data.escalationContact} onChange={e => set('escalationContact', e.target.value)} placeholder="Ej: 5491112345678 o contacto@negocio.com" />
              </div>
              <div>
                <label className={lbl}>¿Hay info extra importante que siempre hay que mencionar? <span className="text-gray-400 font-normal">(opcional)</span></label>
                <textarea className={ta} rows={2} value={data.extraInfo} onChange={e => set('extraInfo', e.target.value)} placeholder="Ej: Estamos cerrados en enero, solo atendemos con turno, etc." />
              </div>
            </>
          )}

          {/* STEP 7 — Preguntas frecuentes */}
          {step === 7 && (
            <>
              <h2 className="font-bold text-gray-900 text-lg">Preguntas frecuentes</h2>
              <p className="text-sm text-gray-500">Hasta 5 pares pregunta → respuesta que el bot va a conocer.</p>
              {data.faqs.map((faq, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-2">
                  <input
                    className={inp}
                    value={faq.question}
                    onChange={e => setFaq(i, 'question', e.target.value)}
                    placeholder={`Pregunta ${i + 1} (ej: ¿Cuáles son los horarios?)`}
                  />
                  <input
                    className={inp}
                    value={faq.answer}
                    onChange={e => setFaq(i, 'answer', e.target.value)}
                    placeholder="Respuesta corta (ej: Lunes a viernes de 9 a 18hs)"
                  />
                </div>
              ))}
              {data.faqs.length < 5 && (
                <button
                  type="button"
                  onClick={addFaq}
                  className="text-sm text-indigo-600 font-medium hover:text-indigo-800 transition-colors"
                >
                  + Agregar pregunta
                </button>
              )}
            </>
          )}

          {/* STEP 8 — Estilo de respuesta */}
          {step === 8 && (
            <>
              <h2 className="font-bold text-gray-900 text-lg">Estilo de respuesta</h2>
              <p className="text-sm text-gray-500">Elegí qué tan largas querés las respuestas del bot.</p>
              <div className="space-y-3">
                {STYLE_OPTIONS.map(opt => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => set('responseStyle', opt.key)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all
                      ${data.responseStyle === opt.key
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30'}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-gray-900">{opt.label}</span>
                      <span className="text-xs text-gray-400">{opt.tokens} tokens</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{opt.desc}</p>
                    <p className="text-xs text-gray-500 italic">{opt.example}</p>
                  </button>
                ))}
              </div>
            </>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 shrink-0 gap-3">
          <button
            onClick={() => setStep(s => s - 1)}
            disabled={step === 1}
            className="flex items-center gap-1 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Anterior
          </button>

          {step < TOTAL_STEPS ? (
            step !== 1 ? (
              <button
                onClick={() => setStep(s => s + 1)}
                className="btn-primary flex items-center gap-1"
              >
                Siguiente <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <span className="text-sm text-gray-400">Seleccioná un rubro para continuar</span>
            )
          ) : (
            <button
              onClick={finish}
              disabled={saving}
              className="btn-primary flex items-center gap-2"
            >
              {saving
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                : <><Wand2 className="w-4 h-4" /> Guardar configuración</>}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
