import Link from 'next/link'
import { MessageCircle, Zap, Shield, Clock, ChevronRight, CheckCircle2, Smartphone } from 'lucide-react'

async function getDolarBlue(): Promise<number> {
  try {
    const res = await fetch('https://dolarapi.com/v1/dolares/blue', { next: { revalidate: 3600 } })
    const data = await res.json()
    return data.venta ?? 1450
  } catch {
    return 1450
  }
}

export default async function LandingPage() {
  const dolarBlue = await getDolarBlue()
  const precioARS = Math.ceil((15 * dolarBlue) / 1000) * 1000
  const precioARSDisplay = precioARS.toLocaleString('es-AR')
  const precioDiario = Math.ceil(precioARS / 30 / 100) * 100
  const precioDiarioDisplay = precioDiario.toLocaleString('es-AR')

  return (
    <div className="min-h-screen bg-white">

      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 via-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">BotWA</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-gray-600 hover:text-gray-900 font-medium text-sm transition-colors">
              Ingresar
            </Link>
            <Link href="/register" className="btn-primary text-sm py-2 px-5">
              Empezar gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50 -z-10" />
        <div className="absolute top-20 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-20 w-64 h-64 bg-violet-500/5 rounded-full blur-3xl -z-10" />

        <div className="max-w-6xl mx-auto px-6 pt-20 pb-24">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-600 text-sm font-medium px-4 py-2 rounded-full mb-8">
              <Zap className="w-4 h-4" />
              Tu WhatsApp respondiendo en segundos, con IA
            </div>

            <h1 className="text-6xl font-black text-gray-900 leading-[1.05] mb-6 tracking-tight">
              Tu negocio
              <br />
              <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-purple-600 bg-clip-text text-transparent">
                nunca más sin respuesta.
              </span>
            </h1>

            <p className="text-xl text-gray-500 mb-10 leading-relaxed max-w-2xl">
              Conectás tu WhatsApp una vez. Desde ese momento, la IA responde por vos —
              consultas, horarios, turnos — las 24 horas, sin que vos estés presente.
            </p>

            <div className="flex items-center gap-4 flex-wrap">
              <Link href="/register" className="btn-primary text-base py-3.5 px-8 flex items-center gap-2">
                Conectar mi WhatsApp
                <ChevronRight className="w-5 h-5" />
              </Link>
              <p className="text-sm text-gray-400">Sin tarjeta. Gratis 14 días.</p>
            </div>

            <div className="flex items-center gap-6 mt-10">
              {['Configuración en 2 min', 'Servidor siempre activo', 'Sin instalar nada'].map(t => (
                <div key={t} className="flex items-center gap-1.5 text-sm text-gray-500">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  {t}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-indigo-500 font-semibold text-sm uppercase tracking-wider mb-3">Así funciona</p>
            <h2 className="text-4xl font-black text-gray-900">Tres pasos. Eso es todo.</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', icon: Smartphone, title: 'Registrás tu negocio', desc: 'Nombre, rubro y qué querés que responda el bot. Dos minutos.' },
              { step: '02', icon: MessageCircle, title: 'Escaneás el QR', desc: 'Abrís WhatsApp, escaneás el código desde el panel. El bot queda conectado en nuestro servidor.' },
              { step: '03', icon: Zap, title: 'El bot trabaja por vos', desc: 'Cada mensaje que llegue tiene respuesta automática, inteligente y en el tono de tu negocio.' },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="card h-full">
                <div className="text-5xl font-black text-indigo-100 mb-4">{step}</div>
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 via-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-24 bg-gradient-to-br from-indigo-950 to-indigo-900">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-white mb-4">Todo lo que necesitás</h2>
            <p className="text-indigo-300 text-lg">Sin configuraciones complicadas. Sin servidores que mantener.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Clock, title: 'Responde 24/7', desc: 'El bot vive en nuestro servidor. No depende de que tu PC esté prendida.' },
              { icon: Zap, title: 'IA que aprende tu tono', desc: 'Configurás cómo habla el bot: formal, amigable, técnico. Siempre suena como tu negocio.' },
              { icon: Shield, title: 'Conversaciones en tu panel', desc: 'Ves cada mensaje que llegó y cada respuesta que dio el bot. Podés tomar el control cuando querás.' },
              { icon: MessageCircle, title: 'Múltiples IA disponibles', desc: 'Gemini, GPT-4, Claude. Elegís cuál usar o dejás la gratuita activada.' },
              { icon: Smartphone, title: 'Tu número, sin cambios', desc: 'Usás tu número de WhatsApp de siempre. Sin número nuevo. Sin trámites.' },
              { icon: CheckCircle2, title: 'Sin spam, sin masivos', desc: 'Solo responde mensajes que llegan. Nada de campañas ni listas. Tranquilo y legal.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-indigo-300" />
                </div>
                <h3 className="text-white font-bold mb-2">{title}</h3>
                <p className="text-indigo-300 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-gray-900 mb-4">Precio simple.</h2>
            <p className="text-gray-500 text-lg">Con que un cliente que iba a irse vuelva, el bot ya se pagó.</p>
          </div>

          <div className="max-w-sm mx-auto">
            <div className="card border-2 border-indigo-500 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold px-4 py-1 rounded-full">
                  14 DÍAS GRATIS
                </span>
              </div>
              <div className="text-center pt-4">
                <p className="text-gray-500 text-sm font-medium mb-1">Plan Profesional</p>
                <div className="flex items-end justify-center gap-1 mb-1">
                  <span className="text-5xl font-black text-gray-900">${precioARSDisplay}</span>
                  <span className="text-gray-400 mb-2">ARS/mes</span>
                </div>
                <p className="text-gray-400 text-sm">≈ USD 15/mes · dólar blue ${dolarBlue.toLocaleString('es-AR')}</p>
                <p className="text-indigo-500 text-xs font-semibold mb-8">menos de ${precioDiarioDisplay} ARS por día</p>

                <div className="space-y-3 text-left mb-8">
                  {[
                    'Bot activo 24/7 en nuestro servidor',
                    'IA con tu tono y negocio',
                    'Panel de conversaciones',
                    'Sin límite de mensajes',
                    'Soporte por WhatsApp',
                  ].map(f => (
                    <div key={f} className="flex items-center gap-3 text-sm text-gray-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>

                <Link href="/register" className="btn-primary w-full block text-center">
                  Empezar gratis 14 días
                </Link>
                <p className="text-xs text-gray-400 mt-3">Sin tarjeta. Cancelás cuando querés.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-md flex items-center justify-center">
              <MessageCircle className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-gray-600">BotWA</span>
          </div>
          <p>© 2025 BotWA. Hecho en Argentina 🇦🇷</p>
        </div>
      </footer>

    </div>
  )
}
