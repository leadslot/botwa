# Auth Pattern — CRITICAL

## Never use createServerClient directly in route handlers.
Always use getVerifiedUser() or getAuthContext() from @/lib/supabase/server.

## Why
Sessions are stored by the browser client (createBrowserClient from @supabase/ssr).
The middleware (src/middleware.ts) syncs them to cookies on each request.
getVerifiedUser() reads Authorization header first, then cookies — works in both cases.

## Pattern for every new API route:
```typescript
import { getAuthContext } from '@/lib/supabase/server'

export async function GET() {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'No auth' }, { status: 401 })
  const { user, businessId, adminClient } = ctx
  // ... business logic
}
```

## If you see "empty dashboard" or 401 errors on all routes:
1. Check https://domain.com/api/debug-cookies — should NOT be empty
2. If empty: middleware is not running or client is not using createBrowserClient
3. Verify src/middleware.ts exists and exports `middleware` function
