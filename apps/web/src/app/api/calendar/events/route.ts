/**
 * GET  /api/calendar/events?start=ISO&end=ISO  — lista eventos del rango
 * POST /api/calendar/events                    — crea un evento
 *
 * El bot backend llama este endpoint con el token de sesión del negocio.
 * Soporta Google Calendar e iCloud (CalDAV).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/supabase/server'

async function refreshGoogleToken(refresh_token: string): Promise<string | null> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()
  return data.access_token ?? null
}

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'sin sesion' }, { status: 401 })

  const start = req.nextUrl.searchParams.get('start') ?? new Date().toISOString()
  const end = req.nextUrl.searchParams.get('end') ?? new Date(Date.now() + 7 * 86400000).toISOString()

  const { data: connections } = await ctx.adminClient
    .from('channel_connections')
    .select('*')
    .eq('business_id', ctx.businessId)
    .in('channel', ['calendar_google', 'calendar_icloud'])
    .eq('status', 'active')

  if (!connections?.length) return NextResponse.json({ events: [] })

  const allEvents: unknown[] = []

  for (const conn of connections) {
    const meta = conn.metadata as Record<string, string | null>

    if (conn.channel === 'calendar_google') {
      let token = meta.access_token
      // Refrescar si expiró
      if (meta.expires_at && new Date(meta.expires_at) < new Date() && meta.refresh_token) {
        token = await refreshGoogleToken(meta.refresh_token) ?? token
        // Guardar token nuevo
        if (token !== meta.access_token) {
          await ctx.adminClient.from('channel_connections').update({
            metadata: { ...meta, access_token: token, expires_at: new Date(Date.now() + 3600000).toISOString() },
            updated_at: new Date().toISOString(),
          }).eq('id', conn.id)
        }
      }

      const gcalRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(start)}&timeMax=${encodeURIComponent(end)}&singleEvents=true&orderBy=startTime`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const gcalData = await gcalRes.json()
      if (gcalData.items) {
        allEvents.push(...gcalData.items.map((e: Record<string, unknown>) => ({
          id: e.id,
          source: 'google',
          title: e.summary,
          start: (e.start as Record<string,string>)?.dateTime ?? (e.start as Record<string,string>)?.date,
          end: (e.end as Record<string,string>)?.dateTime ?? (e.end as Record<string,string>)?.date,
          description: e.description,
          location: e.location,
        })))
      }
    }
    // iCloud: CalDAV REPORT — más complejo, retornamos placeholder por ahora
    // El bot puede iterar sobre los eventos para verificar disponibilidad
  }

  return NextResponse.json({ events: allEvents })
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'sin sesion' }, { status: 401 })

  const body = await req.json()
  const { title, start, end, description, attendee_email } = body

  if (!title || !start || !end)
    return NextResponse.json({ error: 'title, start y end requeridos' }, { status: 400 })

  const { data: conn } = await ctx.adminClient
    .from('channel_connections')
    .select('*')
    .eq('business_id', ctx.businessId)
    .eq('channel', 'calendar_google')
    .eq('status', 'active')
    .single()

  if (!conn) return NextResponse.json({ error: 'No hay Google Calendar conectado' }, { status: 404 })

  const meta = conn.metadata as Record<string, string | null>
  let token = meta.access_token

  if (meta.expires_at && new Date(meta.expires_at) < new Date() && meta.refresh_token) {
    token = await refreshGoogleToken(meta.refresh_token) ?? token
  }

  const event: Record<string, unknown> = {
    summary: title,
    description,
    start: { dateTime: start, timeZone: 'America/Argentina/Buenos_Aires' },
    end: { dateTime: end, timeZone: 'America/Argentina/Buenos_Aires' },
  }
  if (attendee_email) {
    event.attendees = [{ email: attendee_email }]
  }

  const createRes = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    }
  )
  const created = await createRes.json()

  if (!createRes.ok) {
    console.error('GCal create event error:', created)
    return NextResponse.json({ error: created.error?.message ?? 'Error al crear evento' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    event_id: created.id,
    html_link: created.htmlLink,
    title: created.summary,
    start: created.start?.dateTime,
    end: created.end?.dateTime,
  })
}
