import { createServerClient } from '@supabase/ssr'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { cookies, headers } from 'next/headers'

function extractAccessToken(cookieStore: Awaited<ReturnType<typeof cookies>>): string | null {
  const all = cookieStore.getAll()
  const chunks: Record<number, string> = {}
  let direct: string | null = null

  for (const c of all) {
    if (!c.name.includes('auth-token')) continue
    const m = c.name.match(/\.(\d+)$/)
    if (m) chunks[parseInt(m[1])] = c.value
    else direct = c.value
  }

  let raw: string | null = null
  if (Object.keys(chunks).length > 0) {
    raw = Object.keys(chunks).map(Number).sort((a, b) => a - b).map(k => chunks[k]).join('')
  } else {
    raw = direct
  }

  if (!raw) return null
  try {
    let decoded = raw
    if (!raw.startsWith('{') && !raw.startsWith('[')) {
      decoded = Buffer.from(raw.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8')
    }
    return JSON.parse(decoded).access_token ?? null
  } catch { return null }
}

/** Devuelve el usuario verificado contra Supabase.
 *  Intenta en orden: Authorization header → cookies */
export async function getVerifiedUser() {
  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

  // 1. Authorization: Bearer <token> (localStorage-based sessions)
  try {
    const headerStore = await headers()
    const auth = headerStore.get('authorization') ?? headerStore.get('Authorization')
    if (auth?.startsWith('Bearer ')) {
      const token = auth.slice(7)
      const { data: { user }, error } = await admin.auth.getUser(token)
      if (!error && user) return user
    }
  } catch { /* headers() no disponible en este contexto */ }

  // 2. Cookies (cookie-based sessions)
  const cookieStore = await cookies()
  const token = extractAccessToken(cookieStore)
  if (!token) return null
  const { data: { user }, error } = await admin.auth.getUser(token)
  if (error || !user) return null
  return user
}

/** Devuelve { user, businessId, adminClient } o null si no autenticado */
export async function getAuthContext() {
  const user = await getVerifiedUser()
  if (!user) return null
  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
  const { data: business } = await admin.from('businesses').select('id').eq('user_id', user.id).single()
  if (!business) return null
  return { user, businessId: business.id as string, adminClient: admin }
}

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
