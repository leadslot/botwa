import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

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

export async function GET(request: NextRequest) {
  try {
    // Prefer Authorization header (localStorage-based sessions)
    let accessToken = request.headers.get('Authorization')?.replace('Bearer ', '') ?? null

    // Fallback: try to extract from cookies (cookie-based sessions)
    if (!accessToken) {
      const cookieStore = await cookies()
      accessToken = extractAccessToken(cookieStore)
    }

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
      .select('id, name, is_paid, plan, plan_tier, enabled_channels, messages_used, ai_enabled, ai_prompt, coupon_used, daily_messages_count, price_list, excluded_numbers, response_delay_seconds, context_messages, escalation_contact, monthly_responses_used, monthly_emails_used, extra_responses, extra_emails, cycle_start_date, mp_subscription_id, bonus_responses, bonus_emails, bonus_note, first_month_paid')
      .eq('user_id', user.id)
      .single()

    if (dbError && dbError.code !== 'PGRST116') {
      console.error('/api/business DB error:', dbError)
      return NextResponse.json({ error: 'db_error' }, { status: 500 })
    }

    // Lazy cycle reset: if 30 days have passed since cycle_start_date, roll it forward
    if (data?.cycle_start_date) {
      const cycleStart = new Date(data.cycle_start_date)
      const now = new Date()
      const daysSinceCycleStart = Math.floor((now.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24))
      if (daysSinceCycleStart >= 30) {
        // Advance cycle_start_date by N full 30-day periods
        const periodsElapsed = Math.floor(daysSinceCycleStart / 30)
        const newCycleStart = new Date(cycleStart)
        newCycleStart.setDate(newCycleStart.getDate() + periodsElapsed * 30)
        await adminClient
          .from('businesses')
          .update({
            monthly_responses_used: 0,
            monthly_emails_used: 0,
            cycle_start_date: newCycleStart.toISOString().split('T')[0],
          })
          .eq('id', data.id)
        data.monthly_responses_used = 0
        data.monthly_emails_used = 0
        data.cycle_start_date = newCycleStart.toISOString().split('T')[0]
      }
    }

    return NextResponse.json({ business: data ?? null })
  } catch (e) {
    console.error('/api/business error:', e)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
