'use client'
import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'

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
  price_list: { name: string; price: string }[] | null
  excluded_numbers: string[] | null
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
      const json = await res.json()
      if (json.business) {
        setBusiness(json.business)
      } else {
        // Sin negocio — ir a onboarding solo si no estamos ya ahí
        if (!window.location.pathname.includes('/onboarding')) {
          window.location.replace('/dashboard/onboarding')
        }
      }
    } catch (e) {
      console.error('DashboardContext error:', e)
    } finally {
      setLoading(false)
    }
  }

  const reload = () => {
    fetched.current = false
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
