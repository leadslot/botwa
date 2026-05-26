import 'dotenv/config'
import express from 'express'
import { createServer } from 'http'
import { botManager } from './bot-manager.js'
import { setupRoutes } from './routes.js'

const app = express()
app.use(express.json())

const server = createServer(app)
setupRoutes(app, botManager)

const PORT = process.env.PORT || 3001

server.listen(PORT, () => {
  console.log(`BotWA server running on port ${PORT}`)
  // Auto-restaurar sesiones activas al arrancar
  botManager.restoreActiveSessions()
  // Keep-alive: evita que Railway duerma el servicio
  startKeepAlive()
})

function startKeepAlive() {
  const selfUrl = process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}/health`
    : null

  if (!selfUrl) {
    console.log('[keepalive] RAILWAY_PUBLIC_DOMAIN no definido — keep-alive desactivado en local')
    return
  }

  const INTERVAL_MS = 8 * 60 * 1000 // cada 8 minutos

  setInterval(async () => {
    try {
      const res = await fetch(selfUrl, { signal: AbortSignal.timeout(5000) })
      console.log(`[keepalive] ping OK (${res.status}) → ${selfUrl}`)
    } catch (err) {
      console.warn(`[keepalive] ping falló: ${err.message}`)
    }
  }, INTERVAL_MS)

  console.log(`[keepalive] activo — ping a ${selfUrl} cada ${INTERVAL_MS / 60000} min`)
}
