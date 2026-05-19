// Corre ANTES de React hydration — el punto más temprano posible en Next.js 16.
// 1. Limpia sesiones de Supabase corruptas (con chars non-ISO-8859-1) que rompen fetch.
// 2. Parchea window.fetch para sanear headers en todos los llamados posteriores.

try {
  // — Limpiar sesiones corruptas de localStorage
  const keysToDelete: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && (key.startsWith('sb-') || key === 'supabase.auth.token')) {
      keysToDelete.push(key)
    }
  }
  // Solo borra si hay chars fuera de ISO-8859-1 (token corrupto)
  for (const key of keysToDelete) {
    const val = localStorage.getItem(key) ?? ''
    if (/[^\x00-\xFF]/.test(val)) {
      localStorage.removeItem(key)
      console.warn('[BotWA] Removed corrupt Supabase session:', key)
    }
  }
} catch {}

try {
  // — Parchear window.fetch para sanear headers (defensa en profundidad)
  if (!(window as any).__fp) {
    const _f = window.fetch.bind(window)
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.headers) {
        const entries: [string, string][] =
          init.headers instanceof Headers
            ? [...(init.headers as Headers).entries()]
            : Object.entries(init.headers as Record<string, string>)
        const sanitized: Record<string, string> = {}
        for (const [k, v] of entries) {
          sanitized[k] = String(v).replace(/[^\x00-\xFF]/g, '')
        }
        init = { ...init, headers: sanitized }
      }
      return _f(input, init)
    }
    ;(window as any).__fp = 1
  }
} catch {}
