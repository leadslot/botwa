import SettingsForm from './SettingsForm'

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-3">
        <h1 className="text-2xl font-black tracking-tight text-slate-950">Configuración del bot</h1>
        <p className="text-sm text-slate-500">Editá cómo responde tu asistente de WhatsApp</p>
      </div>
      <SettingsForm />
    </div>
  )
}
