'use client'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Patches window.fetch so every /api/* request automatically includes
 * Authorization: Bearer <token> from the Supabase localStorage session.
 * This fixes all server routes that use createServerClient (which needs cookies),
 * since the session is stored in localStorage and not synced to cookies.
 */
export function AuthFetchPatch() {
  useEffect(() => {
    const originalFetch = window.fetch.bind(window)

    window.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      if (url.startsWith('/api/')) {
        try {
          const { data: { session } } = await createClient().auth.getSession()
          if (session?.access_token) {
            const existingHeaders = new Headers(init?.headers)
            if (!existingHeaders.has('Authorization')) {
              existingHeaders.set('Authorization', `Bearer ${session.access_token}`)
              init = { ...init, headers: existingHeaders }
            }
          }
        } catch { /* ignore */ }
      }
      return originalFetch(input, init)
    }

    return () => { window.fetch = originalFetch }
  }, [])

  return null
}
