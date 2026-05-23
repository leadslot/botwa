export type PlanTier = 'whatsapp' | 'email' | 'social' | 'gold'
export type ChannelId = 'whatsapp' | 'whatsapp_api' | 'webchat' | 'email' | 'telegram' | 'instagram' | 'facebook'

export const PLAN_ORDER: PlanTier[] = ['whatsapp', 'email', 'social', 'gold']

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
    name: 'Basico WhatsApp',
    priceLabel: '$79.000/mes',
    firstMonthLabel: '$49.000 primer mes',
    publicLabel: 'Desde $79.000 / mes',
    description: 'Para negocios chicos que quieren responder rapido WhatsApp y Web Chat.',
    channels: ['whatsapp', 'webchat'],
    features: ['WhatsApp conectado por QR', 'Web Chat', 'Panel de conversaciones', 'Prompt del negocio', 'Lista de precios y FAQ', 'Pausa del bot por canal'],
    limit: 'Hasta 500 respuestas asistidas por mes',
    users: '1 usuario administrador',
    monthlyPrice: 79000,
    firstMonthPrice: 49000,
    monthlyResponses: 500,
    monthlyEmails: 0,
    agendaIncluded: false,
  },
  email: {
    name: 'Mails',
    priceLabel: '$69.000/mes',
    firstMonthLabel: '$49.000 primer mes',
    publicLabel: 'Desde $69.000 / mes',
    description: 'Para clasificar correos y preparar respuestas sin enviar automaticamente.',
    channels: ['email'],
    features: ['Gmail / Outlook / iCloud', 'Clasificacion de correos', 'Borradores sugeridos', 'Reglas de prioridad', 'Alertas de correos importantes'],
    limit: 'Hasta 300 correos procesados por mes',
    users: '1 usuario administrador',
    monthlyPrice: 69000,
    firstMonthPrice: 49000,
    monthlyResponses: 0,
    monthlyEmails: 300,
    agendaIncluded: false,
  },
  social: {
    name: 'Completo',
    priceLabel: '$149.000/mes',
    firstMonthLabel: '$119.000 primer mes',
    publicLabel: 'Desde $149.000 / mes',
    badge: 'Mas completo',
    description: 'WhatsApp, Web Chat, redes sociales, mails y CRM simple en un solo panel.',
    channels: ['whatsapp', 'whatsapp_api', 'webchat', 'email', 'telegram', 'instagram', 'facebook'],
    features: ['Todo lo del basico', 'WhatsApp Business API', 'Gmail / Outlook / iCloud', 'Instagram Direct', 'Facebook Messenger', 'CRM simple incluido'],
    limit: '1.000 respuestas asistidas + 300 correos por mes',
    users: '2 usuarios',
    monthlyPrice: 149000,
    firstMonthPrice: 119000,
    monthlyResponses: 1000,
    monthlyEmails: 300,
    agendaIncluded: false,
  },
  gold: {
    name: 'Gold Agenda',
    priceLabel: '$199.000/mes',
    firstMonthLabel: '$159.000 primer mes',
    publicLabel: 'Desde $199.000 / mes',
    badge: 'Con agenda',
    description: 'Todo lo del Completo mas agenda de turnos, confirmaciones y recordatorios.',
    channels: ['whatsapp', 'whatsapp_api', 'webchat', 'email', 'telegram', 'instagram', 'facebook'],
    features: ['Todo lo del Completo', 'Agenda de turnos', 'Confirmaciones automaticas', 'Recordatorios', 'Reglas por servicio y disponibilidad'],
    limit: '1.500 respuestas asistidas + 500 correos por mes',
    users: '2 usuarios',
    monthlyPrice: 199000,
    firstMonthPrice: 159000,
    monthlyResponses: 1500,
    monthlyEmails: 500,
    agendaIncluded: true,
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
