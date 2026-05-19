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

  const load = async () => {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { window.location.href = '/login'; return }
      const { data } = await supabase
        .from('businesses')
        .select('id, name, is_paid, plan, messages_used, ai_enabled, ai_prompt, coupon_used, daily_messages_count')
        .eq('user_id', session.user.id)
        .single()
      setBusiness(data)
    } catch (e) {
      console.error('DashboardContext load error:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <DashboardContext.Provider value={{ business, loading, reload: load }}>
      {children}
    </DashboardContext.Provider>
  )
}
