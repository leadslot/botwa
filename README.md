# BotWA

Bot de WhatsApp con IA para negocios. El cliente escanea un QR y su WhatsApp queda respondiendo solo 24/7.

## Estructura
- `apps/web` — Panel web (Next.js, deploy en Vercel)  
- `apps/bot` — Servidor del bot (Node.js + Baileys, deploy en Railway)

## Setup rápido

### Bot (Railway)
1. Deploy `apps/bot` en Railway
2. Configurar variables de entorno (ver `.env.example`)

### Web (Vercel)
1. Deploy `apps/web` en Vercel
2. Configurar `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `BOT_SERVER_URL`

### Base de datos
Ejecutar `supabase/schema.sql` en tu proyecto de Supabase.
