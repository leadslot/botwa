import { createBrowserClient } from '@supabase/ssr'

// Sanitiza headers que puedan tener chars fuera de ISO-8859-1
// (bug de @supabase/ssr en ciertos entornos/browsers que rompe fetch nativo)
function safeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (init?.headers && !(init.headers instanceof Headers)) {
    const clean: Record<string, string> = {}
    for (const [k, v] of Object.entries(init.headers as Record<string, string>)) {
      // Remover cualquier char > U+00FF que el fetch nativo rechaza en headers
      clean[k] = String(v).replace(/[^\x00-\xFF]/g, '')
    }
    init = { ...init, headers: clean }
  }
  return fetch(input, init as RequestInit)
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { fetch: safeFetch } }
  )
}
