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

  // Enviar mensaje manual desde el panel
  app.post('/message/send', async (req, res) => {
    const { businessId, to, text } = req.body
    const sock = botManager.activeSessions?.get(businessId)
    if (!sock) return res.status(400).json({ error: 'No conectado' })
    await sock.sendMessage(`${to}@s.whatsapp.net`, { text })
    res.json({ ok: true })
  })
}
