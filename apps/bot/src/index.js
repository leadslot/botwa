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
})
