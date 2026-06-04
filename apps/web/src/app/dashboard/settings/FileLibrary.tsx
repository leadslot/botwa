'use client'

import { useEffect, useRef, useState } from 'react'
import { FileText, Image, Loader2, Paperclip, Trash2, Upload } from 'lucide-react'
import { SectionCard } from '@/components/dashboard/ui'

type BizFile = {
  id: string
  name: string
  description: string | null
  url: string
  mimetype: string
  size_bytes: number | null
  created_at: string
}

function fileIcon(mimetype: string) {
  if (mimetype.startsWith('image/')) return <Image className="h-4 w-4 text-violet-500" />
  return <FileText className="h-4 w-4 text-slate-400" />
}

function fileSize(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function FileLibrary() {
  const [files, setFiles] = useState<BizFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const res = await fetch('/api/business-files').catch(() => null)
    if (res?.ok) {
      const data = await res.json()
      setFiles(data.files ?? [])
    }
    setLoading(false)
  }

  async function upload() {
    if (!selectedFile || !name.trim()) return
    setUploading(true)
    setError(null)
    const form = new FormData()
    form.append('file', selectedFile)
    form.append('name', name.trim())
    form.append('description', description.trim())
    const res = await fetch('/api/business-files', { method: 'POST', body: form }).catch(() => null)
    if (res?.ok) {
      const data = await res.json()
      setFiles(prev => [data.file, ...prev])
      setName('')
      setDescription('')
      setSelectedFile(null)
      if (inputRef.current) inputRef.current.value = ''
    } else {
      const data = await res?.json().catch(() => ({}))
      setError(data?.error ?? 'Error al subir el archivo')
    }
    setUploading(false)
  }

  async function deleteFile(id: string) {
    setDeleting(id)
    const res = await fetch('/api/business-files', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }).catch(() => null)
    if (res?.ok) setFiles(prev => prev.filter(f => f.id !== id))
    setDeleting(null)
  }

  return (
    <SectionCard className="p-5 space-y-5">
      <div>
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-violet-500" />
          Archivos del bot
        </h3>
        <p className="mt-1 text-xs text-slate-500 leading-5">
          Subí PDFs, imágenes o documentos. El bot los manda automáticamente cuando un cliente los pide.
          Describí cuándo debe enviar cada archivo.
        </p>
      </div>

      {/* Upload form */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600">Título</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ej: Lista de precios, Oferta de la semana, Menú..."
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600 mb-1 block">Archivo</label>
          <div
            className="flex flex-col items-center gap-1.5 cursor-pointer rounded-xl border border-dashed border-slate-300 bg-white py-4 hover:border-violet-400 transition-colors"
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="h-5 w-5 text-slate-400" />
            <span className="text-sm text-slate-500">
              {selectedFile ? selectedFile.name : 'Hacé clic para seleccionar'}
            </span>
            <span className="text-xs text-slate-400">PDF, imagen, Word — máx 20 MB</span>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
              onChange={e => {
                const f = e.target.files?.[0] ?? null
                setSelectedFile(f)
                if (f && !name) setName(f.name.replace(/\.[^.]+$/, ''))
              }}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600">¿Cuándo mandarlo? <span className="font-normal text-slate-400">(opcional)</span></label>
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Ej: cuando pidan precios, cuando pregunten por la oferta..."
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400"
          />
        </div>

        <button
          onClick={upload}
          disabled={uploading || !name.trim() || !selectedFile}
          className="w-full rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 hover:bg-violet-700 transition-colors flex items-center justify-center gap-2"
        >
          {uploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Subiendo...</> : 'Subir archivo'}
        </button>

        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>

      {/* File list */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Cargando...</div>
      ) : files.length === 0 ? (
        <p className="text-sm text-slate-400">Todavía no subiste archivos.</p>
      ) : (
        <div className="space-y-2">
          {files.map(f => (
            <div key={f.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-white p-3">
              <div className="flex items-start gap-2.5 min-w-0">
                {fileIcon(f.mimetype)}
                <div className="min-w-0">
                  <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-slate-800 hover:text-violet-600 truncate block">
                    {f.name}
                  </a>
                  {f.description && <p className="text-xs text-slate-500 mt-0.5">{f.description}</p>}
                  <p className="text-xs text-slate-400 mt-0.5">{fileSize(f.size_bytes)}</p>
                </div>
              </div>
              <button
                onClick={() => deleteFile(f.id)}
                disabled={deleting === f.id}
                className="text-slate-300 hover:text-red-500 transition-colors shrink-0"
              >
                {deleting === f.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </button>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  )
}
