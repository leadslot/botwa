import SettingsForm from './SettingsForm'

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6">
        <h1 className="text-4xl font-black tracking-tight text-slate-950">Configuración del bot</h1>
        <p className="mt-1 text-lg text-slate-500">Editá cómo responde tu asistente de WhatsApp</p>
      </div>
      <SettingsForm />
    </div>
  )
}
