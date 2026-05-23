import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/supabase/server'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'maxijrodriguez09@gmail.com'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'No auth' }, { status: 401 })
  if (ctx.user.email !== ADMIN_EMAIL) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { adminClient } = ctx
  const { bonus_responses, bonus_emails, bonus_note, reset } = await req.json()

  const { data: biz } = await adminClient
    .from('businesses')
    .select('bonus_responses, bonus_emails')
    .eq('id', id)
    .single()

  if (!biz) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })

  const update: Record<string, unknown> = {}

  if (reset) {
    // Limpiar bonificaciones
    update.bonus_responses = 0
    update.bonus_emails = 0
    update.bonus_note = null
  } else {
    // Sumar a los bonos existentes
    if (typeof bonus_responses === 'number') update.bonus_responses = (biz.bonus_responses || 0) + bonus_responses
    if (typeof bonus_emails === 'number') update.bonus_emails = (biz.bonus_emails || 0) + bonus_emails
    if (bonus_note) update.bonus_note = bonus_note
  }

  const { error } = await adminClient.from('businesses').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
