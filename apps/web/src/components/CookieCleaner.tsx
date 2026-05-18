'use client'
import { useEffect } from 'react'

// Limpia cookies de Supabase que pueden tener chars no-ASCII (bug de versiones previas)
// Solo corre una vez por browser. Soluciona: "non ISO-8859-1 code point" en fetch.
export default function CookieCleaner() {
  useEffect(() => {
    const CLEANED_KEY = 'sb_cookies_cleaned_v1'
    if (typeof window === 'undefined' || localStorage.getItem(CLEANED_KEY)) return

    // Borrar cookies que empiecen con 'sb-' (Supabase auth)
    document.cookie.split(';').forEach(cookie => {
      const name = cookie.split('=')[0].trim()
      if (name.startsWith('sb-')) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
      }
    })

    localStorage.setItem(CLEANED_KEY, '1')
  }, [])

  return null
}
