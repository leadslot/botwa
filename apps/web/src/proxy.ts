import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request })
  const path = request.nextUrl.pathname
  const isDashboard = path.startsWith('/dashboard')
  const isAuth = path.startsWith('/login') || path.startsWith('/register')
  if (!isDashboard && !isAuth) return response

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => request.cookies.getAll(), setAll: (cs) => cs.forEach(({name,value,options}) => response.cookies.set(name,value,options??{})) } }
  )
  const { data: { session } } = await supabase.auth.getSession()
  if (!session && isDashboard) return NextResponse.redirect(new URL('/login', request.url))
  if (session && isAuth) return NextResponse.redirect(new URL('/dashboard', request.url))
  return response
}

export const config = { matcher: ['/dashboard/:path*', '/login', '/register'] }
