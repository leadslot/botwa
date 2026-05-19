import { NextResponse, type NextRequest } from 'next/server'

// Lee la sesión leyendo las cookies de Supabase directamente,
// sin instanciar el cliente (evita el TypeError del edge runtime con @supabase/ssr).
function hasSession(request: NextRequest): boolean {
  return request.cookies.getAll().some(
    c => c.name.includes('auth-token') && c.value.length > 10
  )
}

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  const isDashboard = path.startsWith('/dashboard')
  const isAuth = path.startsWith('/login') || path.startsWith('/register')

  if (!isDashboard && !isAuth) return NextResponse.next()

  const session = hasSession(request)

  if (!session && isDashboard) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (session && isAuth) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register'],
}
