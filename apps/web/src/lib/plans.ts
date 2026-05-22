export type PlanTier = 'whatsapp' | 'email' | 'social'
export type ChannelId = 'whatsapp' | 'whatsapp_api' | 'webchat' | 'email' | 'telegram' | 'instagram' | 'facebook'

export const PLAN_ORDER: PlanTier[] = ['whatsapp', 'email', 'social']

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
  },
  email: {
    name: 'Mails',
    priceLabel: '$69.000/mes',
    firstMonthLabel: '$69.000 primer mes',
    publicLabel: 'Desde $69.000 / mes',
    description: 'Para clasificar correos y preparar respuestas sin enviar automaticamente.',
    channels: ['email'],
    features: ['Gmail / Outlook / iCloud', 'Clasificacion de correos', 'Borradores sugeridos', 'Reglas de prioridad', 'Alertas de correos importantes'],
    limit: 'Hasta 300 correos procesados por mes',
    users: '1 usuario administrador',
  },
  social: {
    name: 'Completo',
    priceLabel: '$129.000/mes',
    firstMonthLabel: '$89.000 primer mes',
    publicLabel: 'Desde $129.000 / mes',
    badge: 'Mas completo',
    description: 'WhatsApp, Web Chat, redes sociales, mails y CRM simple en un solo panel.',
    channels: ['whatsapp', 'whatsapp_api', 'webchat', 'email', 'telegram', 'instagram', 'facebook'],
    features: ['Todo lo del basico', 'WhatsApp Business API', 'Gmail / Outlook / iCloud', 'Instagram Direct', 'Facebook Messenger', 'CRM simple incluido'],
    limit: 'Hasta 1.000 respuestas asistidas por mes',
    users: '2 usuarios',
  },
}

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
  if (plan === 'email' || plan === 'social') return plan
  if (plan === 'crm' || plan === 'full' || plan === 'premium' || plan === 'omnichannel') return 'social'
  return 'whatsapp'
}

export function planAllows(plan: PlanTier, channel: ChannelId) {
  return PLANS[plan].channels.includes(channel)
}
