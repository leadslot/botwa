import { createServerClient } from '@supabase/ssr'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

/** Devuelve el usuario verificado contra Supabase (getUser, no getSession) */
export async function getVerifiedUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
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
