import SettingsForm from './SettingsForm'

export default function SettingsPage() {
  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">Configuración del bot</h1>
        <p className="text-gray-500">Editá cómo responde tu asistente de WhatsApp</p>
      </div>
      <SettingsForm />
    </div>
  )
}
