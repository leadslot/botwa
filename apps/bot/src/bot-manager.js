import makeWASocket, {
  DisconnectReason,
  initAuthCreds,
  BufferJSON,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
  proto,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import { createClient } from '@supabase/supabase-js'
import QRCode from 'qrcode'
import { generateAIResponse } from './ai.js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// ─── Supabase-backed auth state (persiste credenciales aunque Railway se reinicie)
async function useSupabaseAuthState(businessId) {
  const read = async () => {
    const { data } = await supabase
      .from('whatsapp_sessions')
      .select('session_data')
      .eq('business_id', businessId)
      .single()
    if (!data?.session_data) return null
    try { return JSON.parse(JSON.stringify(data.session_data), BufferJSON.reviver) } catch { return null }
  }

  const write = async (creds, keys) => {
    const payload = JSON.parse(JSON.stringify({ creds, keys }, BufferJSON.replacer))
    await supabase.from('whatsapp_sessions')
      .upsert({ business_id: businessId, session_data: payload }, { onConflict: 'business_id' })
  }

  const stored = await read()
  const creds = stored?.creds || initAuthCreds()
  const keys  = stored?.keys  || {}

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const result = {}
          for (const id of ids) {
            let val = keys[type]?.[id]
            if (val) {
              if (type === 'app-state-sync-key') {
                val = proto.Message.AppStateSyncKeyData.fromObject(val)
              }
              result[id] = val
            }
          }
          return result
        },
        set: async (data) => {
          for (const category in data) {
            keys[category] = keys[category] || {}
            for (const id in data[category]) {
              if (data[category][id]) keys[category][id] = data[category][id]
              else delete keys[category][id]
            }
          }
          await write(creds, keys)
        }
      }
    },
    saveCreds: () => write(creds, keys),
  }
}

// Mapa de sesiones activas en memoria: businessId -> socket
const activeSessions = new Map()
// Mapa de QR pendientes: businessId -> qrBase64
const pendingQRs = new Map()
// Contactos por sesión: businessId -> Map<jid, {name, number}>
const contactsCache = new Map()

export const botManager = {

  async startSession(businessId) {
    if (activeSessions.has(businessId)) {
      return { status: 'already_connected' }
    }

    const { state, saveCreds } = await useSupabaseAuthState(businessId)
    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, undefined),
      },
      printQRInTerminal: false,
      logger: { level: 'silent', trace: ()=>{}, debug: ()=>{}, info: ()=>{}, warn: console.warn, error: console.error, fatal: console.error, child: ()=>({ level:'silent', trace:()=>{}, debug:()=>{}, info:()=>{}, warn:()=>{}, error:()=>{}, fatal:()=>{}, child:()=>{} }) },
      browser: ['BotWA', 'Chrome', '1.0.0'],
    })

    sock.ev.on('creds.update', saveCreds)

    // Acumular contactos en cache (precargados desde Supabase si existen)
    if (!contactsCache.has(businessId)) {
      contactsCache.set(businessId, new Map())
      // Cargar contactos persistidos de arranques anteriores
      try {
        const { data } = await supabase
          .from('whatsapp_sessions').select('contacts_data').eq('business_id', businessId).single()
        if (data?.contacts_data?.length) {
          for (const c of data.contacts_data) {
            contactsCache.get(businessId).set(c.number, c)
          }
          console.log(`[${businessId}] Contactos cargados desde Supabase: ${data.contacts_data.length}`)
        }
      } catch {}
    }
    const contacts = contactsCache.get(businessId)

    // Guarda contactos en Supabase después de actualizaciones (debounced 10s)
    let saveContactsTimer = null
    const scheduleContactsSave = () => {
      clearTimeout(saveContactsTimer)
      saveContactsTimer = setTimeout(async () => {
        const list = Array.from(contacts.values())
        await supabase.from('whatsapp_sessions')
          .upsert({ business_id: businessId, contacts_data: list }, { onConflict: 'business_id' })
        console.log(`[${businessId}] Contactos guardados en Supabase: ${list.length}`)
      }, 10000)
    }

    sock.ev.on('contacts.upsert', (newContacts) => {
      let changed = false
      for (const c of newContacts) {
        if (!c.id.endsWith('@s.whatsapp.net')) continue
        const number = c.id.replace('@s.whatsapp.net', '')
        const name = c.name || c.notify || c.verifiedName || ''
        if (name || !contacts.has(number)) {
          contacts.set(number, { number, name })
          changed = true
        }
      }
      if (changed) scheduleContactsSave()
    })

    sock.ev.on('contacts.update', (updates) => {
      let changed = false
      for (const c of updates) {
        if (!c.id?.endsWith('@s.whatsapp.net')) continue
        const number = c.id.replace('@s.whatsapp.net', '')
        const existing = contacts.get(number) || { number, name: '' }
        const name = c.name || c.notify || existing.name
        contacts.set(number, { ...existing, name })
        changed = true
      }
      if (changed) scheduleContactsSave()
    })

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update

      if (qr) {
        const qrBase64 = await QRCode.toDataURL(qr)
        pendingQRs.set(businessId, qrBase64)
        // Guardar QR en Supabase para que el panel lo muestre
        await supabase
          .from('whatsapp_sessions')
          .upsert({ business_id: businessId, qr_code: qrBase64, status: 'waiting_qr' })
      }

      if (connection === 'open') {
        activeSessions.set(businessId, sock)
        pendingQRs.delete(businessId)
        await supabase
          .from('whatsapp_sessions')
          .upsert({ business_id: businessId, status: 'connected', qr_code: null })
        console.log(`[${businessId}] WhatsApp conectado`)
        // Request full contact sync from WhatsApp
        try {
          await sock.fetchAppStateSync(['regular_high', 'regular_low', 'regular'])
        } catch (e) {
          console.log(`[${businessId}] Contact sync:`, e.message)
        }
      }

      if (connection === 'close') {
        activeSessions.delete(businessId)
        const code = (lastDisconnect?.error instanceof Boom)
          ? lastDisconnect.error.output?.statusCode
          : undefined

        if (code !== DisconnectReason.loggedOut) {
          console.log(`[${businessId}] Reconectando...`)
          setTimeout(() => this.startSession(businessId), 3000)
        } else {
          // Logout explícito — limpiar credenciales guardadas
          await supabase
            .from('whatsapp_sessions')
            .upsert({ business_id: businessId, status: 'disconnected', session_data: null })
        }
      }
    })

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return

      for (const msg of messages) {
        if (msg.key.fromMe) continue
        if (!msg.message) continue

        const text =
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          ''

        if (!text) continue

        const from = msg.key.remoteJid
        console.log(`[${businessId}] Mensaje de ${from}: ${text}`)

        // Guardar mensaje en Supabase
        await supabase.from('whatsapp_messages').insert({
          business_id: businessId,
          from_number: from,
          message: text,
          direction: 'inbound',
        })

        // Obtener configuración del negocio
        const { data: business } = await supabase
          .from('businesses')
          .select('name, ai_prompt, ai_enabled, messages_used, is_paid, daily_messages_count, daily_reset_date, tokens_estimated, excluded_numbers, price_list')
          .eq('id', businessId)
          .single()

        if (!business?.ai_enabled) continue

        // Chequear si el número está excluido
        const fromClean = from.replace(/@[^@]+$/, '')
        if (business.excluded_numbers?.some(n => fromClean.endsWith(n.replace(/\D/g, '')) || n.replace(/\D/g, '').endsWith(fromClean.replace(/\D/g, '')))) {
          console.log(`[${businessId}] Número excluido: ${from}`)
          continue
        }

        // ── LÍMITES ──────────────────────────────────────────
        const TRIAL_LIMIT = 50        // mensajes totales en prueba
        const DAILY_LIMIT = 200       // mensajes por día en plan pago
        const usados = business.messages_used || 0

        // 1) Chequeo trial
        if (!business.is_paid && usados >= TRIAL_LIMIT) {
          await sock.sendMessage(from, {
            text: `Hola, el período de prueba de ${business.name} llegó a su límite de ${TRIAL_LIMIT} mensajes. Para continuar, activá tu suscripción en botwa-app.vercel.app 🙏`
          })
          continue
        }

        // 2) Chequeo límite diario (reset automático cada día)
        const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
        const lastReset = business.daily_reset_date || ''
        const dailyCount = lastReset === today ? (business.daily_messages_count || 0) : 0

        if (business.is_paid && dailyCount >= DAILY_LIMIT) {
          console.warn(`[${businessId}] Límite diario alcanzado (${DAILY_LIMIT} msgs)`)
          // No respondemos ni avisamos al cliente — simplemente ignoramos
          // para no spamear al usuario final con mensajes de error
          continue
        }

        // ── GENERAR RESPUESTA ─────────────────────────────
        try {
          const response = await generateAIResponse(text, business)
          await sock.sendMessage(from, { text: response })

          // Actualizar contadores
          const newDailyCount = dailyCount + 1
          await Promise.all([
            supabase.from('whatsapp_messages').insert({
              business_id: businessId,
              from_number: from,
              message: response,
              direction: 'outbound',
            }),
            supabase.from('businesses')
              .update({
                messages_used: usados + 1,
                daily_messages_count: newDailyCount,
                daily_reset_date: today,
                // ~430 tokens por intercambio (300 prompt + 30 user + 100 respuesta)
                tokens_estimated: (business.tokens_estimated || 0) + 430,
              })
              .eq('id', businessId),
          ])

          console.log(`[${businessId}] Respondido. Diario: ${newDailyCount}/${DAILY_LIMIT}`)
        } catch (err) {
          console.error(`[${businessId}] Error IA:`, err.message)
        }
      }
    })

    return { status: 'starting' }
  },

  getQR(businessId) {
    return pendingQRs.get(businessId) || null
  },

  getStatus(businessId) {
    if (activeSessions.has(businessId)) return 'connected'
    if (pendingQRs.has(businessId)) return 'waiting_qr'
    return 'disconnected'
  },

  async disconnect(businessId) {
    const sock = activeSessions.get(businessId)
    if (sock) {
      await sock.logout()
      activeSessions.delete(businessId)
    }
  },

  async getContacts(businessId) {
    const map = contactsCache.get(businessId)
    // Si la cache en memoria tiene datos, usarlos
    if (map && map.size > 0) {
      return Array.from(map.values()).sort((a, b) => {
        if (a.name && b.name) return a.name.localeCompare(b.name, 'es')
        if (a.name) return -1
        if (b.name) return 1
        return a.number.localeCompare(b.number)
      })
    }
    // Fallback: buscar en Supabase (cache vacía por restart reciente)
    try {
      const { data } = await supabase
        .from('whatsapp_sessions').select('contacts_data').eq('business_id', businessId).single()
      if (data?.contacts_data?.length) {
        // Repoblar cache
        if (!contactsCache.has(businessId)) contactsCache.set(businessId, new Map())
        for (const c of data.contacts_data) contactsCache.get(businessId).set(c.number, c)
        return data.contacts_data.sort((a, b) => {
          if (a.name && b.name) return a.name.localeCompare(b.name, 'es')
          if (a.name) return -1
          if (b.name) return 1
          return a.number.localeCompare(b.number)
        })
      }
    } catch {}
    return []
  },

  async restoreActiveSessions() {
    const { data } = await supabase
      .from('whatsapp_sessions')
      .select('business_id')
      .eq('status', 'connected')

    for (const row of data || []) {
      console.log(`Restaurando sesión: ${row.business_id}`)
      await this.startSession(row.business_id)
    }
  }
}
