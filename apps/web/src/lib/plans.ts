export type PlanTier = 'whatsapp' | 'email' | 'social' | 'gold'
export type ChannelId = 'whatsapp' | 'whatsapp_api' | 'webchat' | 'email' | 'telegram' | 'instagram' | 'facebook' | 'calendar_google' | 'gmail'

export const PLAN_ORDER: PlanTier[] = ['whatsapp', 'email', 'social', 'gold']

// Canales deshabilitados — no funcionales aún, se ocultan en la UI
export const HIDDEN_CHANNELS: ChannelId[] = ['whatsapp_api', 'instagram', 'facebook', 'calendar_google', 'gmail']

export const PLANS: Record<PlanTier, {
  name: string
  priceLabel: string
  firstMonthLabel: string
  publicLabel: string
  badge?: string
  description: string
  channels: ChannelId[]
  features: string[]
  limit: string
  users: string
  monthlyPrice: number
  firstMonthPrice: number
  monthlyResponses: number
  monthlyEmails: number
  agendaIncluded: boolean
}> = {
  whatsapp: {
    name: 'WhatsApp QR',
    priceLabel: '$79.000/mes',
    firstMonthLabel: '$49.000 primer mes',
    publicLabel: 'Desde $79.000 / mes',
    description: 'Bot de WhatsApp por QR: responde automaticamente, con prompt, precios y CRM basico.',
    channels: ['whatsapp', 'webchat'],
    features: [
      'WhatsApp conectado por QR',
      'Web Chat incluido',
      'Prompt del negocio personalizado',
      'Lista de precios y FAQ',
      'Contactos excluidos (pausa por numero)',
      'CRM basico: historial de conversaciones',
      'Panel de conversaciones',
      'Pausa del bot por canal',
    ],
    limit: 'Hasta 500 respuestas asistidas por mes',
    users: '1 usuario administrador',
    monthlyPrice: 79000,
    firstMonthPrice: 49000,
    monthlyResponses: 500,
    monthlyEmails: 0,
    agendaIncluded: false,
  },
  email: {
    name: 'WhatsApp QR + Mail',
    priceLabel: '$119.000/mes',
    firstMonthLabel: '$89.000 primer mes',
    publicLabel: 'Desde $119.000 / mes',
    badge: 'Mas popular',
    description: 'WhatsApp QR y correos por IMAP/SMTP: atiende WhatsApp y clasifica mails con borradores.',
    channels: ['whatsapp', 'webchat', 'email'],
    features: [
      'Todo lo del plan WhatsApp QR',
      'Mail por IMAP/SMTP (usuario + contraseña)',
      'Compatible con cualquier casilla de correo',
      'Clasificacion automatica de correos',
      'Borradores sugeridos antes de enviar',
      'Plantillas de respuesta',
      'Alertas de correos prioritarios',
    ],
    limit: '500 respuestas WhatsApp + 300 correos por mes',
    users: '1 usuario administrador',
    monthlyPrice: 119000,
    firstMonthPrice: 89000,
    monthlyResponses: 500,
    monthlyEmails: 300,
    agendaIncluded: false,
  },
  social: {
    name: 'Multicanal',
    priceLabel: '$149.000/mes',
    firstMonthLabel: '$119.000 primer mes',
    publicLabel: 'Desde $149.000 / mes',
    badge: 'Beta',
    description: 'WhatsApp, Telegram y Web Chat en un solo panel. Mas canales, mismo bot.',
    channels: ['whatsapp', 'webchat', 'email', 'telegram'],
    features: [
      'Todo lo del plan WhatsApp QR + Mail',
      'Telegram por bot propio (BotFather)',
      'Un solo panel para todos los canales',
      'CRM unificado entre canales',
    ],
    limit: '1.000 respuestas asistidas + 300 correos por mes',
    users: '2 usuarios',
    monthlyPrice: 149000,
    firstMonthPrice: 119000,
    monthlyResponses: 1000,
    monthlyEmails: 300,
    agendaIncluded: false,
  },
  gold: {
    // Plan legacy — usuarios existentes en Gold acceden a los mismos canales que Multicanal
    name: 'Multicanal',
    priceLabel: '$149.000/mes',
    firstMonthLabel: '$119.000 primer mes',
    publicLabel: 'Desde $149.000 / mes',
    badge: 'Beta',
    description: 'WhatsApp, Telegram y Web Chat en un solo panel.',
    channels: ['whatsapp', 'webchat', 'email', 'telegram'],
    features: [
      'Todo lo del plan WhatsApp QR + Mail',
      'Telegram por bot propio (BotFather)',
      'Un solo panel para todos los canales',
      'CRM unificado entre canales',
    ],
    limit: '1.500 respuestas asistidas + 500 correos por mes',
    users: '2 usuarios',
    monthlyPrice: 149000,
    firstMonthPrice: 119000,
    monthlyResponses: 1500,
    monthlyEmails: 500,
    agendaIncluded: false,
  },
}

export const ADDON_CATALOG = [
  { type: 'responses_500',  label: '+500 respuestas asistidas',   responsesAdded: 500,  emailsAdded: 0,   price: 29000 },
  { type: 'responses_1000', label: '+1.000 respuestas asistidas', responsesAdded: 1000, emailsAdded: 0,   price: 49000 },
  { type: 'emails_300',     label: '+300 correos procesados',     responsesAdded: 0,    emailsAdded: 300, price: 19000 },
  { type: 'emails_600',     label: '+600 correos procesados',     responsesAdded: 0,    emailsAdded: 600, price: 35000 },
  { type: 'agenda',         label: 'Agenda/calendario adicional', responsesAdded: 0,    emailsAdded: 0,   price: 25000 },
  { type: 'reminders',      label: 'Recordatorios por WhatsApp',  responsesAdded: 0,    emailsAdded: 0,   price: 29000 },
] as const

export type AddonType = typeof ADDON_CATALOG[number]['type']

export const CHANNELS: Record<ChannelId, {
  name: string
  shortName: string
  description: string
  requiredPlan: PlanTier
  status: 'ready' | 'beta' | 'meta_pending' | 'planned'
}> = {
  whatsapp: {
    name: 'WhatsApp',
    shortName: 'WhatsApp QR',
    description: 'Conexion economica por QR para responder entrantes.',
    requiredPlan: 'whatsapp',
    status: 'ready',
  },
  whatsapp_api: {
    name: 'WhatsApp Business API',
    shortName: 'WhatsApp API',
    description: 'Canal oficial de Meta. Requiere habilitacion del proveedor (Responbot) con Meta.',
    requiredPlan: 'social',
    status: 'meta_pending',
  },
  webchat: {
    name: 'Web Chat',
    shortName: 'Web Chat',
    description: 'Chat para instalar en tu sitio web.',
    requiredPlan: 'whatsapp',
    status: 'ready',
  },
  email: {
    name: 'Email',
    shortName: 'Email',
    description: 'Gmail, Outlook e iCloud para clasificar y responder correos.',
    requiredPlan: 'email',
    status: 'ready',
  },
  telegram: {
    name: 'Telegram',
    shortName: 'Telegram',
    description: 'Cada negocio conecta su bot de BotFather.',
    requiredPlan: 'social',
    status: 'ready',
  },
  instagram: {
    name: 'Instagram Direct',
    shortName: 'Instagram',
    description: 'Requiere integracion oficial de Meta.',
    requiredPlan: 'social',
    status: 'meta_pending',
  },
  facebook: {
    name: 'Facebook Messenger',
    shortName: 'Facebook',
    description: 'Requiere pagina y permisos oficiales de Meta.',
    requiredPlan: 'social',
    status: 'meta_pending',
  },
  calendar_google: {
    name: 'Google Calendar',
    shortName: 'Google Calendar',
    description: 'Agenda automatica: el bot verifica disponibilidad y crea turnos.',
    requiredPlan: 'gold',
    status: 'ready',
  },
  gmail: {
    name: 'Gmail',
    shortName: 'Gmail',
    description: 'Clasificar correos entrantes y generar respuestas automaticas.',
    requiredPlan: 'gold',
    status: 'ready',
  },
}

export function normalizePlan(plan?: string | null): PlanTier {
  if (plan === 'email' || plan === 'social' || plan === 'gold') return plan
  if (plan === 'crm' || plan === 'full' || plan === 'premium' || plan === 'omnichannel') return 'social'
  return 'whatsapp'
}

export function planAllows(plan: PlanTier, channel: ChannelId) {
  return PLANS[plan].channels.includes(channel)
}

export function getUsageStatus(used: number, limit: number): 'normal' | 'warning' | 'limit' {
  if (limit === 0) return 'normal'
  const pct = used / limit
  if (pct >= 1) return 'limit'
  if (pct >= 0.8) return 'warning'
  return 'normal'
}

export function getTotalLimit(planTier: PlanTier, extraResponses: number, extraEmails: number, bonusResponses = 0, bonusEmails = 0) {
  const plan = PLANS[planTier]
  return {
    responses: plan.monthlyResponses + extraResponses + bonusResponses,
    emails: plan.monthlyEmails + extraEmails + bonusEmails,
  }
}
