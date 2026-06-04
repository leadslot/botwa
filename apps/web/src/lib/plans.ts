export type PlanTier = 'whatsapp' | 'email' | 'social' | 'gold'
export type ChannelId =
  | 'whatsapp'
  | 'whatsapp_api'
  | 'webchat'
  | 'email'
  | 'telegram'
  | 'instagram'
  | 'facebook'
  | 'calendar_google'
  | 'gmail'
  | 'mercadopago'

export const PLAN_ORDER: PlanTier[] = ['whatsapp', 'email', 'social', 'gold']

export const HIDDEN_CHANNELS: ChannelId[] = [
  'whatsapp_api',
  'webchat',
  'email',
  'instagram',
  'facebook',
  'calendar_google',
  'gmail',
  'mercadopago',
]

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
    badge: 'Entrada recomendada',
    description: 'Bot de WhatsApp por QR para responder consultas entrantes con la informacion de tu negocio.',
    channels: ['whatsapp'],
    features: [
      'WhatsApp conectado por QR',
      'Panel de conversaciones',
      'Prompt del negocio',
      'Lista de precios y FAQ',
      'Pausa del bot',
      'Hasta 7.500 respuestas asistidas por mes',
      '1 usuario administrador',
    ],
    limit: 'Hasta 7.500 respuestas asistidas por mes',
    users: '1 usuario administrador',
    monthlyPrice: 79000,
    firstMonthPrice: 49000,
    monthlyResponses: 7500,
    monthlyEmails: 0,
    agendaIncluded: false,
  },
  email: {
    name: 'WhatsApp + Telegram',
    priceLabel: '$129.000/mes',
    firstMonthLabel: '$89.000 primer mes',
    publicLabel: 'Desde $129.000 / mes',
    badge: 'Mas simple para multicanal',
    description: 'WhatsApp por QR y Telegram en un mismo panel, con pausa independiente por canal.',
    channels: ['whatsapp', 'telegram'],
    features: [
      'Todo lo del Basico WhatsApp',
      'Telegram con token de BotFather',
      'Panel unificado WhatsApp + Telegram',
      'Pausa independiente por canal',
      'Hasta 7.500 respuestas asistidas por mes',
      '2 usuarios',
    ],
    limit: 'Hasta 7.500 respuestas asistidas por mes',
    users: '2 usuarios',
    monthlyPrice: 129000,
    firstMonthPrice: 89000,
    monthlyResponses: 7500,
    monthlyEmails: 0,
    agendaIncluded: false,
  },
  social: {
    name: 'WhatsApp + Telegram',
    priceLabel: '$129.000/mes',
    firstMonthLabel: '$89.000 primer mes',
    publicLabel: 'Desde $129.000 / mes',
    badge: 'Plan legacy',
    description: 'Plan legacy mapeado a WhatsApp por QR y Telegram.',
    channels: ['whatsapp', 'telegram'],
    features: [
      'WhatsApp conectado por QR',
      'Telegram con token de BotFather',
      'Panel unificado',
      'Pausa por canal',
      'Hasta 7.500 respuestas asistidas por mes',
      '2 usuarios',
    ],
    limit: 'Hasta 7.500 respuestas asistidas por mes',
    users: '2 usuarios',
    monthlyPrice: 129000,
    firstMonthPrice: 89000,
    monthlyResponses: 7500,
    monthlyEmails: 0,
    agendaIncluded: false,
  },
  gold: {
    name: 'WhatsApp + Telegram',
    priceLabel: '$129.000/mes',
    firstMonthLabel: '$89.000 primer mes',
    publicLabel: 'Desde $129.000 / mes',
    badge: 'Acceso actual',
    description: 'Plan legacy mapeado a WhatsApp por QR y Telegram.',
    channels: ['whatsapp', 'telegram'],
    features: [
      'WhatsApp conectado por QR',
      'Telegram con token de BotFather',
      'Panel unificado',
      'Pausa por canal',
      'Hasta 7.500 respuestas asistidas por mes',
      '2 usuarios',
    ],
    limit: 'Hasta 7.500 respuestas asistidas por mes',
    users: '2 usuarios',
    monthlyPrice: 129000,
    firstMonthPrice: 89000,
    monthlyResponses: 7500,
    monthlyEmails: 0,
    agendaIncluded: false,
  },
}

export const ADDON_CATALOG = [
  { type: 'responses_5000', label: '+5.000 respuestas asistidas', responsesAdded: 5000, emailsAdded: 0, price: 29000 },
  { type: 'responses_10000', label: '+10.000 respuestas asistidas', responsesAdded: 10000, emailsAdded: 0, price: 49000 },
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
    description: 'Conexion por QR para responder mensajes entrantes.',
    requiredPlan: 'whatsapp',
    status: 'ready',
  },
  telegram: {
    name: 'Telegram',
    shortName: 'Telegram',
    description: 'Cada negocio conecta su bot de BotFather.',
    requiredPlan: 'email',
    status: 'ready',
  },
  whatsapp_api: {
    name: 'WhatsApp Business API',
    shortName: 'WhatsApp API',
    description: 'Canal no disponible en la oferta actual.',
    requiredPlan: 'gold',
    status: 'planned',
  },
  webchat: {
    name: 'Web Chat',
    shortName: 'Web Chat',
    description: 'Canal no disponible en la oferta actual.',
    requiredPlan: 'gold',
    status: 'planned',
  },
  email: {
    name: 'Email',
    shortName: 'Email',
    description: 'Canal no disponible en la oferta actual.',
    requiredPlan: 'gold',
    status: 'planned',
  },
  instagram: {
    name: 'Instagram Direct',
    shortName: 'Instagram',
    description: 'Canal no disponible en la oferta actual.',
    requiredPlan: 'gold',
    status: 'planned',
  },
  facebook: {
    name: 'Facebook Messenger',
    shortName: 'Facebook',
    description: 'Canal no disponible en la oferta actual.',
    requiredPlan: 'gold',
    status: 'planned',
  },
  calendar_google: {
    name: 'Google Calendar',
    shortName: 'Google Calendar',
    description: 'Canal no disponible en la oferta actual.',
    requiredPlan: 'gold',
    status: 'planned',
  },
  gmail: {
    name: 'Gmail',
    shortName: 'Gmail',
    description: 'Canal no disponible en la oferta actual.',
    requiredPlan: 'gold',
    status: 'planned',
  },
  mercadopago: {
    name: 'Mercado Pago',
    shortName: 'Mercado Pago',
    description: 'Canal no disponible en la oferta actual.',
    requiredPlan: 'gold',
    status: 'planned',
  },
}

export function normalizePlan(plan?: string | null): PlanTier {
  if (plan === 'email' || plan === 'social' || plan === 'gold') return plan
  if (plan === 'crm' || plan === 'full' || plan === 'premium' || plan === 'omnichannel') return 'email'
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
