import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPasswordResetEmail } from '@/lib/mailer'

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email requerido' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  // Generar link de reset desde Supabase
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: {
      redirectTo: 'https://responbot.com.ar/auth/reset',
    },
  })

  if (error || !data?.properties?.action_link) {
    // No revelar si el email existe o no
    return NextResponse.json({ ok: true })
  }

  await sendPasswordResetEmail({
    to: email,
    resetUrl: data.properties.action_link,
  }).catch(() => {})

  return NextResponse.json({ ok: true })
}
