/**
 * GET /api/agenda/availability?business_id=&service_id=&date=YYYY-MM-DD
 * Returns available 30-min slots for the given date and service.
 * Used by the bot to offer time slots to customers.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )
}

// Business hours: 09:00 - 20:00 Argentina time
const BUSINESS_START = 9
const BUSINESS_END = 20
const SLOT_MINUTES = 30

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const businessId = searchParams.get('business_id')
  const serviceId = searchParams.get('service_id')
  const date = searchParams.get('date') // YYYY-MM-DD

  if (!businessId || !date) {
    return NextResponse.json({ error: 'business_id y date requeridos' }, { status: 400 })
  }

  // Get service duration
  const adminClient = getAdminClient()
  let durationMinutes = 60
  if (serviceId) {
    const { data: svc } = await adminClient
      .from('agenda_services')
      .select('duration_minutes')
      .eq('id', serviceId)
      .single()
    if (svc) durationMinutes = svc.duration_minutes
  }

  // Date range for the day (Argentina = UTC-3)
  const dayStart = new Date(`${date}T${String(BUSINESS_START).padStart(2,'0')}:00:00-03:00`)
  const dayEnd   = new Date(`${date}T${String(BUSINESS_END).padStart(2,'0')}:00:00-03:00`)

  // Get existing appointments (pending or confirmed) that day
  const { data: existing } = await adminClient
    .from('appointments')
    .select('start_at, end_at, status')
    .eq('business_id', businessId)
    .in('status', ['pending_payment', 'confirmed'])
    .gte('start_at', dayStart.toISOString())
    .lte('start_at', dayEnd.toISOString())

  // Get Google Calendar events that day
  const { data: calConn } = await adminClient
    .from('channel_connections')
    .select('metadata')
    .eq('business_id', businessId)
    .eq('channel', 'calendar_google')
    .eq('status', 'active')
    .single()

  const busySlots: { start: Date; end: Date }[] = []

  // Add existing appointments to busy
  for (const appt of existing ?? []) {
    busySlots.push({ start: new Date(appt.start_at), end: new Date(appt.end_at) })
  }

  // Add Google Calendar events to busy
  if (calConn?.metadata) {
    const meta = calConn.metadata as Record<string, string>
    const token = meta.access_token
    if (token) {
      try {
        const gcalRes = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(dayStart.toISOString())}&timeMax=${encodeURIComponent(dayEnd.toISOString())}&singleEvents=true`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        const gcal = await gcalRes.json()
        for (const ev of gcal.items ?? []) {
          const s = ev.start?.dateTime ?? ev.start?.date
          const e = ev.end?.dateTime ?? ev.end?.date
          if (s && e) busySlots.push({ start: new Date(s), end: new Date(e) })
        }
      } catch {}
    }
  }

  // Generate available slots
  const slots: string[] = []
  const slotsNeeded = Math.ceil(durationMinutes / SLOT_MINUTES)
  const totalSlots = ((BUSINESS_END - BUSINESS_START) * 60) / SLOT_MINUTES

  for (let i = 0; i <= totalSlots - slotsNeeded; i++) {
    const slotStart = new Date(dayStart.getTime() + i * SLOT_MINUTES * 60000)
    const slotEnd   = new Date(slotStart.getTime() + durationMinutes * 60000)

    const overlaps = busySlots.some(b =>
      slotStart < b.end && slotEnd > b.start
    )

    if (!overlaps) {
      slots.push(slotStart.toLocaleTimeString('es-AR', {
        hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires'
      }))
    }
  }

  return NextResponse.json({ date, duration_minutes: durationMinutes, slots })
}
