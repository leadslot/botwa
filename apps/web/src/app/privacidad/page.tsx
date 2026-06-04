import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Política de Privacidad - Responbot',
  description: 'Cómo Responbot recopila, usa y protege los datos de negocios y sus clientes.',
}

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-100 px-6 py-4">
        <Link href="/" className="text-lg font-bold text-slate-900">Responbot</Link>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 px-6 py-12 text-slate-700">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Política de Privacidad</h1>
          <p className="mt-2 text-sm text-slate-500">Última actualización: junio de 2026</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">1. Quiénes somos</h2>
          <p>Responbot es una plataforma argentina de automatización de atención al cliente por WhatsApp y Telegram. Permite a negocios configurar un asistente con inteligencia artificial que responde consultas de sus clientes de forma automática.</p>
          <p>Al usar Responbot, el negocio registrado actúa como responsable del tratamiento de datos de sus propios clientes. Responbot actúa como encargado del tratamiento en nombre del negocio.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">2. Información que recopilamos</h2>
          <p><strong>Del negocio registrado:</strong> nombre, email, nombre del negocio, contraseña (almacenada con hash), configuración del bot (prompt, lista de precios, demora de respuesta), archivos subidos al panel y link de pago de Mercado Pago si lo configura.</p>
          <p><strong>De los canales conectados:</strong> sesión de WhatsApp vinculada por código QR desde el dispositivo del negocio. No almacenamos contraseñas de WhatsApp. Los mensajes entrantes y salientes se guardan en nuestra base de datos para mostrar el historial de conversaciones en el panel.</p>
          <p><strong>De los clientes del negocio:</strong> número de teléfono, nombre (si WhatsApp lo provee) y contenido de los mensajes que intercambian con el bot. Estos datos pertenecen al negocio y Responbot los procesa en su nombre.</p>
          <p><strong>Datos de uso:</strong> cantidad de respuestas generadas, fechas y métricas agregadas para mostrar estadísticas en el panel.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">3. Cómo usamos la información</h2>
          <ul className="list-disc space-y-1 pl-6">
            <li>Operar el bot y responder mensajes entrantes en nombre del negocio.</li>
            <li>Mostrar conversaciones e historial en el panel de control.</li>
            <li>Medir el uso del servicio y los límites del plan.</li>
            <li>Procesar las consultas con modelos de inteligencia artificial externos (ver sección 4).</li>
            <li>Enviar comunicaciones administrativas relacionadas con la cuenta.</li>
            <li>Cumplir obligaciones legales aplicables en Argentina.</li>
          </ul>
          <p>No usamos datos de conversaciones para publicidad de terceros. No habilitamos envíos masivos de mensajes desde la plataforma.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">4. Proveedores de inteligencia artificial</h2>
          <p>Para generar respuestas automáticas, el contenido de los mensajes se envía a APIs externas de inteligencia artificial. Actualmente usamos:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li><strong>Groq (groq.com):</strong> modelos de lenguaje para generación de texto y transcripción de audios.</li>
            <li><strong>Google Gemini (ai.google.dev):</strong> modelos de lenguaje y visión para descripción de imágenes.</li>
          </ul>
          <p>Estos proveedores reciben el texto de los mensajes para generar respuestas. Cada uno tiene su propia política de privacidad. Los mensajes procesados pueden incluir consultas de los clientes del negocio.</p>
          <p>Si el negocio maneja información sensible, debe evaluar si estos servicios de IA son apropiados para su caso.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">5. Infraestructura y subprocesadores</h2>
          <ul className="list-disc space-y-1 pl-6">
            <li><strong>Supabase:</strong> base de datos PostgreSQL y almacenamiento de archivos.</li>
            <li><strong>Vercel:</strong> hosting del panel web.</li>
            <li><strong>Railway:</strong> hosting del servidor del bot.</li>
            <li><strong>Mercado Pago:</strong> procesamiento de pagos de suscripciones. No almacenamos datos de tarjetas.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">6. Seguridad</h2>
          <p>Implementamos HTTPS/TLS en todas las comunicaciones, autenticación segura con tokens cifrados, y controles de acceso por negocio. Los archivos se almacenan en buckets con permisos restringidos. Nunca almacenamos contraseñas en texto plano.</p>
          <p>Ningún sistema es 100% seguro. En caso de brecha de seguridad que afecte datos personales, notificaremos a los usuarios afectados en el plazo que establezca la normativa aplicable.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">7. Retención de datos</h2>
          <p>Los datos de cuenta y conversaciones se conservan mientras la cuenta esté activa. Al cancelar la suscripción, los datos se mantienen por 30 días para permitir recuperación. Luego se eliminan, salvo obligación legal de conservarlos.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">8. Sus derechos</h2>
          <p>Como usuario de Responbot (negocio registrado), usted puede:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>Acceder a sus datos desde el panel de control.</li>
            <li>Corregir información de su perfil y negocio.</li>
            <li>Solicitar la eliminación de su cuenta y datos.</li>
            <li>Desconectar canales de WhatsApp o Telegram en cualquier momento.</li>
            <li>Exportar el historial de conversaciones.</li>
          </ul>
          <p>Para ejercer estos derechos o hacer consultas: <a href="mailto:soporte@responbot.com.ar" className="text-violet-600 hover:underline">soporte@responbot.com.ar</a></p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">9. Cookies</h2>
          <p>Usamos cookies estrictamente necesarias para autenticación de sesión en el panel. No usamos cookies de seguimiento ni publicidad de terceros.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">10. Cambios a esta política</h2>
          <p>Notificaremos cambios materiales por email o mediante aviso en el panel con al menos 15 días de anticipación. El uso continuado del servicio implica aceptación de la política actualizada.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">11. Contacto</h2>
          <p>Consultas de privacidad: <a href="mailto:soporte@responbot.com.ar" className="text-violet-600 hover:underline">soporte@responbot.com.ar</a></p>
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
