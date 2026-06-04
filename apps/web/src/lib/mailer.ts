import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// Usar dominio propio si está verificado en Resend, sino fallback
const FROM = 'Responbot <noreply@responbot.com.ar>'
const SOPORTE = 'soporte@responbot.com.ar'

// ─── Colores y estilos ────────────────────────────────────────────────────────
const PURPLE = '#6C4DFF'
const PURPLE_DARK = '#5538e0'
const SLATE = '#475569'
const SLATE_LIGHT = '#94a3b8'
const BG = '#f8fafc'
const WHITE = '#ffffff'

function baseLayout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <span style="font-size:22px;font-weight:700;color:#0f172a;letter-spacing:-0.5px;">
                Responbot
              </span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:${WHITE};border-radius:16px;border:1px solid #e2e8f0;padding:40px 36px;">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:${SLATE_LIGHT};">
                Responbot · <a href="https://responbot.com.ar" style="color:${SLATE_LIGHT};">responbot.com.ar</a>
              </p>
              <p style="margin:4px 0 0;font-size:12px;color:${SLATE_LIGHT};">
                Recibís este email porque tenés una cuenta activa en Responbot.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function h1(text: string) {
  return `<h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#0f172a;letter-spacing:-0.5px;">${text}</h1>`
}

function p(text: string) {
  return `<p style="margin:0 0 16px;font-size:15px;color:${SLATE};line-height:1.6;">${text}</p>`
}

function highlight(text: string) {
  return `<p style="margin:0 0 16px;font-size:15px;color:${SLATE};line-height:1.6;background:#f1f0ff;border-left:3px solid ${PURPLE};border-radius:4px;padding:12px 16px;">${text}</p>`
}

function button(label: string, url: string) {
  return `<table cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr>
      <td style="background:${PURPLE};border-radius:10px;">
        <a href="${url}" style="display:block;padding:12px 28px;font-size:15px;font-weight:600;color:${WHITE};text-decoration:none;">${label}</a>
      </td>
    </tr>
  </table>`
}

function divider() {
  return `<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />`
}

// ─── Templates ────────────────────────────────────────────────────────────────

export async function sendWelcomeEmail(opts: {
  to: string
  businessName: string
  planName: string
  monthlyResponses: number
}) {
  const body = `
    ${h1('¡Bienvenido a Responbot! 🎉')}
    ${p(`Hola, tu cuenta de <strong>${opts.businessName}</strong> está activa.`)}
    ${highlight(`
      <strong>Plan:</strong> ${opts.planName}<br/>
      <strong>Respuestas/mes:</strong> ${opts.monthlyResponses.toLocaleString('es-AR')}
    `)}
    ${p('Tu bot ya está listo para conectar. Entrá al panel y vinculá tu WhatsApp con el código QR.')}
    ${button('Ir al panel', 'https://responbot.com.ar/dashboard')}
    ${divider()}
    ${p(`Si tenés alguna duda, respondé este email o escribinos a <a href="mailto:soporte@responbot.com.ar" style="color:${PURPLE};">soporte@responbot.com.ar</a>.`)}
  `
  return resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `¡Bienvenido a Responbot, ${opts.businessName}!`,
    html: baseLayout('Bienvenido a Responbot', body),
  })
}

export async function sendPackConfirmationEmail(opts: {
  to: string
  businessName: string
  responsesAdded: number
  price: number
}) {
  const body = `
    ${h1('Pack acreditado ✅')}
    ${p(`Hola <strong>${opts.businessName}</strong>, recibimos tu pago.`)}
    ${highlight(`
      <strong>+${opts.responsesAdded.toLocaleString('es-AR')} respuestas asistidas</strong> acreditadas en tu cuenta.<br/>
      <strong>Monto:</strong> $${opts.price.toLocaleString('es-AR')}
    `)}
    ${p('Las respuestas ya están disponibles. Podés ver tu consumo actualizado en el panel.')}
    ${button('Ver mi consumo', 'https://responbot.com.ar/dashboard/billing')}
  `
  return resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: 'Pack de respuestas acreditado — Responbot',
    html: baseLayout('Pack acreditado', body),
  })
}

export async function sendPasswordResetEmail(opts: {
  to: string
  resetUrl: string
}) {
  const body = `
    ${h1('Recuperar contraseña')}
    ${p('Recibimos una solicitud para restablecer la contraseña de tu cuenta de Responbot.')}
    ${p('Hacé clic en el botón para crear una contraseña nueva. El enlace es válido por <strong>1 hora</strong>.')}
    ${button('Restablecer contraseña', opts.resetUrl)}
    ${divider()}
    ${p('Si no pediste recuperar la contraseña, podés ignorar este email. Tu cuenta está segura.')}
  `
  return resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: 'Recuperar contraseña — Responbot',
    html: baseLayout('Recuperar contraseña', body),
  })
}

export async function sendUsageWarningEmail(opts: {
  to: string
  businessName: string
  used: number
  limit: number
  pct: number
}) {
  const isLimit = opts.pct >= 100
  const body = isLimit ? `
    ${h1('Llegaste al límite de respuestas ⚠️')}
    ${p(`<strong>${opts.businessName}</strong>, usaste las <strong>${opts.limit.toLocaleString('es-AR')} respuestas</strong> de tu plan este mes.`)}
    ${p('El bot <strong>pausó las respuestas automáticas</strong> hasta que sumes más o empiece el próximo ciclo.')}
    ${highlight('Comprá un pack para seguir respondiendo ahora mismo.')}
    ${button('Comprar pack de respuestas', 'https://responbot.com.ar/dashboard/billing')}
  ` : `
    ${h1('Casi agotás tus respuestas')}
    ${p(`<strong>${opts.businessName}</strong>, usaste el <strong>${opts.pct}%</strong> de tus respuestas este mes.`)}
    ${highlight(`Usadas: ${opts.used.toLocaleString('es-AR')} / ${opts.limit.toLocaleString('es-AR')}`)}
    ${p('Si necesitás más, podés comprar un pack adicional antes de llegar al tope.')}
    ${button('Ver opciones de pack', 'https://responbot.com.ar/dashboard/billing')}
  `
  return resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: isLimit
      ? 'Llegaste al límite de respuestas — Responbot'
      : `Usaste el ${opts.pct}% de tus respuestas — Responbot`,
    html: baseLayout('Aviso de consumo', body),
  })
}

export async function sendMaintenanceEmail(opts: {
  to: string | string[]
  scheduledAt: string   // "martes 10 de junio a las 03:00"
  durationMinutes: number
  detail?: string
}) {
  const body = `
    ${h1('Mantenimiento programado 🔧')}
    ${p(`El servicio de Responbot tendrá un mantenimiento <strong>el ${opts.scheduledAt}</strong> con una duración estimada de <strong>${opts.durationMinutes} minutos</strong>.`)}
    ${opts.detail ? highlight(opts.detail) : ''}
    ${p('Durante ese tiempo el bot puede no responder mensajes. Te avisaremos cuando todo vuelva a la normalidad.')}
    ${p('Disculpá las molestias.')}
  `
  return resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `Mantenimiento programado — ${opts.scheduledAt}`,
    html: baseLayout('Mantenimiento programado', body),
  })
}

export async function sendServiceAlertEmail(opts: {
  to: string | string[]
  title: string
  detail: string
  resolved?: boolean
}) {
  const emoji = opts.resolved ? '✅' : '⚠️'
  const statusLabel = opts.resolved ? 'Servicio restaurado' : 'Aviso de servicio'
  const body = `
    ${h1(`${emoji} ${opts.title}`)}
    ${p(opts.detail)}
    ${opts.resolved
      ? p('El servicio volvió a funcionar con normalidad. Gracias por tu paciencia.')
      : p('Estamos trabajando para resolver el problema. Te avisaremos cuando esté solucionado.')
    }
    ${button('Ver estado del servicio', 'https://responbot.com.ar/dashboard')}
  `
  return resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `${statusLabel} — Responbot`,
    html: baseLayout(statusLabel, body),
  })
}

export async function sendSubscriptionCancelledEmail(opts: {
  to: string
  businessName: string
  activeUntil: string  // "30 de junio de 2026"
}) {
  const body = `
    ${h1('Suscripción cancelada')}
    ${p(`Hola <strong>${opts.businessName}</strong>, confirmamos que tu suscripción fue cancelada.`)}
    ${highlight(`Tu acceso sigue activo hasta el <strong>${opts.activeUntil}</strong>.`)}
    ${p('Después de esa fecha el bot dejará de responder. Podés reactivar tu cuenta en cualquier momento.')}
    ${button('Reactivar mi cuenta', 'https://responbot.com.ar/dashboard/billing')}
    ${divider()}
    ${p(`Si cancelaste por error o querés contarnos algo, escribinos a <a href="mailto:soporte@responbot.com.ar" style="color:${PURPLE};">soporte@responbot.com.ar</a>.`)}
  `
  return resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: 'Suscripción cancelada — Responbot',
    html: baseLayout('Suscripción cancelada', body),
  })
}
