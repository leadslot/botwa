'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'

type Business = {
  id: string
  name: string
  is_paid: boolean
  plan: string | null
  messages_used: number
  ai_enabled: boolean
  ai_prompt: string | null
  coupon_used: string | null
  daily_messages_count: number
}

type DashboardData = {
  business: Business | null
  loading: boolean
  reload: () => void
}

const DashboardContext = createContext<DashboardData>({ business: null, loading: true, reload: () => {} })

export function useDashboard() {
  return useContext(DashboardContext)
}

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchBusiness = async (userId: string) => {
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('businesses')
        .select('id, name, is_paid, plan, messages_used, ai_enabled, ai_prompt, coupon_used, daily_messages_count')
        .eq('user_id', userId)
        .single()
      setBusiness(data)
    } catch (e) {
      console.error('DashboardContext fetchBusiness error:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const supabase = createClient()
    // onAuthStateChange es el método confiable — dispara cuando la sesión está disponible
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      if (session?.user) {
        fetchBusiness(session.user.id)
      } else {
        // Sin sesión → redirigir (el middleware también protege, esto es fallback)
        setLoading(false)
        window.location.href = '/login'
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  return (
    <DashboardContext.Provider value={{ business, loading, reload: () => {} }}>
      {children}
    </DashboardContext.Provider>
  )
}
