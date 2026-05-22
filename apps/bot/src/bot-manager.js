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

async function isChannelPaused(businessId, channel) {
  try {
    const { data } = await supabase
      .from('channel_connections')
      .select('status')
      .eq('business_id', businessId)
      .eq('channel', channel)
      .eq('status', 'paused')
      .limit(1)
      .maybeSingle()
    return Boolean(data)
  } catch {
    return false
  }
}

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
// Contador de reintentos: businessId -> número
const reconnectAttempts = new Map()
// Cache de chats: businessId -> Map<number, {number, name, lastMessage, isGroup}>
const chatsCache = new Map()
// Contactos por sesión: businessId -> Map<jid, {name, number}>
const contactsCache = new Map()
// Mapa LID -> número real: businessId -> Map<lid_string, phone_string>
const lidToNumber = new Map()
// Human handoff: businessId -> Set<string> de números pausados
const pausedContacts = new Map()
// Sockets en proceso de conexión (antes de 'open'): businessId -> sock
const pendingSockets = new Map()
// Loop detection: `${businessId}:${from}` -> último texto recibido
const loopTracker = new Map()

function isLoopMessage(businessId, from, text) {
  const key = `${businessId}:${from}`
  const last = loopTracker.get(key)
  loopTracker.set(key, text)
  if (last === text) {
    console.warn(`[${businessId}] Loop detectado con ${from}: 2 mensajes consecutivos iguales`)
    return true
  }
  return false
}

function parseChat(chat) {
  const jid = chat.id || ''
  if (!jid.endsWith('@s.whatsapp.net')) return null
  const number = jid.replace('@s.whatsapp.net', '')
  if (!number || number === 'status') return null
  const name = chat.name || chat.pushname || chat.verifiedName || ''
  const lastMessage = chat.conversationTimestamp
    ? new Date(Number(chat.conversationTimestamp) * 1000).toISOString()
    : null
  return { number, name, lastMessage, isGroup: false, source: 'whatsapp_chat' }
}

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

    pendingSockets.set(businessId, sock)

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

    if (!lidToNumber.has(businessId)) lidToNumber.set(businessId, new Map())
    const lidMap = lidToNumber.get(businessId)

    sock.ev.on('messaging-history.set', ({ contacts: histContacts }) => {
      if (!histContacts) return
      for (const c of histContacts) {
        if (c.id?.endsWith('@s.whatsapp.net') && c.lid) {
          const number = c.id.replace('@s.whatsapp.net', '')
          const lid = c.lid.replace('@lid', '')
          lidMap.set(lid, number)
        }
      }
      console.log(`[${businessId}] LID map poblado desde historial: ${lidMap.size} entradas`)
    })

    sock.ev.on('contacts.upsert', (newContacts) => {
      let changed = false
      for (const c of newContacts) {
        if (c.id?.endsWith('@s.whatsapp.net')) {
          const number = c.id.replace('@s.whatsapp.net', '')
          const name = c.name || c.notify || c.verifiedName || ''
          if (c.lid) {
            const lid = c.lid.replace('@lid', '')
            lidMap.set(lid, number)
          }
          if (name || !contacts.has(number)) {
            contacts.set(number, { number, name })
            changed = true
          }
        } else if (c.id?.endsWith('@lid')) {
          // Baileys puede enviar contactos donde el id mismo es el LID
          const lid = c.id.replace('@lid', '')
          const phoneJid = c.phone || c.jid
          if (phoneJid) {
            const num = phoneJid.replace('@s.whatsapp.net', '').replace(/\D/g, '')
            if (num.length > 6) lidMap.set(lid, num)
          }
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
        if (c.lid) lidMap.set(c.lid.replace('@lid', ''), number)
        contacts.set(number, { ...existing, name })
        changed = true
      }
      if (changed) scheduleContactsSave()
    })

    // ── Chats cache ──────────────────────────────────────────
    if (!chatsCache.has(businessId)) {
      chatsCache.set(businessId, new Map())
    }
    const chats = chatsCache.get(businessId)

    let saveChatsTimer = null
    const scheduleChatsSave = () => {
      clearTimeout(saveChatsTimer)
      saveChatsTimer = setTimeout(async () => {
        const list = Array.from(chats.values())
        await supabase.from('whatsapp_sessions')
          .upsert({ business_id: businessId, chats_data: list }, { onConflict: 'business_id' })
        console.log(`[${businessId}] Chats guardados en Supabase: ${list.length}`)
      }, 10000)
    }

    sock.ev.on('chats.set', ({ chats: incoming }) => {
      let count = 0
      for (const chat of (incoming || [])) {
        const parsed = parseChat(chat)
        if (!parsed) continue
        chats.set(parsed.number, parsed)
        count++
      }
      if (count > 0) {
        console.log(`[${businessId}] chats.set: ${count} chats individuales cargados`)
        scheduleChatsSave()
      }
    })

    sock.ev.on('chats.upsert', (incoming) => {
      let count = 0
      for (const chat of (incoming || [])) {
        const parsed = parseChat(chat)
        if (!parsed) continue
        const existing = chats.get(parsed.number) || {}
        chats.set(parsed.number, { ...existing, ...parsed })
        count++
      }
      if (count > 0) scheduleChatsSave()
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
        reconnectAttempts.delete(businessId)
        activeSessions.set(businessId, sock)
        pendingQRs.delete(businessId)
        pendingSockets.delete(businessId)
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
          const attempts = (reconnectAttempts.get(businessId) || 0) + 1
          reconnectAttempts.set(businessId, attempts)
          // Backoff exponencial: 3s, 6s, 12s, 24s, 48s... máximo 5 minutos
          const delayMs = Math.min(3000 * Math.pow(2, attempts - 1), 5 * 60 * 1000)
          console.log(`[${businessId}] Reconectando (intento ${attempts}) en ${delayMs / 1000}s...`)
          // NUNCA borrar session_data — las credenciales se conservan siempre
          await supabase
            .from('whatsapp_sessions')
            .upsert({ business_id: businessId, status: 'reconnecting', qr_code: null }, { onConflict: 'business_id' })
          setTimeout(() => this.startSession(businessId), delayMs)
        } else {
          // Logout explícito del dispositivo — ahí sí limpiar credenciales
          reconnectAttempts.delete(businessId)
          await supabase
            .from('whatsapp_sessions')
            .upsert({ business_id: businessId, status: 'disconnected', session_data: null, qr_code: null }, { onConflict: 'business_id' })
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

        let from = msg.key.remoteJid
        const pushName = msg.pushName || ''

        // Si el JID es un LID (@lid), resolverlo al número real
        if (from?.endsWith('@lid')) {
          const lid = from // mantener con @lid para las APIs de Baileys
          const lidClean = from.replace('@lid', '')

          // 1. lidMap local (de contacts.upsert / messaging-history.set)
          let resolved = lidMap.get(lidClean)

          // 2. signalRepository interno de Baileys v7
          if (!resolved) {
            try {
              const pn = sock.signalRepository?.lidMapping?.getPNForLID?.(lid)
              if (pn) resolved = pn.replace('@s.whatsapp.net', '')
            } catch {}
          }

          // 3. msg.key.participant (suele estar en grupos o en algunas versiones)
          if (!resolved && msg.key.participant?.endsWith('@s.whatsapp.net')) {
            resolved = msg.key.participant.replace('@s.whatsapp.net', '')
          }

          if (resolved) {
            from = `${resolved}@s.whatsapp.net`
            // Guardar para futuros mensajes
            lidMap.set(lidClean, resolved)
          } else {
            // No se pudo resolver: guardar el LID limpio con el pushName como contexto
            console.warn(`[${businessId}] LID irresolvible: ${lidClean} pushName="${pushName}"`)
            // Usamos el LID como identificador — el bot igual puede responder con el LID
          }
        }
        console.log(`[${businessId}] Mensaje de ${from}: ${text}`)

        // Guardar mensaje en Supabase
        await supabase.from('whatsapp_messages').insert({
          business_id: businessId,
          from_number: from,
          message: text,
          direction: 'inbound',
          push_name: pushName || null,
        })

        // Human handoff check
        const fromClean = from.replace(/@[^@]+$/, '')
        if (this.isPaused(businessId, fromClean)) {
          console.log(`[${businessId}] Bot pausado para ${fromClean}`)
          continue
        }

        if (await isChannelPaused(businessId, 'whatsapp')) {
          console.log(`[${businessId}] WhatsApp pausado por canal`)
          continue
        }

        // Obtener configuración del negocio
        const { data: business } = await supabase
          .from('businesses')
          .select('name, ai_prompt, ai_enabled, messages_used, is_paid, daily_messages_count, daily_reset_date, tokens_estimated, excluded_numbers, price_list, response_delay_seconds')
          .eq('id', businessId)
          .single()

        if (!business?.ai_enabled) continue

        // Chequear si el número está excluido
        // Funciona tanto con números reales como con LIDs (el usuario puede bloquear desde el panel)
        const fromDigits = fromClean.replace(/\D/g, '')
        const isExcluded = business.excluded_numbers?.some(n => {
          const nDigits = n.replace(/\D/g, '')
          return nDigits === fromDigits || fromDigits.endsWith(nDigits) || nDigits.endsWith(fromDigits)
        })
        if (isExcluded) {
          console.log(`[${businessId}] Contacto excluido: ${from}`)
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

        // ── LOOP DETECTION ───────────────────────────────
        if (isLoopMessage(businessId, from, text)) continue

        // ── GENERAR RESPUESTA ─────────────────────────────
        try {
          const response = await generateAIResponse(text, business)

          // Aplicar delay configurado por el negocio
          const delaySecs = business.response_delay_seconds || 0
          if (delaySecs > 0) {
            await sock.sendPresenceUpdate('composing', from)
            await new Promise(r => setTimeout(r, delaySecs * 1000))
            await sock.sendPresenceUpdate('paused', from)
          }

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

  // ── Human Handoff ────────────────────────────────────────
  pauseContact(businessId, number) {
    if (!pausedContacts.has(businessId)) pausedContacts.set(businessId, new Set())
    pausedContacts.get(businessId).add(number)
  },
  unpauseContact(businessId, number) {
    pausedContacts.get(businessId)?.delete(number)
  },
  isPaused(businessId, number) {
    return pausedContacts.get(businessId)?.has(number) ?? false
  },
  getPausedContacts(businessId) {
    return Array.from(pausedContacts.get(businessId) ?? [])
  },

  // ── Pairing Code ─────────────────────────────────────────
  async requestPairingCode(businessId, phoneNumber) {
    let sock = activeSessions.get(businessId) || pendingSockets.get(businessId)
    if (!sock) {
      await this.startSession(businessId)
      await new Promise(r => setTimeout(r, 3000))
      sock = activeSessions.get(businessId) || pendingSockets.get(businessId)
    }
    if (!sock) throw new Error('No hay sesión activa')
    const code = await sock.requestPairingCode(phoneNumber)
    return code
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
      try { await sock.logout() } catch {}
      activeSessions.delete(businessId)
    }
    pendingQRs.delete(businessId)
    await supabase.from('whatsapp_sessions')
      .upsert({ business_id: businessId, status: 'disconnected', session_data: null, qr_code: null }, { onConflict: 'business_id' })
  },

  async resetSession(businessId) {
    // Fuerza desconexión y borra credenciales → próximo start pedirá QR nuevo
    const sock = activeSessions.get(businessId)
    if (sock) {
      try { sock.end(undefined) } catch {}
      activeSessions.delete(businessId)
    }
    pendingQRs.delete(businessId)
    await supabase.from('whatsapp_sessions')
      .upsert({ business_id: businessId, status: 'disconnected', session_data: null, qr_code: null }, { onConflict: 'business_id' })
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

  async getChats(businessId) {
    const map = chatsCache.get(businessId)
    if (map && map.size > 0) {
      return Array.from(map.values()).sort((a, b) => {
        if (a.lastMessage && b.lastMessage) return b.lastMessage.localeCompare(a.lastMessage)
        if (a.lastMessage) return -1
        if (b.lastMessage) return 1
        return (a.name || a.number).localeCompare(b.name || b.number, 'es')
      })
    }
    // Fallback: Supabase
    try {
      const { data } = await supabase
        .from('whatsapp_sessions').select('chats_data').eq('business_id', businessId).single()
      if (data?.chats_data?.length) {
        if (!chatsCache.has(businessId)) chatsCache.set(businessId, new Map())
        for (const c of data.chats_data) chatsCache.get(businessId).set(c.number, c)
        return data.chats_data
      }
    } catch {}
    return []
  },

  async restoreActiveSessions() {
    // Restaurar cualquier sesión que tenga credenciales guardadas (no solo 'connected')
    // Esto cubre el caso donde Railway redesplegó y el status quedó en otro valor
    const { data } = await supabase
      .from('whatsapp_sessions')
      .select('business_id, status, session_data')
      .neq('status', 'disconnected')

    for (const row of data || []) {
      // Si tiene session_data (credenciales), reconectar aunque el status no sea 'connected'
      if (row.session_data || row.status === 'connected') {
        console.log(`Restaurando sesión [${row.status}]: ${row.business_id}`)
        await this.startSession(row.business_id)
      }
    }
  },

  _getSocket(businessId) {
    return activeSessions.get(businessId) || pendingSockets.get(businessId) || null
  }
}
