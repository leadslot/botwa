import { NextResponse } from 'next/server'
export async function GET() {
  const secret = process.env.META_APP_SECRET
  return NextResponse.json({ secret_set: !!secret, secret_length: secret?.length ?? 0, app_id: process.env.META_APP_ID })
}
