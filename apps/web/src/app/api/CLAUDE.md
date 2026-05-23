# API Routes — Auth Rules

NEVER write this pattern (broken with Next.js 16 + localStorage sessions):
```typescript
// ❌ BROKEN
const cookieStore = await cookies()
const supabase = createServerClient(URL, KEY, { cookies: { getAll() { return cookieStore.getAll() } ... } })
const { data: { user } } = await supabase.auth.getUser()
```

ALWAYS use this pattern:
```typescript
// ✅ CORRECT
import { getAuthContext } from '@/lib/supabase/server'
const ctx = await getAuthContext()
if (!ctx) return NextResponse.json({ error: 'No auth' }, { status: 401 })
```
