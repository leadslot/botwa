'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import SetupWizard from '@/app/dashboard/settings/SetupWizard'

export default function OnboardingPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [existingBusiness, setExistingBusiness] = useState<{ id: string } | null>(null)

  useEffect(() => {
    const check = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      const { data } = await supabase
        .from('businesses').select('id').eq('user_id', user.id).single()
      if (data) {
        // already configured — send to settings
        router.replace('/dashboard/settings')
        return
      }
      setChecking(false)
    }
    check()
  }, [router])

  const handleSaved = async (prompt: string) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/login'); return }

    // Verificar si ya existe un negocio configurado — nunca sobreescribir config real
    const { data: existing } = await supabase
      .from('businesses').select('id, ai_prompt').eq('user_id', user.id).single()

    if (existing) {
      // Si ya tiene prompt real, no lo pisamos — ir directo a settings
      if (existing.ai_prompt && existing.ai_prompt.length > 50) {
        router.push('/dashboard/settings')
        return
      }
      // Tiene registro pero prompt vacío/corto — actualizarlo
      await supabase.from('businesses').update({
        name: extractBusinessName(prompt),
        ai_prompt: prompt,
        ai_enabled: true,
      }).eq('id', existing.id)
    } else {
      await supabase.from('businesses').insert({
        user_id: user.id,
        name: extractBusinessName(prompt),
        ai_prompt: prompt,
        ai_enabled: true,
        messages_used: 0,
      })
    }
    router.push('/dashboard/connect')
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <SetupWizard
        onClose={() => {/* can't close during onboarding */}}
        onSaved={handleSaved}
      />
    </div>
  )
}

// Extract business name from the generated prompt (first line "Sos X de Y")
function extractBusinessName(prompt: string): string {
  const match = prompt.match(/^Sos .+ de (.+?) \(/)
  return match?.[1] ?? 'Mi negocio'
}
