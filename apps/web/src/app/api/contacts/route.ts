import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

async function getAuth() {
  const cookieStore = await cookies()
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return null
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )
  const { data: business } = await adminClient
    .from('businesses').select('id').eq('user_id', user.id).single()
  return business ? { adminClient, businessId: business.id } : null
}

// GET — listar contactos del negocio
export async function GET() {
  const auth = await getAuth()
  if (!auth) return NextResponse.json({ contacts: [] })
  const { adminClient, businessId } = auth
  const { data } = await adminClient
    .from('contacts')
    .select('id, name, phone, lid, created_at')
    .eq('business_id', businessId)
    .order('name')
  return NextResponse.json({ contacts: data ?? [] })
}

// POST — guardar lista de contactos (del CSV) y disparar resolución de LIDs
export async function POST(req: Request) {
  const auth = await getAuth()
  if (!auth) return NextResponse.json({ error: 'No auth' }, { status: 401 })
  const { adminClient, businessId } = auth

  const { contacts } = await req.json() as { contacts: { name: string; phone: string }[] }
  if (!Array.isArray(contacts) || contacts.length === 0) {
    return NextResponse.json({ error: 'Lista vacía' }, { status: 400 })
  }

  // Guardar en Supabase (upsert por phone)
  const rows = contacts.map(c => ({
    business_id: businessId,
    name: c.name.trim(),
    phone: c.phone.replace(/\D/g, ''),
  }))

  const { error } = await adminClient
    .from('contacts')
    .upsert(rows, { onConflict: 'business_id,phone', ignoreDuplicates: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Disparar resolución de LIDs en segundo plano (no bloquea la respuesta)
  resolveLidsAsync(businessId, rows.map(r => r.phone), adminClient).catch(() => {})

  return NextResponse.json({ ok: true, saved: rows.length })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resolveLidsAsync(
  businessId: string,
  phones: string[],
  adminClient: any
) {
  const BOT_URL = process.env.BOT_SERVER_URL || 'http://localhost:3001'
  try {
    const r = await fetch(`${BOT_URL}/session/resolve-lids`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId, phones }),
    })
    if (!r.ok) return
    const { results } = await r.json() as { results: { phone: string; lid: string | null }[] }
    for (const { phone, lid } of results) {
      if (!lid) continue
      const cleanLid = lid.replace('@lid', '').replace('@s.whatsapp.net', '')
      await adminClient
        .from('contacts')
        .update({ lid: cleanLid })
        .eq('business_id', businessId)
        .eq('phone', phone)
    }
  } catch {}
}
