/**
 * Next.js 16 client instrumentation hook.
 * Runs before any app module is evaluated on the client.
 * Clears corrupt Supabase sessions that contain non-ISO-8859-1 characters,
 * which cause `fetch` to throw "String contains non ISO-8859-1 code point"
 * when the stored JWT is passed as an Authorization header.
 */
export function register() {
  if (typeof window === 'undefined') return

  // Clear any Supabase session whose stored access_token contains
  // characters outside ISO-8859-1 (U+0100 and above). These corrupt tokens
  // are written when user metadata contains non-Latin characters and get
  // decoded incorrectly by an older version of @supabase/ssr.
  try {
    const ISO_SAFE = /^[\x00-\xFF]*$/

    // Supabase @supabase/ssr stores sessions in cookies named
    // sb-<ref>-auth-token (and .0, .1 chunks). We clear the whole
    // auth storage for this origin if any chunk is corrupt.
    const cookies = document.cookie.split(';')
    let corrupt = false

    for (const raw of cookies) {
      const [name, ...rest] = raw.split('=')
      const cookieName = name.trim()
      if (!cookieName.startsWith('sb-') || !cookieName.endsWith('-auth-token') && !cookieName.match(/-auth-token\.\d+$/)) continue
      const value = rest.join('=').trim()
      if (!value) continue

      // Decode base64url if prefixed
      let decoded = value
      if (value.startsWith('base64-')) {
        try {
          decoded = atob(value.slice(7).replace(/-/g, '+').replace(/_/g, '/'))
        } catch {
          corrupt = true
          break
        }
      }

      if (!ISO_SAFE.test(decoded)) {
        corrupt = true
        break
      }
    }

    if (corrupt) {
      // Expire all sb-* cookies for this path
      for (const raw of cookies) {
        const name = raw.split('=')[0].trim()
        if (name.startsWith('sb-')) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
        }
      }
      // Clear localStorage keys for this Supabase project
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('sb-')) {
          localStorage.removeItem(key)
        }
      }
      console.warn('[responbot] Cleared corrupt Supabase session (non-ISO-8859-1 token detected)')
    }
  } catch (e) {
    // Storage may be blocked (private browsing restrictions etc.) — safe to ignore
    console.warn('[responbot] Could not inspect Supabase session storage:', e)
  }
}
