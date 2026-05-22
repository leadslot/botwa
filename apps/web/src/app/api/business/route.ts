import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

function extractAccessToken(cookieStore: Awaited<ReturnType<typeof cookies>>): string | null {
  const all = cookieStore.getAll()

  // Supabase can chunk the token as sb-<ref>-auth-token.0, .1, etc.
  const chunks: Record<number, string> = {}
  let direct: string | null = null

  for (const c of all) {
    if (!c.name.includes('auth-token')) continue
    const chunkMatch = c.name.match(/\.(\d+)$/)
    if (chunkMatch) {
      chunks[parseInt(chunkMatch[1])] = c.value
    } else {
      direct = c.value
    }
  }

  let raw: string | null = null

  if (Object.keys(chunks).length > 0) {
    const sorted = Object.keys(chunks)
      .map(Number)
      .sort((a, b) => a - b)
      .map(k => chunks[k])
    raw = sorted.join('')
  } else if (direct) {
    raw = direct
  }

  if (!raw) return null

  try {
    // Value may be base64url or plain JSON
    let decoded = raw
    if (!raw.startsWith('{') && !raw.startsWith('[')) {
      decoded = Buffer.from(raw.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8')
    }
    const parsed = JSON.parse(decoded)
    return parsed.access_token ?? null
  } catch {
    return null
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies()
    const accessToken = extractAccessToken(cookieStore)

    if (!accessToken) {
      return NextResponse.json({ business: null }, { status: 401 })
    }

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )

    const { data: { user }, error: authError } = await adminClient.auth.getUser(accessToken)
    if (authError || !user) return NextResponse.json({ business: null }, { status: 401 })

    const { data, error: dbError } = await adminClient
      .from('businesses')
      .select('id, name, is_paid, plan, plan_tier, enabled_channels, messages_used, ai_enabled, ai_prompt, coupon_used, daily_messages_count, price_list, excluded_numbers, response_delay_seconds, context_messages, escalation_contact')
      .eq('user_id', user.id)
      .single()

    if (dbError && dbError.code !== 'PGRST116') {
      console.error('/api/business DB error:', dbError)
      return NextResponse.json({ error: 'db_error' }, { status: 500 })
    }

    return NextResponse.json({ business: data ?? null })
  } catch (e) {
    console.error('/api/business error:', e)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
