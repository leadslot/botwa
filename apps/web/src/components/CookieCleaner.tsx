'use client'
// This component is kept for legacy compatibility but the real session-corruption
// fix now lives in instrumentation-client.ts (runs before any module on the client).
// This component is no longer needed — remove it from layouts if present.
export default function CookieCleaner() {
  return null
}
