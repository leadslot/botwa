import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/supabase/server'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'maxijrodriguez09@gmail.com'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'No auth' }, { status: 401 })
  if (ctx.user.email !== ADMIN_EMAIL) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { adminClient } = ctx

  // Fetch the request
  const { data: addonReq, error: fetchErr } = await adminClient
    .from('addon_requests')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchErr || !addonReq) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  if (addonReq.status !== 'pendiente') return NextResponse.json({ error: 'La solicitud ya fue procesada' }, { status: 409 })

  // Apply extras to business
  const { error: bizErr } = await adminClient.rpc('increment_business_extras', {
    p_business_id: addonReq.business_id,
    p_responses: addonReq.responses_added,
    p_emails: addonReq.emails_added,
  })

  if (bizErr) {
    // Fallback: manual update
    const { data: biz } = await adminClient
      .from('businesses')
      .select('extra_responses, extra_emails')
      .eq('id', addonReq.business_id)
      .single()

    if (biz) {
      await adminClient
        .from('businesses')
        .update({
          extra_responses: (biz.extra_responses || 0) + addonReq.responses_added,
          extra_emails: (biz.extra_emails || 0) + addonReq.emails_added,
        })
        .eq('id', addonReq.business_id)
    }
  }

  // Mark as activo
  const { error: updErr } = await adminClient
    .from('addon_requests')
    .update({ status: 'activo', updated_at: new Date().toISOString() })
    .eq('id', id)

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'No auth' }, { status: 401 })
  if (ctx.user.email !== ADMIN_EMAIL) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { adminClient } = ctx

  const { error } = await adminClient
    .from('addon_requests')
    .update({ status: 'rechazado', updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
