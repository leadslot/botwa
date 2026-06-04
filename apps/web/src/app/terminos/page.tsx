import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Términos de Servicio - Responbot',
  description: 'Términos y condiciones de uso del servicio Responbot.',
}

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-100 px-6 py-4">
        <Link href="/" className="text-lg font-bold text-slate-900">Responbot</Link>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 px-6 py-12 text-slate-700">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Términos de Servicio</h1>
          <p className="mt-2 text-sm text-slate-500">Última actualización: junio de 2026</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">1. Aceptación</h2>
          <p>Al registrarse o usar Responbot (&quot;el Servicio&quot;), usted acepta estos Términos. Si no está de acuerdo, no utilice el Servicio.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">2. Qué es Responbot</h2>
          <p>Responbot es una plataforma que permite a negocios automatizar la atención al cliente en WhatsApp y Telegram mediante inteligencia artificial. El negocio configura un prompt, lista de precios y archivos; el bot responde consultas entrantes de forma automática.</p>
          <p>El Servicio incluye: panel de configuración, historial de conversaciones, archivos del bot, integración de señas con Mercado Pago y atención 24/7 sin intervención humana para consultas estándar.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">3. WhatsApp — aviso importante</h2>
          <p>Responbot conecta WhatsApp mediante sesión QR desde el dispositivo del negocio, usando una implementación que no es parte de la API oficial de WhatsApp Business. Esto implica:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>WhatsApp puede suspender o banear la cuenta si detecta uso automatizado.</li>
            <li>Responbot no garantiza la continuidad del servicio en WhatsApp ante cambios en las políticas de Meta.</li>
            <li>Recomendamos usar un número de WhatsApp dedicado al negocio, no el personal.</li>
            <li>El negocio asume la responsabilidad por el uso de su cuenta de WhatsApp.</li>
          </ul>
          <p>Responbot no se hace responsable por suspensiones de cuentas de WhatsApp derivadas del uso del Servicio.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">4. Inteligencia Artificial</h2>
          <p>Las respuestas del bot se generan mediante modelos de IA externos (Groq, Google Gemini). Las respuestas son automáticas y pueden contener errores. El negocio es responsable de revisar la configuración del bot y de asegurarse de que las respuestas sean apropiadas para sus clientes.</p>
          <p>Responbot no garantiza que las respuestas del bot sean siempre correctas, completas o adecuadas para cada situación. El negocio debe supervisar las conversaciones y corregir la configuración cuando sea necesario.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">5. Planes y pagos</h2>
          <p>El Servicio opera por suscripción mensual. Los precios vigentes se muestran en el panel y en la página de inicio. Los pagos se procesan mediante Mercado Pago.</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>Los pagos no son reembolsables salvo que la ley lo requiera.</li>
            <li>Los planes tienen límites de respuestas asistidas por período. Al superar el límite, se puede continuar usando el servicio; si el exceso es recurrente, sugeriremos cambiar de plan.</li>
            <li>Podemos modificar los precios con 30 días de aviso previo por email.</li>
            <li>La falta de pago puede resultar en la suspensión temporal del Servicio.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">6. Uso aceptable</h2>
          <p>El Servicio está diseñado para atención al cliente inbound (consultas entrantes). Queda prohibido usar Responbot para:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>Enviar mensajes masivos o spam a destinatarios que no iniciaron la conversación.</li>
            <li>Actividades ilegales o que violen derechos de terceros.</li>
            <li>Engañar, acosar o dañar a los clientes del negocio.</li>
            <li>Intentar vulnerar la seguridad del Servicio.</li>
            <li>Revender o sublicenciar el acceso al Servicio sin autorización.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">7. Responsabilidad del negocio</h2>
          <p>El negocio registrado es responsable de:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>La configuración y el contenido del bot (prompt, precios, archivos).</li>
            <li>Las respuestas que el bot entrega a sus clientes.</li>
            <li>Obtener el consentimiento de sus clientes para el tratamiento de sus datos.</li>
            <li>Informar a sus clientes que están interactuando con un asistente automatizado.</li>
            <li>Mantener seguras sus credenciales de acceso al panel.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">8. Disponibilidad del servicio</h2>
          <p>Nos esforzamos por mantener Responbot disponible 24/7, pero no garantizamos disponibilidad ininterrumpida. Pueden producirse interrupciones por mantenimiento, fallas técnicas o causas fuera de nuestro control. Comunicaremos mantenimientos programados con anticipación cuando sea posible.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">9. Propiedad intelectual</h2>
          <p>El software, diseño y contenido del Servicio son propiedad de Responbot. El negocio retiene la propiedad de su configuración, archivos y datos de conversaciones. Responbot no reclama propiedad sobre el contenido que los negocios cargan en la plataforma.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">10. Limitación de responsabilidad</h2>
          <p>En la máxima medida permitida por la ley argentina, Responbot no será responsable por daños indirectos, pérdida de ganancias, pérdida de datos ni daños derivados de la suspensión de cuentas de WhatsApp. Nuestra responsabilidad total no superará el monto pagado en los últimos 3 meses.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">11. Cancelación</h2>
          <p>El negocio puede cancelar la suscripción en cualquier momento desde el procesador de pago. Tras la cancelación, el acceso se mantiene hasta el fin del período pago. Responbot puede suspender cuentas que violen estos términos, con aviso previo cuando sea posible.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">12. Modificaciones</h2>
          <p>Podemos actualizar estos términos. Notificaremos cambios materiales por email con al menos 15 días de anticipación. El uso continuado implica aceptación de los nuevos términos.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">13. Ley aplicable</h2>
          <p>Estos términos se rigen por la ley argentina. Cualquier disputa se someterá a la jurisdicción de los tribunales ordinarios de la Ciudad Autónoma de Buenos Aires.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">14. Contacto</h2>
          <p>Consultas: <a href="mailto:soporte@responbot.com.ar" className="text-violet-600 hover:underline">soporte@responbot.com.ar</a></p>
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
