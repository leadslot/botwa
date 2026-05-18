'use server'
import { createClient } from '@/lib/supabase/server'

export async function applyCoupon(code: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!business) return { error: 'Negocio no encontrado' }

  const { data, error } = await supabase.rpc('apply_coupon', {
    p_business_id: business.id,
    p_code: code,
  })

  if (error) return { error: 'Error al aplicar el código. Intentá de nuevo.' }
  return data as { success?: boolean; error?: string; type?: string }
}
