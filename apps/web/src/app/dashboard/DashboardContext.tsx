'use client'
import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'

type Business = {
  id: string
  name: string
  is_paid: boolean
  plan: string | null
  plan_tier: string | null
  enabled_channels: string[] | null
  messages_used: number
  ai_enabled: boolean
  ai_prompt: string | null
  coupon_used: string | null
  daily_messages_count: number
  price_list: { name: string; price: string }[] | null
  excluded_numbers: string[] | null
  response_delay_seconds: number | null
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
  const fetched = useRef(false)

  const fetchBusiness = async () => {
    if (fetched.current) return
    fetched.current = true
    try {
      const res = await fetch('/api/business')
      if (!res.ok) {
        // Error de red o server — NO redirigir, solo loggear
        console.error('DashboardContext: /api/business returned', res.status)
        setLoading(false)
        return
      }
      const json = await res.json()
      if (json.business) {
        setBusiness(json.business)
      }
      // Si business es null: no redirigir automáticamente.
      // Puede ser error transitorio de sesión o de red.
      // El usuario verá el dashboard vacío y podrá navegar normalmente.
    } catch (e) {
      // Error de red — NO redirigir, mantener estado anterior
      console.error('DashboardContext error:', e)
    } finally {
      setLoading(false)
    }
  }

  const reload = () => {
    fetched.current = false
    setBusiness(prev => prev) // mantener datos actuales mientras recarga
    fetchBusiness()
  }

  useEffect(() => {
    fetchBusiness()
  }, [])

  return (
    <DashboardContext.Provider value={{ business, loading, reload }}>
      {children}
    </DashboardContext.Provider>
  )
}
