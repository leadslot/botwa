import 'dotenv/config'
import express from 'express'
import { createServer } from 'http'
import { botManager } from './bot-manager.js'
import { setupRoutes } from './routes.js'

// Validar variables críticas antes de arrancar
const REQUIRED_VARS = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'BOT_SECRET']
for (const v of REQUIRED_VARS) {
  if (!process.env[v]) {
    console.error(`FATAL: ${v} no está configurado. El servidor no puede arrancar sin esta variable.`)
    process.exit(1)
  }
}

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
  const selfUrl =
    process.env.BOT_PUBLIC_URL
      ? `${process.env.BOT_PUBLIC_URL}/health`
      : process.env.RAILWAY_PUBLIC_DOMAIN
        ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}/health`
        : process.env.RAILWAY_STATIC_URL
          ? `${process.env.RAILWAY_STATIC_URL}/health`
          : null

  if (!selfUrl) {
    console.log('[keepalive] Sin URL pública configurada — keep-alive desactivado')
    console.log('[keepalive] Configurá BOT_PUBLIC_URL en Railway con la URL del servicio')
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
