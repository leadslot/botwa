import makeWASocket, {
  DisconnectReason,
  initAuthCreds,
  BufferJSON,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
  downloadMediaMessage,
  proto,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import { createClient } from '@supabase/supabase-js'
import QRCode from 'qrcode'
import { generateAIResponse, needsEscalation, transcribeAudio, describeImage } from './ai.js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// Genera un link de pago en MP usando el token OAuth del negocio
async function generateMpPaymentLink(businessId, amount, description) {
  try {
    const { data: conn } = await supabase
      .from('channel_connections')
      .select('metadata')
      .eq('business_id', businessId)
      .eq('channel', 'mercadopago')
      .eq('status', 'active')
      .single()

    const accessToken = conn?.metadata?.access_token
    if (!accessToken) return null

    const preference = {
      items: [{
        title: description || 'Seña / pago anticipado',
        quantity: 1,
        unit_price: amount,
        currency_id: 'ARS',
      }],
      back_urls: {
        success: 'https://responbot.com.ar/pago-ok',
        failure: 'https://responbot.com.ar/pago-error',
        pending: 'https://responbot.com.ar/pago-pendiente',
      },
      auto_return: 'approved',
    }

    const res = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preference),
    })

    const data = await res.json()
    return data.init_point ?? null
  } catch (e) {
    console.warn('[MP] Error generando link de pago:', e.message)
    return null
  }
}

// Detecta si el mensaje tiene intención de pagar / dejar seña
function hasPaymentIntent(text) {
  const lower = text.toLowerCase()
  const keywords = ['seña', 'señar', 'reservar', 'reserva', 'pagar', 'pago', 'anticipo', 'abonar', 'link de pago', 'mercadopago', 'mercado pago', 'cómo pago', 'como pago', 'pago anticipado', 'confirmar turno']
  return keywords.some(kw => lower.includes(kw))
}

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
    if (activeSessions.has(businessId) || pendingSockets.has(businessId)) {
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
      browser: ['ResponBot', 'Chrome', '1.0.0'],
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
        // Load persisted paused contacts from DB
        botManager.loadPausedContacts(businessId).catch(() => {})
        // Request full contact sync from WhatsApp
        try {
          await sock.fetchAppStateSync(['regular_high', 'regular_low', 'regular'])
        } catch (e) {
          console.log(`[${businessId}] Contact sync:`, e.message)
        }
      }

      if (connection === 'close') {
        // Capture whether this was a real active connection BEFORE removing it
        const wasPreviouslyConnected = activeSessions.has(businessId)
        activeSessions.delete(businessId)
        pendingSockets.delete(businessId)
        const code = (lastDisconnect?.error instanceof Boom)
          ? lastDisconnect.error.output?.statusCode
          : undefined

        if (code !== DisconnectReason.loggedOut) {
          const attempts = (reconnectAttempts.get(businessId) || 0) + 1
          reconnectAttempts.set(businessId, attempts)

          // Después de 6 intentos fallidos, las credenciales probablemente expiaron → limpiar y pedir QR nuevo
          if (attempts > 6) {
            console.warn(`[${businessId}] Demasiados intentos (${attempts}), limpiando sesión — necesita nuevo QR`)
            reconnectAttempts.delete(businessId)
            await supabase
              .from('whatsapp_sessions')
              .upsert({ business_id: businessId, status: 'disconnected', session_data: null, qr_code: null }, { onConflict: 'business_id' })
            return
          }

          // Backoff exponencial: 3s, 6s, 12s, 24s, 48s... máximo 5 minutos
          const delayMs = Math.min(3000 * Math.pow(2, attempts - 1), 5 * 60 * 1000)
          console.log(`[${businessId}] Reconectando (intento ${attempts}) en ${delayMs / 1000}s...`)
          // Only mark as 'reconnecting' in Supabase if we had a real active connection.
          // For fresh QR attempts that fail, keep status 'disconnected' to avoid
          // triggering the auto-reset loop in the frontend.
          if (wasPreviouslyConnected) {
            await supabase
              .from('whatsapp_sessions')
              .upsert({ business_id: businessId, status: 'reconnecting', qr_code: null }, { onConflict: 'business_id' })
          }
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

        let from = msg.key.remoteJid
        const pushName = msg.pushName || ''

        let text =
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          msg.message.buttonsResponseMessage?.selectedDisplayText ||
          msg.message.listResponseMessage?.title ||
          ''

        // ── MEDIA: audio e imágenes ──────────────────────────
        const audioMsg = msg.message.audioMessage || msg.message.pttMessage
        const imageMsg = msg.message.imageMessage

        if (!text && audioMsg) {
          try {
            const buffer = await downloadMediaMessage(msg, 'buffer', {})
            const mimetype = audioMsg.mimetype || 'audio/ogg; codecs=opus'
            const transcription = await transcribeAudio(buffer, mimetype)
            if (transcription) {
              text = transcription
              console.log(`[${businessId}] Audio transcripto: "${transcription.slice(0, 60)}..."`)
            } else {
              await sock.sendMessage(from, { text: 'Recibí tu audio pero no pude escucharlo bien. ¿Podés escribirme qué necesitás?' })
              continue
            }
          } catch (e) {
            console.error(`[${businessId}] Error descargando audio:`, e.message)
            continue
          }
        }

        if (!text && imageMsg) {
          try {
            const buffer = await downloadMediaMessage(msg, 'buffer', {})
            const mimetype = imageMsg.mimetype || 'image/jpeg'
            const caption = imageMsg.caption || ''
            const description = await describeImage(buffer, mimetype)
            if (description) {
              text = caption
                ? `[El cliente mandó una imagen. Lo que muestra: ${description}. Texto del cliente: ${caption}]`
                : `[El cliente mandó una imagen. Lo que muestra: ${description}]`
              console.log(`[${businessId}] Imagen descripta`)
            } else if (caption) {
              text = caption
            } else {
              await sock.sendMessage(from, { text: 'Recibí tu imagen. ¿Querés contarme algo más sobre lo que buscás?' })
              continue
            }
          } catch (e) {
            console.error(`[${businessId}] Error descargando imagen:`, e.message)
            continue
          }
        }

        if (!text) continue

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
        const [{ data: business }, { data: bizFiles }] = await Promise.all([
          supabase
            .from('businesses')
            .select('name, ai_prompt, ai_enabled, messages_used, is_paid, daily_messages_count, daily_reset_date, tokens_estimated, excluded_numbers, price_list, response_delay_seconds, escalation_contact, mp_payment_link, mp_payment_description, mp_payment_amount')
            .eq('id', businessId)
            .single(),
          supabase
            .from('business_files')
            .select('id, name, description, url, mimetype')
            .eq('business_id', businessId),
        ])
        const businessWithFiles = business ? { ...business, files: bizFiles ?? [] } : null

        if (!businessWithFiles?.ai_enabled) continue
        const business = businessWithFiles

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

        // ── LÍMITES (atómico vía función SQL) ────────────────
        const TRIAL_LIMIT = 50
        const DAILY_LIMIT = 200
        const today = new Date().toISOString().slice(0, 10)

        // Aviso trial (pre-check sin lock para el mensaje de usuario)
        if (!business.is_paid && (business.messages_used || 0) >= TRIAL_LIMIT) {
          await sock.sendMessage(from, {
            text: 'Alcanzaste el limite de prueba de Responbot. Para seguir respondiendo mensajes, activa tu plan desde el panel.'
          })
          continue
        }

        // ── LOOP DETECTION ───────────────────────────────
        if (isLoopMessage(businessId, from, text)) continue

        // ── HISTORIAL DE CONVERSACIÓN ────────────────────
        const contextLimit = business.context_messages ?? 10
        let history = []
        if (contextLimit > 0) {
          const { data: histRows } = await supabase
            .from('whatsapp_messages')
            .select('direction, message')
            .eq('business_id', businessId)
            .eq('from_number', from)
            .order('created_at', { ascending: false })
            .limit(contextLimit)
          if (histRows?.length) {
            history = histRows.reverse() // cronológico: más antiguo primero
          }
        }

        // ── GENERAR RESPUESTA ─────────────────────────────
        try {
          // Pre-generar link de seña si el mensaje tiene intención de pago
          let generatedMpLink = null
          if (business.mp_payment_amount && hasPaymentIntent(text)) {
            generatedMpLink = await generateMpPaymentLink(
              businessId,
              business.mp_payment_amount,
              business.mp_payment_description
            )
            if (generatedMpLink) {
              console.log(`[${businessId}] Link MP generado para seña: ${generatedMpLink}`)
            }
          }

          // Inyectar link generado en el contexto del negocio para la IA
          const businessWithMpLink = generatedMpLink
            ? { ...business, mp_payment_link: generatedMpLink }
            : business

          // Detección de escalación antes de llamar a la IA
          let response = null
          if (needsEscalation(text)) {
            if (business.escalation_contact) {
              response = 'Gracias por escribir. Alguien del equipo te va a responder personalmente.'
            } else {
              // Sin contacto configurado: no responder, dejar marcado como pendiente
              console.log(`[${businessId}] Escalación sin contacto configurado. Conversación pendiente.`)
              await supabase.from('whatsapp_messages').insert({
                business_id: businessId,
                from_number: from,
                message: text,
                direction: 'inbound_escalated',
              }).catch(() => {})
              continue
            }
          } else {
            response = await generateAIResponse(text, businessWithMpLink, history)
          }

          // Aplicar delay configurado por el negocio
          const delaySecs = business.response_delay_seconds || 0
          if (delaySecs > 0) {
            await sock.sendPresenceUpdate('composing', from)
            await new Promise(r => setTimeout(r, delaySecs * 1000))
            await sock.sendPresenceUpdate('paused', from)
          }

          // Detectar si la IA quiere mandar un archivo
          const fileMatch = response.match(/\[FILE:([a-f0-9-]+)\]/)
          if (fileMatch) {
            const fileId = fileMatch[1]
            const fileRecord = business.files?.find(f => f.id === fileId)
            if (fileRecord) {
              const isImage = fileRecord.mimetype.startsWith('image/')
              if (isImage) {
                await sock.sendMessage(from, { image: { url: fileRecord.url }, caption: fileRecord.name })
              } else {
                await sock.sendMessage(from, {
                  document: { url: fileRecord.url },
                  mimetype: fileRecord.mimetype,
                  fileName: fileRecord.name,
                })
              }
            } else {
              await sock.sendMessage(from, { text: response.replace(/\[FILE:[^\]]+\]/g, '').trim() || '¡Aquí va la información!' })
            }
          } else {
            await sock.sendMessage(from, { text: response })
          }

          // Actualizar contadores (atómico via SQL function)
          await supabase.from('whatsapp_messages').insert({
            business_id: businessId,
            from_number: from,
            message: response,
            direction: 'outbound',
          })
          const { data: counter } = await supabase.rpc('increment_message_counters', {
            p_business_id: businessId,
            p_today: today,
            p_tokens: 430,
            p_daily_limit: DAILY_LIMIT,
            p_trial_limit: TRIAL_LIMIT,
          })
          console.log(`[${businessId}] Respondido. Counter: ${JSON.stringify(counter)}`)
        } catch (err) {
          console.error(`[${businessId}] Error IA:`, err.message)
        }
      }
    })

    return { status: 'starting' }
  },

  // ── Human Handoff ────────────────────────────────────────
  async pauseContact(businessId, number) {
    if (!pausedContacts.has(businessId)) pausedContacts.set(businessId, new Set())
    pausedContacts.get(businessId).add(number)
    await supabase.from('paused_contacts').upsert({ business_id: businessId, phone: number }, { onConflict: 'business_id,phone' })
  },
  async unpauseContact(businessId, number) {
    pausedContacts.get(businessId)?.delete(number)
    await supabase.from('paused_contacts').delete().eq('business_id', businessId).eq('phone', number)
  },
  isPaused(businessId, number) {
    return pausedContacts.get(businessId)?.has(number) ?? false
  },
  getPausedContacts(businessId) {
    return Array.from(pausedContacts.get(businessId) ?? [])
  },
  async loadPausedContacts(businessId) {
    const { data } = await supabase.from('paused_contacts').select('phone').eq('business_id', businessId)
    if (data?.length) {
      pausedContacts.set(businessId, new Set(data.map(r => r.phone)))
    }
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
    const sock = activeSessions.get(businessId) || pendingSockets.get(businessId)
    if (sock) {
      try { sock.end(undefined) } catch {}
      activeSessions.delete(businessId)
      pendingSockets.delete(businessId)
    }
    reconnectAttempts.delete(businessId)
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
