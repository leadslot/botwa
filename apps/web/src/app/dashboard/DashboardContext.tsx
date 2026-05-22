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
  context_messages: number | null
}

type DashboardData = {
  business: Business | null
  loading: boolean
  loadError: boolean
  reload: () => void
}

const DashboardContext = createContext<DashboardData>({ business: null, loading: true, loadError: false, reload: () => {} })

export function useDashboard() {
  return useContext(DashboardContext)
}

const RETRY_DELAYS = [1000, 3000] // 2 reintentos: 1s y 3s

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const fetched = useRef(false)

  const fetchBusiness = async (attempt = 0) => {
    if (fetched.current) return
    fetched.current = true
    try {
      const res = await fetch('/api/business')

      // 401 = sin sesión, estado esperado para usuario no logueado
      if (res.status === 401) {
        setLoading(false)
        return
      }

      // 5xx = error de servidor → reintentar automáticamente
      if (res.status >= 500) {
        if (attempt < RETRY_DELAYS.length) {
          console.warn(`DashboardContext: error ${res.status}, reintentando en ${RETRY_DELAYS[attempt]}ms`)
          fetched.current = false
          setTimeout(() => fetchBusiness(attempt + 1), RETRY_DELAYS[attempt])
          return
        }
        // Agotamos reintentos — mostrar error real, no onboarding falso
        console.error('DashboardContext: /api/business falló después de reintentos')
        setLoadError(true)
        setLoading(false)
        return
      }

      const json = await res.json()
      if (json.business) {
        setBusiness(json.business)
        setLoadError(false)
      }
      // business: null con 200 = usuario sin negocio configurado (estado real)
    } catch (e) {
      // Error de red — reintentar si hay intentos disponibles
      if (attempt < RETRY_DELAYS.length) {
        fetched.current = false
        setTimeout(() => fetchBusiness(attempt + 1), RETRY_DELAYS[attempt])
        return
      }
      console.error('DashboardContext error de red:', e)
      setLoadError(true)
    } finally {
      if (attempt === 0 || fetched.current) setLoading(false)
    }
  }

  const reload = () => {
    fetched.current = false
    setLoadError(false)
    setBusiness(prev => prev) // mantener datos actuales mientras recarga
    fetchBusiness()
  }

  useEffect(() => {
    fetchBusiness()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <DashboardContext.Provider value={{ business, loading, loadError, reload }}>
      {children}
    </DashboardContext.Provider>
  )
}
