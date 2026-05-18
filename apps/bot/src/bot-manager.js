import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import { createClient } from '@supabase/supabase-js'
import QRCode from 'qrcode'
import path from 'path'
import fs from 'fs'
import { generateAIResponse } from './ai.js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// Mapa de sesiones activas en memoria: businessId -> socket
const activeSessions = new Map()
// Mapa de QR pendientes: businessId -> qrBase64
const pendingQRs = new Map()

export const botManager = {

  async startSession(businessId) {
    if (activeSessions.has(businessId)) {
      return { status: 'already_connected' }
    }

    const sessionDir = path.join(process.cwd(), 'sessions', businessId)
    fs.mkdirSync(sessionDir, { recursive: true })

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir)
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
          await supabase
            .from('whatsapp_sessions')
            .upsert({ business_id: businessId, status: 'disconnected' })
          // Limpiar sesión guardada
          fs.rmSync(sessionDir, { recursive: true, force: true })
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
          .select('name, ai_prompt, ai_enabled, messages_used, is_paid, daily_messages_count, daily_reset_date, tokens_estimated')
          .eq('id', businessId)
          .single()

        if (!business?.ai_enabled) continue

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
