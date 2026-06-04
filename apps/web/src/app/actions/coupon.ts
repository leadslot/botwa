'use server'
import { getAuthContext } from '@/lib/supabase/server'

export async function applyCoupon(code: string) {
  const ctx = await getAuthContext()
  if (!ctx) return { error: 'No autenticado' }
  const { businessId: id, adminClient: supabase } = ctx

  const business = { id }

  const { data, error } = await supabase.rpc('apply_coupon', {
    p_business_id: business.id,
    p_code: code,
  })

  if (error) return { error: 'Error al aplicar el código. Intentá de nuevo.' }
  return data as { success?: boolean; error?: string; type?: string }
}
