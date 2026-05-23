import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Política de Privacidad — Responbot',
  description: 'Política de privacidad y tratamiento de datos personales de Responbot.',
}

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-100 px-6 py-4">
        <Link href="/" className="text-lg font-bold text-slate-900">Responbot</Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12 space-y-8 text-slate-700">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Política de Privacidad</h1>
          <p className="mt-2 text-sm text-slate-500">Última actualización: mayo de 2026</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">1. Introducción</h2>
          <p>Responbot ("nosotros", "nuestro") opera el sitio web responbot.com.ar y los servicios asociados. Esta Política de Privacidad explica cómo recopilamos, usamos, compartimos y protegemos su información personal cuando utiliza nuestro Servicio.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">2. Información que recopilamos</h2>
          <p><strong>Información de cuenta:</strong> nombre, dirección de correo electrónico, datos de la empresa y contraseña al registrarse.</p>
          <p><strong>Datos de uso:</strong> conversaciones gestionadas, métricas de respuesta, configuración de canales y preferencias del bot.</p>
          <p><strong>Datos de integración:</strong> al conectar Google Calendar o Gmail, accedemos a los datos necesarios para proveer la función solicitada (eventos de calendario, correos electrónicos). Estos datos se usan únicamente para operar el Servicio y no se comparten con terceros con fines comerciales.</p>
          <p><strong>Datos de pago:</strong> los pagos se procesan a través de Mercado Pago. No almacenamos datos de tarjetas de crédito.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">3. Uso de la información de Google</h2>
          <p>Responbot usa los datos obtenidos de las APIs de Google (Calendar, Gmail) exclusivamente para proveer las funcionalidades que usted activa. Específicamente:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Google Calendar:</strong> leer disponibilidad y crear eventos de turnos confirmados por sus clientes.</li>
            <li><strong>Gmail:</strong> clasificar correos entrantes y generar borradores de respuesta.</li>
          </ul>
          <p>No usamos estos datos para publicidad, no los vendemos a terceros, y no los compartimos salvo que sea necesario para operar el Servicio o lo requiera la ley.</p>
          <p>El uso de información recibida de las APIs de Google cumple con la <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline">Política de datos de usuario de los servicios de API de Google</a>, incluidos los requisitos de Uso Limitado.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">4. Compartición de datos</h2>
          <p>No vendemos ni alquilamos su información personal. Podemos compartir datos con:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Proveedores de servicio:</strong> Supabase (base de datos), Vercel (hosting), Mercado Pago (pagos), OpenAI (procesamiento de lenguaje natural). Todos operan bajo acuerdos de confidencialidad.</li>
            <li><strong>Requerimientos legales:</strong> cuando la ley lo exija o para proteger derechos legítimos.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">5. Seguridad</h2>
          <p>Implementamos medidas técnicas y organizativas apropiadas para proteger su información, incluyendo cifrado en tránsito (HTTPS/TLS) y en reposo. Los tokens de acceso OAuth se almacenan cifrados y se renuevan automáticamente.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">6. Retención de datos</h2>
          <p>Conservamos sus datos mientras mantenga una cuenta activa. Al cancelar su cuenta, eliminamos sus datos personales en un plazo de 30 días, salvo obligación legal de conservarlos por más tiempo.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">7. Sus derechos</h2>
          <p>Usted tiene derecho a:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Acceder a los datos personales que tenemos sobre usted.</li>
            <li>Solicitar la corrección de datos inexactos.</li>
            <li>Solicitar la eliminación de su cuenta y datos.</li>
            <li>Revocar el acceso a integraciones (Google Calendar, Gmail) desde su panel de control en cualquier momento.</li>
          </ul>
          <p>Para ejercer estos derechos, contáctenos en <a href="mailto:botwa.app@gmail.com" className="text-violet-600 hover:underline">botwa.app@gmail.com</a>.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">8. Cookies</h2>
          <p>Usamos cookies estrictamente necesarias para el funcionamiento del Servicio (autenticación de sesión). No utilizamos cookies de rastreo ni publicidad de terceros.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">9. Cambios a esta política</h2>
          <p>Podemos actualizar esta política periódicamente. Le notificaremos cambios materiales por correo electrónico. El uso continuado del Servicio implica la aceptación de la política actualizada.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">10. Contacto</h2>
          <p>Para consultas sobre privacidad o para ejercer sus derechos: <a href="mailto:botwa.app@gmail.com" className="text-violet-600 hover:underline">botwa.app@gmail.com</a></p>
        </section>
      </main>

      <footer className="border-t border-slate-100 px-6 py-6 text-center text-sm text-slate-400">
        <Link href="/terminos" className="hover:underline">Términos de Servicio</Link>
        {' · '}
        <Link href="/" className="hover:underline">Volver al inicio</Link>
      </footer>
    </div>
  )
}
