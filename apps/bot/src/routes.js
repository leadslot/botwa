export function setupRoutes(app, botManager) {

  // Health check
  app.get('/health', (req, res) => res.json({ ok: true }))

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

  // Pausar/reanudar bot para un contacto específico
  app.post('/session/pause', (req, res) => {
    const { businessId, number, paused } = req.body
    if (!businessId || !number) return res.status(400).json({ error: 'businessId y number requeridos' })
    if (paused) botManager.pauseContact(businessId, number)
    else botManager.unpauseContact(businessId, number)
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
      res.status(500).json({ error: e.message })
    }
  })

  // Enviar mensaje manual desde el panel
  app.post('/message/send', async (req, res) => {
    const { businessId, to, text } = req.body
    const sock = botManager.activeSessions?.get(businessId)
    if (!sock) return res.status(400).json({ error: 'No conectado' })
    await sock.sendMessage(`${to}@s.whatsapp.net`, { text })
    res.json({ ok: true })
  })
}
