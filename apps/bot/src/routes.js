const BOT_SECRET = process.env.BOT_SECRET

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function authMiddleware(req, res, next) {
  // Sin BOT_SECRET el servidor no debería haber arrancado (validado en index.js)
  // Pero como segunda línea de defensa, rechazamos en lugar de permitir
  if (!BOT_SECRET) return res.status(503).json({ error: 'Server misconfigured' })
  const provided = req.headers['x-bot-secret']
  if (provided !== BOT_SECRET) return res.status(401).json({ error: 'Unauthorized' })
  next()
}

function validateBusinessId(req, res, next) {
  const id = req.params.businessId || req.body?.businessId
  if (id && !UUID_RE.test(id)) return res.status(400).json({ error: 'businessId inválido' })
  next()
}

export function setupRoutes(app, botManager) {

  // Health check — sin auth (necesario para keepalive)
  app.get('/health', (req, res) => res.json({ ok: true }))

  // Todas las demás rutas requieren el secret y businessId válido
  app.use(authMiddleware)
  app.use(validateBusinessId)

  // Iniciar sesión / obtener QR
  app.post('/session/start', async (req, res) => {
    const { businessId } = req.body
    if (!businessId) return res.status(400).json({ error: 'businessId requerido' })
    const result = await botManager.startSession(businessId)
    res.json(result)
  })

  // Obtener QR actual
  app.get('/session/qr/:businessId', (req, res) => {
    const qr = botManager.getQR(req.params.businessId)
    const status = botManager.getStatus(req.params.businessId)
    res.json({ qr, status })
  })

  // Estado de conexión
  app.get('/session/status/:businessId', (req, res) => {
    const status = botManager.getStatus(req.params.businessId)
    res.json({ status })
  })

  // Desconectar (mantiene credenciales para reconexión automática)
  app.post('/session/disconnect', async (req, res) => {
    const { businessId } = req.body
    await botManager.disconnect(businessId)
    res.json({ ok: true })
  })

  // Reset total: borra credenciales y fuerza QR nuevo
  app.post('/session/reset', async (req, res) => {
    const { businessId } = req.body
    await botManager.resetSession(businessId)
    res.json({ ok: true })
  })

  // Obtener contactos de la sesión activa
  app.get('/session/contacts/:businessId', async (req, res) => {
    const contacts = await botManager.getContacts(req.params.businessId)
    res.json({ contacts })
  })

  // Obtener chats (individuales) de la sesión activa
  app.get('/session/chats/:businessId', async (req, res) => {
    const chats = await botManager.getChats(req.params.businessId)
    res.json({ chats })
  })

  // Resolver LID de una lista de números de teléfono
  app.post('/session/resolve-lids', async (req, res) => {
    const { businessId, phones } = req.body
    if (!businessId || !Array.isArray(phones)) return res.status(400).json({ error: 'businessId y phones[] requeridos' })
    const s = botManager._getSocket(businessId)
    if (!s) return res.status(400).json({ error: 'Bot no conectado' })
    const results = []
    for (const phone of phones) {
      const clean = phone.replace(/\D/g, '')
      try {
        const [result] = await s.onWhatsApp(`${clean}@s.whatsapp.net`)
        results.push({ phone: clean, lid: result?.lid || null, exists: !!result?.exists })
      } catch {
        results.push({ phone: clean, lid: null, exists: false })
      }
    }
    res.json({ results })
  })

  // Pausar/reanudar bot para un contacto específico
  app.post('/session/pause', async (req, res) => {
    const { businessId, number, paused } = req.body
    if (!businessId || !number) return res.status(400).json({ error: 'businessId y number requeridos' })
    if (paused) await botManager.pauseContact(businessId, number)
    else await botManager.unpauseContact(businessId, number)
    res.json({ ok: true, paused })
  })

  // Obtener lista de contactos pausados
  app.get('/session/paused/:businessId', (req, res) => {
    res.json({ paused: botManager.getPausedContacts(req.params.businessId) })
  })

  // Solicitar código de vinculación (alternativa al QR)
  app.post('/session/pair-code', async (req, res) => {
    const { businessId, phone } = req.body
    if (!businessId || !phone) return res.status(400).json({ error: 'businessId y phone requeridos' })
    try {
      const code = await botManager.requestPairingCode(businessId, phone.replace(/\D/g, ''))
      res.json({ code })
    } catch (e) {
      console.error(`[pair-code] ${businessId}:`, e.message)
      res.status(500).json({ error: 'No se pudo generar el código de vinculación' })
    }
  })

  // Enviar mensaje manual desde el panel
  app.post('/message/send', async (req, res) => {
    const { businessId, to, text } = req.body
    const sock = botManager.activeSessions?.get(businessId)
    if (!sock) return res.status(400).json({ error: 'No conectado' })
    const cleanTo = (to || '').replace(/\D/g, '')
    if (!cleanTo || cleanTo.length < 7 || cleanTo.length > 15) {
      return res.status(400).json({ error: 'Número de destino inválido' })
    }
    await sock.sendMessage(`${cleanTo}@s.whatsapp.net`, { text })
    res.json({ ok: true })
  })
}
