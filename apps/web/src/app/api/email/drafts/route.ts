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
  const { data: { session } } = await authClient.auth.getSession()
  if (!session?.user) return null
  const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
  const { data: business } = await adminClient.from('businesses').select('id').eq('user_id', session.user.id).single()
  return business ? { adminClient, businessId: business.id } : null
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
