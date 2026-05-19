import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request })

  const path = request.nextUrl.pathname
  const isAuthRoute = path.startsWith('/login') || path.startsWith('/register')
  const isDashboard = path.startsWith('/dashboard')

  // Solo corremos la verificación si la ruta lo requiere
  if (!isAuthRoute && !isDashboard) return response

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options ?? {})
            })
          },
        },
      }
    )

    // getSession() lee el JWT local sin network call — más robusto en Edge
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user ?? null

    if (!user && isDashboard) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    if (user && isAuthRoute) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  } catch (err) {
    console.error('[middleware] auth check failed:', err)
    // Si falla la verificación, no bloqueamos — cada página protege sus propios datos
    if (isDashboard) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return response
}

export const config = {
  // Solo rutas que realmente necesitan auth check
  matcher: ['/dashboard/:path*', '/login', '/register'],
}
