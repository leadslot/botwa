import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/supabase/server'

async function getAuth() {
  const ctx = await getAuthContext()
  if (!ctx) return null
  return { adminClient: ctx.adminClient, businessId: ctx.businessId }
}

export async function GET() {
  const auth = await getAuth()
  if (!auth) return NextResponse.json({ drafts: [] })

  const { data } = await auth.adminClient
    .from('email_drafts')
    .select('id, provider, subject, from_email, from_name, original_snippet, draft_body, status, auto_sent, created_at')
    .eq('business_id', auth.businessId)
    .order('created_at', { ascending: false })
    .limit(50)

  return NextResponse.json({ drafts: data ?? [] })
}
