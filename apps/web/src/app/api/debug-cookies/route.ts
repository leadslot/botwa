import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const cookieStore = await cookies()
  const all = cookieStore.getAll()
  return NextResponse.json({
    count: all.length,
    cookies: all.map(c => ({ name: c.name, len: c.value.length, preview: c.value.slice(0, 60) }))
  })
}
