'use client'
import { createBrowserClient } from '@supabase/ssr'

// Chrome/Fetch API rechaza headers con caracteres fuera de ISO-8859-1.
// El cliente de Supabase a veces los genera. Este wrapper los sanitiza antes de enviar.
const safeFetch: typeof fetch = (input, init) => {
  if (init?.headers) {
    const sanitized: Record<string, string> = {}
    const entries =
      init.headers instanceof Headers
        ? [...init.headers.entries()]
        : Object.entries(init.headers as Record<string, string>)
    for (const [k, v] of entries) {
      // Reemplaza cualquier char fuera de ISO-8859-1 (> U+00FF)
      sanitized[k] = String(v).replace(/[^\x00-\xFF]/g, '')
    }
    init = { ...init, headers: sanitized }
  }
  return fetch(input, init)
}

let _client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (!_client) {
    _client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { fetch: safeFetch } }
    )
  }
  return _client
}
