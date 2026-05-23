import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Términos de Servicio — Responbot',
  description: 'Términos y condiciones de uso del servicio Responbot.',
}

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-100 px-6 py-4">
        <Link href="/" className="text-lg font-bold text-slate-900">Responbot</Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12 space-y-8 text-slate-700">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Términos de Servicio</h1>
          <p className="mt-2 text-sm text-slate-500">Última actualización: mayo de 2026</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">1. Aceptación de los términos</h2>
          <p>Al acceder o utilizar Responbot ("el Servicio"), usted acepta quedar obligado por estos Términos de Servicio. Si no acepta estos términos, no utilice el Servicio.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">2. Descripción del Servicio</h2>
          <p>Responbot es una plataforma de automatización de atención al cliente que permite a negocios conectar y gestionar conversaciones de WhatsApp, correo electrónico, redes sociales y otros canales mediante inteligencia artificial. El Servicio incluye, entre otras funciones, respuestas automáticas, gestión de calendarios, recordatorios y CRM básico.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">3. Uso de servicios de terceros</h2>
          <p>Responbot puede integrarse con servicios de terceros, incluidos Google Calendar y Gmail, mediante OAuth 2.0. Al conectar estos servicios, usted autoriza a Responbot a acceder a los datos necesarios para proveer la funcionalidad solicitada. Responbot solo solicita los permisos estrictamente necesarios para operar.</p>
          <p>Google Calendar y Gmail son servicios de Google LLC. El uso de estos servicios está sujeto a los <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline">Términos de Servicio de Google</a>.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">4. Cuentas de usuario</h2>
          <p>Para utilizar el Servicio es necesario crear una cuenta. Usted es responsable de mantener la confidencialidad de sus credenciales de acceso y de todas las actividades que ocurran bajo su cuenta. Notifíquenos inmediatamente ante cualquier uso no autorizado.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">5. Pagos y suscripciones</h2>
          <p>El Servicio se ofrece mediante suscripciones mensuales procesadas a través de Mercado Pago. Los precios se expresan en pesos argentinos (ARS) e incluyen IVA cuando corresponde. Los pagos no son reembolsables salvo que la ley aplicable lo requiera. Podemos modificar los precios con 30 días de aviso previo.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">6. Uso aceptable</h2>
          <p>Usted se compromete a no utilizar el Servicio para:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Enviar spam, mensajes masivos no solicitados o comunicaciones engañosas.</li>
            <li>Violar leyes aplicables o derechos de terceros.</li>
            <li>Intentar acceder sin autorización a sistemas o datos ajenos.</li>
            <li>Distribuir malware u otro software dañino.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">7. Propiedad intelectual</h2>
          <p>Todos los derechos sobre el Servicio, incluyendo software, diseño, marcas y contenido, son propiedad de Responbot o sus licenciantes. Usted recibe una licencia limitada, no exclusiva e intransferible para usar el Servicio según estos términos.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">8. Limitación de responsabilidad</h2>
          <p>En la máxima medida permitida por la ley, Responbot no será responsable por daños indirectos, incidentales, especiales o consecuentes derivados del uso o la imposibilidad de uso del Servicio. Nuestra responsabilidad total no superará el monto pagado por usted en los últimos 3 meses.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">9. Modificaciones</h2>
          <p>Nos reservamos el derecho de modificar estos términos en cualquier momento. Le notificaremos los cambios materiales por correo electrónico o mediante un aviso en el panel. El uso continuado del Servicio después del aviso implica la aceptación de los nuevos términos.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">10. Rescisión</h2>
          <p>Puede cancelar su suscripción en cualquier momento desde Mercado Pago. Nos reservamos el derecho de suspender o cancelar cuentas que violen estos términos.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">11. Ley aplicable</h2>
          <p>Estos términos se rigen por las leyes de la República Argentina. Cualquier disputa se someterá a la jurisdicción de los tribunales ordinarios de la Ciudad Autónoma de Buenos Aires.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">12. Contacto</h2>
          <p>Para consultas sobre estos términos: <a href="mailto:botwa.app@gmail.com" className="text-violet-600 hover:underline">botwa.app@gmail.com</a></p>
        </section>
      </main>

      <footer className="border-t border-slate-100 px-6 py-6 text-center text-sm text-slate-400">
        <Link href="/privacidad" className="hover:underline">Política de Privacidad</Link>
        {' · '}
        <Link href="/" className="hover:underline">Volver al inicio</Link>
      </footer>
    </div>
  )
}
