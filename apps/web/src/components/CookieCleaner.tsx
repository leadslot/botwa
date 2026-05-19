'use client'
import { useEffect } from 'react'

// Parchea window.fetch globalmente para sanitizar headers con chars non-ISO-8859-1.
// Supabase guarda la sesión en cookies como JSON (incluye email y metadata),
// y al hacer auto-refresh esos valores van como header values — Chrome los rechaza.
export default function CookieCleaner() {
  useEffect(() => {
    if (typeof window === 'undefined' || (window as any).__fetchPatched) return

    const _fetch = window.fetch.bind(window)
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.headers) {
        const entries: [string, string][] =
          init.headers instanceof Headers
            ? [...(init.headers as Headers).entries()]
            : Object.entries(init.headers as Record<string, string>)
        const sanitized: Record<string, string> = {}
        for (const [k, v] of entries) {
          // Elimina cualquier carácter fuera de ISO-8859-1 (> U+00FF)
          sanitized[k] = String(v).replace(/[^\x00-\xFF]/g, '')
        }
        init = { ...init, headers: sanitized }
      }
      return _fetch(input, init)
    }
    ;(window as any).__fetchPatched = true

    // También limpiar cookies de Supabase con valores potencialmente corruptos
    // para forzar un login limpio
    const CLEANED_KEY = 'sb_cookies_cleaned_v2'
    if (!localStorage.getItem(CLEANED_KEY)) {
      document.cookie.split(';').forEach(cookie => {
        const name = cookie.split('=')[0].trim()
        if (name.startsWith('sb-')) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
        }
      })
      localStorage.removeItem('supabase.auth.token')
      localStorage.setItem(CLEANED_KEY, '1')
    }
  }, [])

  return null
}
