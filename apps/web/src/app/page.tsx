import Link from 'next/link'
import { MessageCircle, Zap, Shield, Clock, ChevronRight, CheckCircle2, Smartphone, XCircle } from 'lucide-react'

export default function LandingPage() {
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
            <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium px-4 py-2 rounded-full mb-8">
              <Zap className="w-4 h-4 shrink-0" />
              Tu negocio, respondiendo solo — las 24 horas
            </div>

            <h1 className="text-6xl font-black text-gray-900 leading-[1.05] mb-6 tracking-tight">
              No pierdas más clientes
              <br />
              <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-purple-600 bg-clip-text text-transparent">
                por no poder responder.
              </span>
            </h1>

            <p className="text-xl text-gray-500 mb-10 leading-relaxed max-w-2xl">
              Tu negocio recibe consultas a las 11 de la noche, los domingos, cuando estás atendiendo a otro cliente.
              BotWA responde por vos al instante — aumentando tus ventas mientras vos descansás.
            </p>

            <div className="flex items-center gap-4 flex-wrap">
              <Link href="/register" className="btn-primary text-base py-3.5 px-8 flex items-center gap-2">
                Quiero que mi negocio responda solo
                <ChevronRight className="w-5 h-5" />
              </Link>
              <p className="text-sm text-gray-400">Primeros 50 mensajes gratis. Sin tarjeta.</p>
            </div>

            <div className="flex items-center gap-6 mt-10 flex-wrap">
              {[
                'Respuesta en segundos, no en horas',
                'Funciona mientras dormís',
                'Sin instalar nada',
              ].map(t => (
                <div key={t} className="flex items-center gap-1.5 text-sm text-gray-500">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  {t}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* DOLOR */}
      <section className="py-16 bg-gray-950">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-gray-400 text-sm uppercase tracking-widest font-semibold mb-6">¿Te suena familiar?</p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { emoji: '😤', text: '"Vi el mensaje tarde y el cliente ya había llamado a otro"' },
              { emoji: '😴', text: '"Me escriben a las 2am y al otro día ya no les interesa"' },
              { emoji: '📉', text: '"Pierdo ventas por estar ocupado atendiendo en persona"' },
            ].map(({ emoji, text }) => (
              <div key={text} className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <div className="text-4xl mb-3">{emoji}</div>
                <p className="text-gray-300 text-sm leading-relaxed italic">{text}</p>
              </div>
            ))}
          </div>
          <p className="text-white font-black text-2xl mt-10">
            Con BotWA, eso no vuelve a pasar.
          </p>
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
              { step: '01', icon: Smartphone, title: 'Configurás tu negocio', desc: 'Le contás al bot cómo habla tu negocio, qué vendés y cómo querés que responda. Sin conocimientos técnicos.' },
              { step: '02', icon: MessageCircle, title: 'Escaneás el QR', desc: 'Abrís WhatsApp, escaneás el código desde el panel. El bot queda conectado en nuestro servidor.' },
              { step: '03', icon: Zap, title: 'El bot trabaja por vos', desc: 'Cada mensaje que llegue tiene respuesta automática, inteligente y en el tono de tu negocio. Las 24 horas.' },
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
              { icon: Clock,         title: 'Responde 24/7',             desc: 'El bot vive en nuestro servidor. No depende de que tu PC esté prendida.' },
              { icon: Zap,           title: 'Respuestas en segundos',     desc: 'No en horas. Tus clientes reciben respuesta antes de perder el interés.' },
              { icon: Shield,        title: 'Aumenta tus ventas',         desc: 'Un cliente que recibe respuesta inmediata tiene muchas más chances de comprar.' },
              { icon: Smartphone,    title: 'Tu número, sin cambios',     desc: 'Usás tu número de WhatsApp de siempre. Sin número nuevo. Sin trámites.' },
              { icon: MessageCircle, title: 'Ves todo desde el panel',    desc: 'Cada mensaje que llegó y cada respuesta que dio el bot. Podés tomar el control cuando querás.' },
              { icon: CheckCircle2,  title: 'Sin spam, sin masivos',      desc: 'Solo responde mensajes que llegan. Nada de campañas ni listas. Tranquilo y legal.' },
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
          <div className="text-center mb-6">
            <h2 className="text-4xl font-black text-gray-900 mb-4">Menos de $2.000 por día.</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              Lo mismo que un alfajor. Con la diferencia de que el bot te trae clientes.
            </p>
          </div>

          {/* Oferta lanzamiento */}
          <div className="max-w-sm mx-auto mb-4">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 text-center">
              <p className="text-amber-800 text-sm font-semibold">
                🎉 Precio de lanzamiento — Solo por tiempo limitado
              </p>
            </div>
          </div>

          <div className="max-w-sm mx-auto">
            <div className="card border-2 border-indigo-500 relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap">
                <span className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold px-5 py-1.5 rounded-full shadow-md">
                  🎁 50 mensajes gratis para probar
                </span>
              </div>

              <div className="text-center pt-6 pb-2">
                {/* Precio primer mes */}
                <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-1">Primer mes</p>
                <div className="flex items-end justify-center gap-1 mb-1">
                  <span className="text-5xl font-black text-gray-900">$40.000</span>
                  <span className="text-gray-400 mb-2">ARS</span>
                </div>
                <p className="text-gray-400 text-sm mb-4">
                  Después <strong className="text-gray-600">$60.000/mes</strong> · Cancelás cuando querés
                </p>

                <div className="bg-indigo-50 rounded-xl px-4 py-2 mb-6 inline-block">
                  <p className="text-indigo-600 text-xs font-semibold">
                    = $1.333 ARS por día el primer mes
                  </p>
                </div>

                <div className="space-y-3 text-left mb-8">
                  {[
                    'Bot activo 24/7 en nuestro servidor',
                    'Respuestas automáticas en segundos',
                    'IA con el tono de tu negocio',
                    'Panel para ver todas las conversaciones',
                    'Sin límite de mensajes',
                    'Soporte directo por WhatsApp',
                  ].map(f => (
                    <div key={f} className="flex items-center gap-3 text-sm text-gray-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>

                <Link href="/register" className="btn-primary w-full block text-center text-base py-4">
                  Empezar gratis ahora
                </Link>
                <p className="text-xs text-gray-400 mt-3">
                  Sin tarjeta para la prueba. Pagás solo cuando decidís quedártelo.
                </p>
              </div>
            </div>
          </div>

          {/* Prueba social / urgencia */}
          <div className="max-w-sm mx-auto mt-6 text-center">
            <p className="text-gray-400 text-sm">
              💬 <strong className="text-gray-600">Un solo cliente recuperado</strong> ya pagó el mes entero.
            </p>
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
          <p>© 2026 BotWA · Hecho en Argentina 🇦🇷</p>
        </div>
      </footer>

    </div>
  )
}
