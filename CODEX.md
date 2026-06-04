# Responbot — Contexto para IA

> Leé este archivo al inicio de cualquier sesión. Contiene arquitectura, flujos de deploy y puntos clave del código.
> Las credenciales y API keys están en `CREDENTIALS.md` (gitignored, misma carpeta).

---

## Qué es Responbot

SaaS argentino B2B: automatiza la atención al cliente en WhatsApp via IA. El negocio configura un prompt, precios y archivos; el bot responde automáticamente 24/7.

**Estado:** producción en `https://responbot.com.ar`

---

## Stack

| Capa | Tecnología | URL |
|---|---|---|
| Frontend / API | Next.js 16 App Router | Vercel |
| Bot WhatsApp | Node.js + Baileys | Railway |
| Base de datos | Supabase PostgreSQL | sa-east-1 |
| IA | Groq (texto/audio) + Google Gemini (visión) | — |
| Email | Resend (`noreply@responbot.com.ar`) | sa-east-1 |
| Forwarding email | ImprovMX (`soporte@→gmail`) | — |
| Pagos | Mercado Pago suscripciones | — |

---

## Estructura de archivos

```
botwa/
├── apps/
│   ├── web/          ← Next.js (Vercel)
│   │   └── src/
│   │       ├── app/
│   │       │   ├── api/          ← API Routes
│   │       │   │   ├── health/           ← GET /api/health (monitoreo)
│   │       │   │   ├── internal/alert/   ← POST (alertas del bot)
│   │       │   │   ├── mp/webhook/       ← Pagos MP
│   │       │   │   ├── mp/subscribe/     ← Crear suscripción
│   │       │   │   ├── bot/              ← Proxy al bot server
│   │       │   │   └── admin/            ← Panel admin
│   │       │   ├── dashboard/    ← Panel del negocio
│   │       │   ├── privacidad/
│   │       │   └── terminos/
│   │       └── lib/
│   │           ├── supabase/server.ts  ← getVerifiedUser(), getAuthContext()
│   │           ├── plans.ts            ← Definición de planes y addons
│   │           └── mailer.ts           ← Emails transaccionales (Resend)
│   └── bot/          ← Node.js (Railway)
│       └── src/
│           ├── index.js         ← Entry point, validación de vars, keepalive
│           ├── bot-manager.js   ← Lógica WhatsApp/Baileys, sesiones, alertas
│           ├── routes.js        ← API routes del bot (autenticadas con BOT_SECRET)
│           └── ai.js            ← Groq + Gemini, prompt injection mitigation
```

---

## Patrones de auth — MUY IMPORTANTE

```ts
// ✅ CORRECTO — verifica JWT en el servidor
import { getVerifiedUser, getAuthContext } from '@/lib/supabase/server'
const user = await getVerifiedUser()
const ctx = await getAuthContext()  // incluye businessId y adminClient

// ❌ PROHIBIDO — solo lee cookie sin verificar
import { getSession } from '@supabase/auth-helpers-nextjs'
```

- `getVerifiedUser()` → para rutas que solo necesitan saber quién es el usuario
- `getAuthContext()` → para rutas que necesitan el `businessId` y cliente admin de Supabase

---

## Planes y addons

Definidos en `apps/web/src/lib/plans.ts`:

| Plan | Precio MXN/mes | Respuestas/mes |
|---|---|---|
| Básico | — | 7.500 |
| Profesional | — | 7.500 |
| Business | — | 7.500 |

**Addons:**
- +5.000 respuestas → $29.000 ARS
- +10.000 respuestas → $49.000 ARS

---

## Emails transaccionales

`apps/web/src/lib/mailer.ts` — Resend, from `noreply@responbot.com.ar`

| Función | Cuándo se dispara |
|---|---|
| `sendWelcomeEmail` | Primer pago exitoso (webhook MP) |
| `sendPackConfirmationEmail` | Compra de addon |
| `sendSubscriptionCancelledEmail` | Cancelación MP |
| `sendPasswordResetEmail` | Solicitud de reset (`/api/auth/reset-password`) |
| `sendUsageWarningEmail` | 80% o 100% del límite (pendiente de wiring al bot) |
| `sendMaintenanceEmail` | Manual (admin) |
| `sendServiceAlertEmail` | Bot disconnect / alertas críticas |

---

## Sistema de alertas

- **`GET /api/health`** — público, retorna `200 ok` o `503 degraded`. Chequea DB + bot + sesiones activas. UptimeRobot lo monitorea cada 5 min.
- **`POST /api/internal/alert`** — autenticado con `x-bot-secret`. El bot llama este endpoint cuando:
  - WhatsApp hace logout desde el celular (`wa_logged_out`)
  - No puede reconectarse tras 6 intentos (`wa_max_retries`)
  - El admin recibe email a `ADMIN_EMAIL` vía Resend.

---

## Seguridad implementada

- Headers HTTP: `X-Frame-Options`, `X-Content-Type-Options`, `HSTS`, `Referrer-Policy`, `Permissions-Policy`
- Bot: HMAC signature verification en webhooks MP, UUID validation en businessId
- Bot: prompt injection mitigation con `<user_input>` tags
- Admin routes: verificación de email contra `ADMIN_EMAIL` (sin fallback hardcodeado)
- BOT_SECRET obligatorio para arrancar el bot (falla con exit 1 si falta)

---

## Deploy — paso a paso

### Web (Vercel) — NO hay auto-deploy

```powershell
cd D:\proyectos\workspace\botwa
git add .
git commit -m "feat: descripción"
git push origin master

cd D:\proyectos\workspace\botwa\apps\web
$env:VERCEL_PROJECT_ID="prj_Wni7UMmyVu57qhMjP87yv1v6b1CN"
$env:VERCEL_ORG_ID="team_2lujWcHJEjOz1rfmSyMRqNvO"
vercel --prod --yes
```

Si el alias no se actualiza solo, agregar:
```powershell
vercel alias set <url-preview> responbot.com.ar
```

### Bot (Railway) — auto-deploy en cada push a master

```powershell
cd D:\proyectos\workspace\botwa
git push origin master
# Railway detecta el push y redeploya apps/bot automáticamente
```

---

## Variables de entorno

### Web (Vercel) — todas configuradas allá

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_KEY           ← service_role (nunca exponer al cliente)
BOT_SERVER_URL                 ← URL del bot en Railway (ej: https://botwa-xxx.railway.app)
BOT_SECRET                     ← secreto compartido web↔bot
ADMIN_EMAIL                    ← email del admin (maxijrodriguez09@gmail.com)
MP_ACCESS_TOKEN
MP_PUBLIC_KEY
MP_WEBHOOK_SECRET
RESEND_API_KEY                 ← ver CREDENTIALS.md
META_APP_ID / META_APP_SECRET
GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
```

### Bot (Railway)

```
SUPABASE_URL
SUPABASE_SERVICE_KEY
BOT_SECRET                     ← mismo valor que en web
WEB_URL                        ← https://responbot.com.ar (para alertas)
BOT_PUBLIC_URL                 ← URL pública del bot (para keepalive)
GROQ_API_KEY
GEMINI_API_KEY
```

---

## Supabase — tablas clave

| Tabla | Descripción |
|---|---|
| `businesses` | Negocios registrados |
| `whatsapp_sessions` | Sesiones y credenciales WhatsApp (cifradas en session_data JSON) |
| `conversations` | Historial de mensajes |
| `channel_connections` | Conexiones MP, Meta, etc. |
| `usage_logs` | Conteo de respuestas por período |

---

## Contacto / emails

- Soporte al cliente: `soporte@responbot.com.ar` (→ forward a `responbot.app@gmail.com` vía ImprovMX)
- Emails automáticos: `noreply@responbot.com.ar` (Resend, dominio verificado)
- Admin: `maxijrodriguez09@gmail.com`
