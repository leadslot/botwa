import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/supabase/server'

export async function GET() {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'sin sesión' }, { status: 401 })

  const { data, error } = await ctx.adminClient
    .from('business_files')
    .select('id, name, description, url, mimetype, size_bytes, created_at')
    .eq('business_id', ctx.businessId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ files: data ?? [] })
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'sin sesión' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  const name = (form.get('name') as string)?.trim()
  const description = (form.get('description') as string)?.trim() || null

  if (!file || !name) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
  if (file.size > 20 * 1024 * 1024) return NextResponse.json({ error: 'Archivo demasiado grande (máx 20MB)' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
  const storagePath = `${ctx.businessId}/${Date.now()}-${name.replace(/\s+/g, '-')}.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await ctx.adminClient.storage
    .from('business-files')
    .upload(storagePath, arrayBuffer, { contentType: file.type, upsert: false })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = ctx.adminClient.storage
    .from('business-files')
    .getPublicUrl(storagePath)

  const { data, error } = await ctx.adminClient
    .from('business_files')
    .insert({ business_id: ctx.businessId, name, description, url: publicUrl, mimetype: file.type, size_bytes: file.size })
    .select('id, name, description, url, mimetype, size_bytes, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ file: data })
}

export async function DELETE(req: NextRequest) {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'sin sesión' }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

  const { data: file } = await ctx.adminClient
    .from('business_files')
    .select('url')
    .eq('id', id)
    .eq('business_id', ctx.businessId)
    .single()

  if (!file) return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 })

  // Extraer path del storage desde la URL pública
  const urlObj = new URL(file.url)
  const storagePath = urlObj.pathname.split('/business-files/')[1]
  if (storagePath) {
    await ctx.adminClient.storage.from('business-files').remove([storagePath])
  }

  await ctx.adminClient.from('business_files').delete().eq('id', id).eq('business_id', ctx.businessId)
  return NextResponse.json({ ok: true })
}
