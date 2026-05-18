import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SettingsForm from './SettingsForm'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) redirect('/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, ai_prompt, ai_enabled')
    .eq('user_id', session.user.id)
    .single()

  if (!business) redirect('/dashboard/onboarding')

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">Configuración del bot</h1>
        <p className="text-gray-500">Editá cómo responde tu asistente de WhatsApp</p>
      </div>
      <SettingsForm business={business} />
    </div>
  )
}
