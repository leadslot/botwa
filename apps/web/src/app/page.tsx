import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowRight,
  ArrowUp,
  Bot,
  Check,
  CheckCircle2,
  Clock3,
  HelpCircle,
  MapPin,
  Menu,
  MessagesSquare,
  Moon,
  PackageCheck,
  Rocket,
  Sparkles,
  Store,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  UserRound,
  X,
  Zap,
} from 'lucide-react'
import { PLANS } from '@/lib/plans'

const navLinks = [
  { label: 'Cómo funciona', href: '#como-funciona' },
  { label: 'Qué hace', href: '#que-hace' },
  { label: 'Precios', href: '#precios' },
  { label: 'Preguntas', href: '#preguntas' },
]

const trustItems = ['Prueba inicial', 'Tu número actual', 'Sin API oficial']

const steps = [
  {
    step: '01',
    title: 'Creás tu cuenta',
    text: 'Cargás los datos de tu negocio, precios, horarios, servicios y reglas de respuesta.',
    preview: 'form',
  },
  {
    step: '02',
    title: 'Escaneás el QR',
    text: 'Conectás tu WhatsApp desde el panel. No necesitás API oficial ni configuraciones complejas.',
    preview: 'qr',
  },
  {
    step: '03',
    title: 'El bot responde por vos',
    text: 'Cada vez que alguien te escribe, Responbot contesta con el tono y la información que cargaste.',
    preview: 'chat',
  },
]

const whatBotDoes = [
  'Responder consultas frecuentes',
  'Informar precios, servicios y horarios',
  'Pedir datos faltantes al cliente',
  'Responder WhatsApp por QR',
  'Responder Telegram con tu bot',
  'Derivar conversaciones cuando no pueda resolver',
  'Responder 24/7, sin que quede la PC prendida',
  'Usar memoria de conversación',
  'Adaptarse al tono del negocio',
]

const whatBotDoesnt = [
  'No envía mensajes masivos',
  'No inicia conversaciones solo',
  'No reemplaza atención humana en casos complejos',
  'No agenda turnos automáticamente',
  'No necesita API oficial de WhatsApp',
]

const industries = [
  { icon: Sparkles, title: 'Turnos y reservas', question: 'Hola, ¿tenés disponibilidad?' },
  { icon: ShoppingBag, title: 'Tiendas online', question: '¿Hacen envíos a todo el país?' },
  { icon: Store, title: 'Cabañas', question: '¿Tienen disponibilidad este finde?' },
  { icon: PackageCheck, title: 'Estéticas', question: '¿Cuánto sale el servicio?' },
  { icon: UserRound, title: 'Profesionales', question: '¿Me pasás más información?' },
  { icon: MapPin, title: 'Servicios locales', question: '¿Dónde están ubicados?' },
]

const faqs = [
  {
    question: '¿Necesito API oficial de WhatsApp?',
    answer: 'No. Se conecta por QR directamente desde el panel. Sin tramites, sin proveedor oficial.',
  },
  {
    question: '¿El bot puede escribirle primero a un cliente?',
    answer: 'No. Solo responde mensajes que entran a tu WhatsApp. No inicia conversaciones ni manda campañas.',
  },
  {
    question: '¿Tengo que dejar la computadora prendida?',
    answer: 'No. El bot queda activo en nuestros servidores. Funciona aunque cierres la PC o el celular.',
  },
  {
    question: '¿Puedo usar mi número actual?',
    answer: 'Sí. Se conecta escaneando el QR de WhatsApp Web, igual que siempre. No cambias de número.',
  },
  {
    question: '¿Puedo cargar precios, horarios y servicios?',
    answer: 'Sí. Podés cargar toda la información desde configuración o pegar un prompt completo con todo el detalle de tu negocio.',
  },
  {
    question: '¿También responde Telegram?',
    answer: 'Sí. En el plan WhatsApp + Telegram podés conectar un bot de Telegram creado con BotFather y responder desde el mismo panel.',
  },
  {
    question: '¿Puedo apagar el bot?',
    answer: 'Sí. Desde el panel podés pausar la respuesta automática en cualquier momento, sin desconectar WhatsApp.',
  },
  {
    question: '¿Sirve para cualquier negocio?',
    answer: 'Sí, mientras reciba consultas por WhatsApp: turnos, servicios, ventas, talleres, estética, tatuajes, comercios, profesionales.',
  },
]

function QrEye({ className }: { className: string }) {
  return (
    <span className={`absolute h-6 w-6 rounded-[5px] border-[5px] border-slate-950 bg-white ${className}`}>
      <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-[2px] bg-slate-950" />
    </span>
  )
}

function QrPreview() {
  const darkModules = [
    11, 12, 13, 16, 18, 21, 23, 27, 28, 31, 33, 38, 40, 43, 44, 46, 49, 50, 53, 57, 59, 62, 64, 65, 69, 72, 74, 77,
    79, 81, 82, 85, 89, 91, 94, 96, 99, 101, 103, 105, 108, 112, 114, 117, 119, 121, 123, 126, 128, 130, 132, 135,
  ]

  return (
    <div className="relative h-24 w-24 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <QrEye className="left-3 top-3" />
      <QrEye className="right-3 top-3" />
      <QrEye className="left-3 bottom-3" />
      <div className="absolute inset-3 grid grid-cols-12 gap-[3px]">
        {Array.from({ length: 144 }).map((_, index) => {
          const finderZone =
            (index < 48 && index % 12 < 4) ||
            (index < 48 && index % 12 > 7) ||
            (index > 95 && index % 12 < 4)

          return (
            <span
              key={index}
              className={`rounded-[2px] ${
                finderZone ? 'bg-transparent' : darkModules.includes(index) ? 'bg-slate-950' : 'bg-slate-100'
              }`}
            />
          )
        })}
      </div>
    </div>
  )
}

function StepPreview({ type }: { type: string }) {
  if (type === 'qr') {
    return <QrPreview />
  }

  if (type === 'chat') {
    return (
      <div className="w-32 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
            <Bot className="h-4 w-4" />
          </span>
          <span className="h-2 w-16 rounded-full bg-emerald-100" />
        </div>
        <span className="mb-2 block h-3 rounded-full bg-emerald-100" />
        <span className="block h-3 w-20 rounded-full bg-emerald-100" />
      </div>
    )
  }

  return (
    <div className="w-32 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <span className="mb-2 block h-3 w-16 rounded-full bg-slate-100" />
      <span className="mb-3 block h-6 rounded-lg bg-slate-100" />
      <span className="mb-2 block h-3 w-20 rounded-full bg-slate-100" />
      <span className="block h-6 rounded-lg bg-slate-100" />
    </div>
  )
}

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-x-hidden scroll-smooth bg-white text-slate-950">
      {/* HERO */}
      <section id="inicio" className="relative bg-[#0F1424] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(124,92,255,0.42),transparent_32%),radial-gradient(circle_at_12%_0%,rgba(108,77,255,0.18),transparent_34%)]" />
        <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
          <Link href="/" className="flex items-center gap-3" aria-label="Responbot">
            <Image src="/logo.png" alt="" width={36} height={36} className="rounded-xl shadow-lg shadow-violet-950/40" />
            <span className="text-xl font-black tracking-tight">Responbot</span>
          </Link>

          <nav className="hidden items-center gap-9 text-sm font-semibold text-white/82 lg:flex">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className="transition hover:text-white">
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-5 sm:flex">
            <Link href="/login" className="text-sm font-semibold text-white/82 transition hover:text-white">
              Ingresar
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-[#6C4DFF] to-[#A855F7] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-violet-950/35 transition hover:-translate-y-0.5 hover:shadow-violet-900/50"
            >
              Empezar gratis
            </Link>
          </div>

          <button className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 text-white sm:hidden" aria-label="Abrir menú">
            <Menu className="h-5 w-5" />
          </button>
        </header>

        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-8 px-5 pb-10 pt-8 sm:px-8 lg:min-h-[calc(100vh-100px)] lg:grid-cols-[1fr_0.86fr] lg:px-10 lg:py-7 xl:gap-12">
          <div className="pb-4 lg:pb-0">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/10 px-4 py-2 text-sm font-bold text-emerald-300">
              <Zap className="h-4 w-4" />
              WhatsApp automático, simple
            </div>

            <h1 className="max-w-3xl text-5xl font-black leading-[0.98] tracking-tight sm:text-6xl lg:text-[64px] xl:text-7xl">
              No pierdas clientes
              <span className="mt-2 block bg-gradient-to-r from-[#8B6BFF] to-[#A855F7] bg-clip-text text-transparent">
                por responder tarde.
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200 lg:text-[19px]">
              Responbot atiende los mensajes que llegan a tu WhatsApp, responde con la información de tu negocio y trabaja 24/7 sin que tengas la PC prendida.
            </p>

            <div className="mt-7 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#6C4DFF] to-[#A855F7] px-7 py-3.5 text-sm font-bold text-white shadow-xl shadow-violet-950/40 transition hover:-translate-y-0.5"
              >
                Empezar gratis
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#como-funciona"
                className="inline-flex min-h-12 items-center justify-center rounded-lg border border-white/25 px-7 py-3.5 text-sm font-bold text-white transition hover:border-white/50 hover:bg-white/5"
              >
                Ver cómo funciona
              </a>
            </div>

            <div className="mt-7 grid gap-3 text-sm font-semibold text-white/88 sm:grid-cols-3">
              {trustItems.map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-white" />
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-white/70">
              <span className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> Se conecta escaneando un QR</span>
              <span className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> Usa tu número actual</span>
              <span className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> Responde mensajes entrantes</span>
              <span className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> Configuración simple</span>
              <span className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> Promo $49.000, luego $79.000/mes</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[360px] self-center lg:mr-8 xl:max-w-[390px]">
            <div className="absolute -right-8 top-6 hidden text-[#8B6BFF] lg:block">
              <Sparkles className="h-10 w-10" />
            </div>
            <div className="relative mx-auto h-[470px] w-[240px] rounded-[2.1rem] border-[7px] border-zinc-800 bg-zinc-950 p-2 shadow-2xl shadow-black/50 sm:h-[500px] sm:w-[256px] xl:h-[540px] xl:w-[276px]">
              <div className="absolute left-1/2 top-4 z-20 h-5 w-5 -translate-x-1/2 rounded-full bg-black" />
              <div className="h-full overflow-hidden rounded-[1.8rem] bg-[#efe8dc]">
                <div className="flex items-center gap-3 bg-[#4b6471] px-4 py-4 text-white">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-slate-500">
                    <UserRound className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">Tu Negocio</p>
                    <p className="text-xs text-white/75">En línea</p>
                  </div>
                  <MessagesSquare className="h-5 w-5" />
                </div>

                <div className="space-y-3 px-4 py-5 text-[12px] leading-5 text-slate-900 xl:text-[13px]">
                  <div className="ml-auto max-w-[78%] rounded-2xl rounded-tr-md bg-[#dcf8c6] px-4 py-3 shadow-sm">
                    Hola, ¿tenés turnos?
                    <span className="ml-2 text-[10px] text-slate-500">11:02</span>
                  </div>
                  <div className="max-w-[84%] rounded-2xl rounded-tl-md bg-white px-4 py-3 shadow-sm">
                    ¡Hola! Sí, tenemos disponibilidad esta semana. ¿Qué día te queda cómodo?
                    <span className="ml-2 text-[10px] text-slate-400">11:02</span>
                  </div>
                  <div className="ml-auto max-w-[70%] rounded-2xl rounded-tr-md bg-[#dcf8c6] px-4 py-3 shadow-sm">
                    ¿Cuánto sale?
                    <span className="ml-2 text-[10px] text-slate-500">11:03</span>
                  </div>
                  <div className="max-w-[84%] rounded-2xl rounded-tl-md bg-white px-4 py-3 shadow-sm">
                    Depende del servicio. Si querés, te paso las opciones.
                    <span className="ml-2 text-[10px] text-slate-400">11:03</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute bottom-10 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-2xl bg-white px-4 py-3 text-slate-950 shadow-2xl shadow-black/20 sm:left-0 sm:bottom-12 sm:translate-x-0">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#6C4DFF] to-[#A855F7] text-white">
                <Zap className="h-5 w-5" />
              </span>
              <p className="text-sm font-black leading-5">
                Respuesta enviada en
                <span className="block">3 segundos</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEMA */}
      <section className="border-b border-slate-200 bg-white py-10 lg:flex lg:min-h-[60vh] lg:items-center lg:py-12">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 sm:px-8 lg:grid-cols-[0.82fr_1.68fr] lg:items-center lg:px-10">
          <div>
            <h2 className="text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">
              Mientras vos trabajás,
              <span className="block text-[#7C5CFF]">tus clientes siguen escribiendo.</span>
            </h2>
            <p className="mt-6 max-w-md text-lg leading-8 text-slate-500">
              Responbot se ocupa de responder primero, para que no pierdas la venta.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {[
              { icon: Moon, title: 'Mensajes a la noche', text: 'Consultas que llegan cuando ya cerraste.' },
              { icon: Clock3, title: 'Consultas cuando estás ocupado', text: 'No podés responder a todos en el momento.' },
              { icon: UserRound, title: 'Clientes que se van con otro', text: 'El que responde primero se lleva la venta.' },
            ].map(({ icon: Icon, title, text }) => (
              <article key={title} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <Icon className="mb-7 h-8 w-8 text-[#7C5CFF]" />
                <h3 className="text-base font-black text-slate-950">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section id="como-funciona" className="border-b border-slate-200 bg-slate-50/50 py-12 lg:flex lg:min-h-screen lg:items-center lg:py-14">
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-10">
          <h2 className="text-center text-3xl font-black tracking-tight text-slate-950">
            Así funciona <span className="text-[#7C5CFF]">Responbot</span>
          </h2>

          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {steps.map((item, index) => (
              <article key={item.step} className="relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                {index < steps.length - 1 && (
                  <ArrowRight className="absolute -right-5 top-1/2 z-10 hidden h-6 w-6 -translate-y-1/2 text-[#7C5CFF] lg:block" />
                )}
                <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <span className="mb-5 flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#6C4DFF] to-[#A855F7] text-sm font-black text-white">
                      {item.step}
                    </span>
                    <h3 className="font-black text-slate-950">{item.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-500">{item.text}</p>
                  </div>
                  <StepPreview type={item.preview} />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* QUÉ PUEDE HACER / QUÉ NO HACE */}
      <section id="que-hace" className="bg-[#0F1424] py-12 text-white lg:flex lg:min-h-screen lg:items-center lg:py-14">
        <div className="mx-auto w-full max-w-6xl px-5 sm:px-8 lg:px-10">
          <h2 className="text-center text-3xl font-black tracking-tight sm:text-4xl">
            Qué puede hacer <span className="text-[#A855F7]">el bot</span>
          </h2>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-white/12 bg-white/[0.035] p-6">
              <p className="mb-5 text-sm font-black uppercase tracking-widest text-emerald-300">Sí hace</p>
              <ul className="space-y-3">
                {whatBotDoes.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm leading-6 text-slate-200">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-white/12 bg-white/[0.035] p-6">
              <p className="mb-5 text-sm font-black uppercase tracking-widest text-rose-300">No hace</p>
              <ul className="space-y-3">
                {whatBotDoesnt.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm leading-6 text-slate-300">
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-5 text-center text-sm font-semibold leading-6 text-emerald-200">
            El bot solo responde mensajes que llegan. No manda spam, no inicia conversaciones, no reemplaza atención humana.
          </div>
        </div>
      </section>

      {/* PARA QUÉ NEGOCIOS */}
      <section className="border-b border-slate-200 bg-white py-8 lg:py-9">
        <div className="mx-auto grid max-w-7xl gap-6 px-5 sm:px-8 lg:grid-cols-[0.65fr_1.6fr] lg:px-10">
          <h2 className="text-2xl font-black leading-tight tracking-tight">
            Funciona para negocios que reciben consultas <span className="text-[#7C5CFF]">todos los días.</span>
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            {industries.map(({ icon: Icon, title, question }) => (
              <article key={title} className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 text-center">
                <Icon className="mx-auto mb-3 h-5 w-5 text-[#7C5CFF]" />
                <h3 className="text-sm font-black">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-500">&quot;{question}&quot;</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* PRECIO */}
      <section id="precios" className="bg-[#0F1424] py-12 text-white lg:py-14">
        <div className="mx-auto w-full max-w-4xl px-5 sm:px-8 lg:px-10">
          <div className="text-center">
            <p className="mb-2 inline-flex rounded-full border border-violet-400/20 bg-violet-400/10 px-4 py-2 text-sm font-black text-violet-200">
              Precio de lanzamiento
            </p>
            <h2 className="text-4xl font-black leading-tight tracking-tight">
              Un plan, simple y claro.
              <span className="block text-[#A855F7]">Empezás hoy mismo.</span>
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-300">
              Primer mes con descuento. Sin sorpresas, sin contratos.
            </p>
          </div>

          <div className="mt-10">
            <article className="rounded-[2rem] border border-emerald-300 bg-gradient-to-br from-emerald-50 via-white to-white p-8 text-slate-950 shadow-2xl shadow-emerald-950/20">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-3xl font-black">{PLANS.whatsapp.name}</h3>
                    <span className="rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-black text-white">
                      Entrada recomendada
                    </span>
                  </div>
                  <p className="mt-3 max-w-md text-base leading-7 text-slate-600">
                    Bot de WhatsApp por QR activo 24/7. Responde automáticamente con la información de tu negocio.
                  </p>
                </div>
                <div className="shrink-0 rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-4 text-center">
                  <p className="text-xs font-black uppercase tracking-wide text-emerald-700">Primer mes</p>
                  <p className="mt-1 text-4xl font-black text-slate-950">$49.000</p>
                  <p className="mt-1 text-sm font-semibold text-slate-500">luego $79.000/mes</p>
                </div>
              </div>

              <div className="mt-7 grid gap-2 sm:grid-cols-2">
                {[
                  'Bot de WhatsApp por QR',
                  'Panel de configuración',
                  'Prompt personalizado del negocio',
                  'Lista de precios y servicios',
                  'Reglas de respuesta',
                  'Preguntas frecuentes (FAQ)',
                  'Bot activo 24/7 en el servidor',
                  'Soporte inicial de configuración',
                  PLANS.whatsapp.limit,
                ].map((feature) => (
                  <div key={feature} className="flex items-start gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <Link href="/register" className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-4 text-base font-black text-white shadow-lg shadow-emerald-950/10 transition hover:-translate-y-0.5">
                Activar mi bot <ArrowRight className="h-5 w-5" />
              </Link>
            </article>
          </div>

          <div className="mt-5 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm font-semibold leading-6 text-amber-100">
            Dentro del plan podés agregar más respuestas asistidas si las necesitás. Sin compromisos de permanencia.
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="preguntas" className="bg-white py-12 lg:flex lg:min-h-screen lg:items-center lg:py-14">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 sm:px-8 lg:grid-cols-[0.9fr_1.6fr] lg:items-start lg:px-10">
          <div className="lg:sticky lg:top-10">
            <h2 className="text-3xl font-black tracking-tight">Preguntas frecuentes</h2>
            <p className="mt-4 text-slate-500">Respuestas simples para decidir sin vueltas.</p>
            <div className="mt-8 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-5">
              <ShieldCheck className="h-8 w-8 shrink-0 text-[#6C4DFF]" />
              <div>
                <p className="font-black text-slate-950">Sin API oficial</p>
                <p className="mt-1 text-sm text-slate-500">Conecta con tu número actual escaneando un QR. Sin trámites.</p>
              </div>
            </div>
          </div>
          <div className="grid gap-3">
            {faqs.map((faq) => (
              <details key={faq.question} className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-black">
                  {faq.question}
                  <HelpCircle className="h-5 w-5 shrink-0 text-slate-400 transition group-open:rotate-45 group-open:text-[#7C5CFF]" />
                </summary>
                <p className="mt-4 text-sm leading-6 text-slate-500">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-gradient-to-r from-[#6C4DFF] to-[#A855F7] px-5 py-6 text-white sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 text-center sm:flex-row sm:text-left">
          <p className="flex items-center gap-3 text-lg font-black">
            <Rocket className="h-6 w-6" />
            Activá tu bot en menos de 10 minutos.
          </p>
          <Link
            href="/register"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-black text-[#6C4DFF] shadow-lg transition hover:-translate-y-0.5 sm:w-auto"
          >
            Quiero probar gratis
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mx-auto mt-4 max-w-7xl border-t border-white/20 pt-4 text-center text-xs text-white/60">
          <Link href="/privacidad" className="hover:text-white hover:underline">Política de Privacidad</Link>
          {' · '}
          <Link href="/terminos" className="hover:text-white hover:underline">Términos de Servicio</Link>
          {' · '}
          <span>© {new Date().getFullYear()} Responbot</span>
        </div>
      </footer>

      <a
        href="#inicio"
        className="fixed bottom-5 right-5 z-50 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-[#0F1424]/90 text-white shadow-2xl shadow-black/25 backdrop-blur transition hover:-translate-y-0.5 hover:bg-[#7C5CFF] focus:outline-none focus:ring-2 focus:ring-[#A855F7] focus:ring-offset-2 focus:ring-offset-white"
        aria-label="Volver arriba"
        title="Volver arriba"
      >
        <ArrowUp className="h-5 w-5" />
      </a>
    </main>
  )
}
