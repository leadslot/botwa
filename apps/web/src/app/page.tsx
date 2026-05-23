import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowRight,
  ArrowUp,
  BarChart3,
  Bot,
  Camera,
  Check,
  CheckCircle2,
  Clock3,
  Globe2,
  HelpCircle,
  LayoutDashboard,
  MapPin,
  Menu,
  MessagesSquare,
  Moon,
  PackageCheck,
  Rocket,
  Send,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Store,
  UserRound,
  Zap,
} from 'lucide-react'
import { PLANS } from '@/lib/plans'

const navLinks = [
  { label: 'Cómo funciona', href: '#como-funciona' },
  { label: 'Beneficios', href: '#beneficios' },
  { label: 'Precios', href: '#precios' },
  { label: 'Preguntas', href: '#preguntas' },
]

const trustItems = ['Prueba inicial', 'Sin tarjeta', 'Canales oficiales']

const channels = [
  { icon: Smartphone, name: 'WhatsApp QR', text: 'Plan de entrada para responder rapido.' },
  { icon: ShieldCheck, name: 'WhatsApp API', text: 'Canal oficial para negocios con Meta.' },
  { icon: Bot, name: 'Mails', text: 'Gmail, Outlook e iCloud con borradores sugeridos.' },
  { icon: Camera, name: 'Instagram', text: 'DMs con integracion oficial de Meta.' },
  { icon: MessagesSquare, name: 'Facebook', text: 'Messenger de paginas conectadas.' },
  { icon: Send, name: 'Telegram', text: 'Bot propio conectado desde BotFather.' },
  { icon: Globe2, name: 'Web Chat', text: 'Widget para instalar en tu sitio.' },
]

const problemCards = [
  {
    icon: Moon,
    title: 'Mensajes a la noche',
    text: 'Consultas que llegan cuando ya cerraste.',
  },
  {
    icon: Clock3,
    title: 'Consultas cuando estás ocupado',
    text: 'No podés responder a todos en el momento.',
  },
  {
    icon: UserRound,
    title: 'Clientes que se van con otro',
    text: 'El que responde primero, se lleva la venta.',
  },
]

const steps = [
  {
    step: '01',
    title: 'Configurás tu negocio',
    text: 'Cargas servicios, precios, preguntas frecuentes, tono de respuesta y reglas por canal.',
    preview: 'form',
  },
  {
    step: '02',
    title: 'Conectás tus canales',
    text: 'Activás WhatsApp, Web Chat, Telegram, Meta o Email según el plan contratado.',
    preview: 'qr',
  },
  {
    step: '03',
    title: 'Respondes y ordenas oportunidades',
    text: 'El bot responde y el CRM simple ordena contactos, historial, estado y proxima accion.',
    preview: 'chat',
  },
]

const benefits = [
  {
    icon: Clock3,
    title: 'Responde 24/7',
    text: 'El bot vive en nuestro servidor. No depende de que tu PC esté prendida.',
  },
  {
    icon: Zap,
    title: 'Respuestas en segundos',
    text: 'Tus clientes reciben respuesta antes de perder el interés.',
  },
  {
    icon: BarChart3,
    title: 'Aumenta tus ventas',
    text: 'Un cliente que recibe respuesta inmediata tiene muchas más chances de comprar.',
  },
  {
    icon: Smartphone,
    title: 'Canales por separado',
    text: 'Pausás Facebook, Instagram, Telegram, WhatsApp o Web Chat sin apagar todo.',
  },
  {
    icon: LayoutDashboard,
    title: 'CRM y seguimiento',
    text: 'Cada contacto queda con historial, estado, score, notas y próxima acción.',
  },
  {
    icon: Sparkles,
    title: 'CRM simple incluido',
    text: 'En el plan Completo unificás contactos, canales, etiquetas y seguimiento básico.',
  },
  {
    icon: ShieldCheck,
    title: 'Sin spam ni campañas',
    text: 'Solo responde mensajes que llegan. Nada de campañas masivas.',
  },
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
    question: '¿Cuál es el plan para empezar?',
    answer: 'El plan de entrada es Basico WhatsApp: WhatsApp, Web Chat, panel, prompt del negocio y hasta 500 respuestas asistidas. Para negocios con alta demanda de turnos, el plan Gold agrega agenda integrada y recordatorios automaticos.',
  },
  {
    question: '¿Mails es un plan o un complemento?',
    answer: 'Puede venderse como plan propio o como complemento. Sirve para Gmail, Outlook e iCloud con clasificacion y borradores sugeridos.',
  },
  {
    question: '¿Puedo pausar una red sin apagar todo?',
    answer: 'Sí. Cada canal tiene pausa independiente para cortar WhatsApp, Telegram, Facebook, Instagram, Web Chat o Email por separado.',
  },
  {
    question: '¿El CRM viene incluido?',
    answer: 'El CRM simple entra en el plan Completo para ordenar contactos, estados y seguimiento. No lo vendemos como producto enterprise.',
  },
  {
    question: '¿Las respuestas con IA son ilimitadas?',
    answer: 'No conviene prometer eso. Cada plan incluye una cantidad de respuestas asistidas y el uso intensivo puede requerir ampliación o API propia.',
  },
]

const entryPlanOrder = ['whatsapp', 'email'] as const
const growthPlanOrder = ['social', 'gold'] as const

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

function MiniDashboardChart() {
  const days = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

  return (
    <div className="rounded-lg border border-slate-100 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-black">Mensajes por día</p>
        <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-600">+28%</span>
      </div>

      <div className="relative h-36 overflow-hidden rounded-lg bg-gradient-to-b from-violet-50/80 to-white px-2 pt-3">
        <svg viewBox="0 0 220 112" className="h-full w-full" aria-hidden="true">
          <defs>
            <linearGradient id="messagesArea" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#7C5CFF" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#7C5CFF" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M10 92H210" stroke="#E2E8F0" strokeWidth="1" />
          <path d="M10 62H210" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="4 5" />
          <path d="M10 32H210" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="4 5" />
          <path d="M10 78 C38 80 43 34 70 38 S101 85 128 66 S160 16 184 28 S199 56 210 50 L210 100 L10 100 Z" fill="url(#messagesArea)" />
          <path
            d="M10 78 C38 80 43 34 70 38 S101 85 128 66 S160 16 184 28 S199 56 210 50"
            fill="none"
            stroke="#7C5CFF"
            strokeLinecap="round"
            strokeWidth="4"
          />
          {[10, 70, 128, 184, 210].map((cx, index) => (
            <circle key={cx} cx={cx} cy={[78, 38, 66, 28, 50][index]} r="4.5" fill="#FFFFFF" stroke="#7C5CFF" strokeWidth="3" />
          ))}
        </svg>
      </div>

      <div className="mt-2 grid grid-cols-7 text-center text-[10px] font-semibold text-slate-400">
        {days.map((day, index) => (
          <span key={`${day}-${index}`}>{day}</span>
        ))}
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
              Tu negocio, respondiendo 24/7
            </div>

            <h1 className="max-w-3xl text-5xl font-black leading-[0.98] tracking-tight sm:text-6xl lg:text-[64px] xl:text-7xl">
              No pierdas clientes
              <span className="mt-2 block bg-gradient-to-r from-[#8B6BFF] to-[#A855F7] bg-clip-text text-transparent">
                por responder tarde.
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200 lg:text-[19px]">
              Responbot responde WhatsApp, Web Chat, Telegram, Instagram, Facebook y correos desde un mismo panel, con CRM simple para ordenar oportunidades.
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

      <section className="border-b border-slate-200 bg-white py-8">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-950">Canales que puede responder</h2>
              <p className="mt-2 text-sm text-slate-500">La plataforma no queda atada a WhatsApp: cada canal se conecta, pausa, mide y escala por plan.</p>
            </div>
            <Link href="/register" className="text-sm font-black text-[#6C4DFF] hover:underline">Activar canales</Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {channels.map(({ icon: Icon, name, text }) => (
              <article key={name} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#6C4DFF] shadow-sm">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="font-black text-slate-950">{name}</h3>
                <p className="mt-1 text-sm leading-5 text-slate-500">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white py-10 lg:flex lg:min-h-screen lg:items-center lg:py-12">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 sm:px-8 lg:grid-cols-[0.82fr_1.68fr] lg:items-center lg:px-10">
          <div>
            <h2 className="text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">
              Mientras vos trabajás,
              <span className="block text-[#7C5CFF]">tus clientes siguen escribiendo.</span>
            </h2>
            <p className="mt-6 max-w-md text-lg leading-8 text-slate-500">
              Responbot se ocupa de responder primero, para que vos no pierdas la venta.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {problemCards.map(({ icon: Icon, title, text }) => (
              <article key={title} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <Icon className="mb-7 h-8 w-8 text-[#7C5CFF]" />
                <h3 className="text-base font-black text-slate-950">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

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

      <section id="beneficios" className="bg-[#0F1424] py-12 text-white lg:flex lg:min-h-screen lg:items-center lg:py-14">
        <div className="mx-auto w-full max-w-6xl px-5 sm:px-8 lg:px-10">
          <h2 className="text-center text-3xl font-black tracking-tight sm:text-4xl">
            Todo lo que necesitás, <span className="text-[#A855F7]">sin complicaciones.</span>
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {benefits.map(({ icon: Icon, title, text }) => (
              <article key={title} className="rounded-xl border border-white/12 bg-white/[0.035] p-5">
                <div className="flex gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#6C4DFF] to-[#A855F7] shadow-lg shadow-violet-950/35">
                    <Icon className="h-6 w-6" />
                  </span>
                  <div>
                    <h3 className="font-black">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-300">{text}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white py-10 lg:flex lg:min-h-screen lg:items-center lg:py-12">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-8 px-5 sm:px-8 lg:grid-cols-[0.62fr_1fr] lg:px-10">
          <div>
            <h2 className="text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">
              Todo bajo control desde un <span className="text-[#7C5CFF]">panel simple.</span>
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-500">
              Podés ver qué respondió el bot, revisar conversaciones, ordenar contactos en CRM, detectar oportunidades y tomar el control cuando quieras.
            </p>
            <div className="mt-7 space-y-3 text-sm font-medium text-slate-600">
              {['Conversaciones en tiempo real', 'CRM de contactos', 'Mails y redes en un panel', 'Pausa por canal'].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#22C55E]" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-200/70">
            <div className="grid min-h-[310px] lg:grid-cols-[170px_1fr]">
              <aside className="border-b border-slate-200 bg-slate-50 p-5 lg:border-b-0 lg:border-r">
                <div className="mb-7 flex items-center gap-2 font-black">
                  <Image src="/logo.png" alt="" width={28} height={28} className="rounded-lg" />
                  Responbot
                </div>
                {['Dashboard', 'Canales', 'Conversaciones', 'CRM', 'Configuración'].map((item, index) => (
                  <div
                    key={item}
                    className={`mb-2 rounded-lg px-3 py-2 text-xs font-bold ${
                      index === 0 ? 'bg-violet-100 text-[#6C4DFF]' : 'text-slate-500'
                    }`}
                  >
                    {item}
                  </div>
                ))}
              </aside>

              <div className="p-5">
                <h3 className="mb-5 font-black">Dashboard</h3>
                <div className="grid gap-3 sm:grid-cols-4">
                  {[
                    ['Canales activos', '4', 'Hoy'],
                    ['Respondidas', '342', 'Hoy'],
                    ['Leads CRM', '58', 'Abiertos'],
                    ['CRM', '58', 'Contactos'],
                  ].map(([label, value, hint]) => (
                    <div key={label} className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm">
                      <p className="text-[11px] font-bold text-slate-400">{label}</p>
                      <p className="mt-2 text-xl font-black text-slate-950">{value}</p>
                      <p className="mt-1 text-[11px] text-slate-400">{hint}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-[1fr_0.9fr]">
                  <div className="rounded-lg border border-slate-100 p-4 shadow-sm">
                    <p className="mb-4 text-sm font-black">Últimas conversaciones</p>
                    {[
                      ['C1', 'Cliente 1', 'Hola, ¿tenés disponibilidad?', 'Respondido hace 3 seg'],
                      ['C2', 'Cliente 2', '¿Hacen envíos a todo el país?', 'Respondido hace 8 seg'],
                      ['C3', 'Cliente 3', '¿Cuáles son los horarios?', 'Respondido hace 15 seg'],
                    ].map(([initials, name, text, time]) => (
                      <div key={name} className="mb-3 flex items-center gap-3 last:mb-0">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#6C4DFF] to-[#A855F7] text-[10px] font-black text-white">
                          {initials}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-black">{name}</p>
                          <p className="truncate text-[11px] text-slate-500">{text}</p>
                        </div>
                        <p className="hidden rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-600 sm:block">{time}</p>
                      </div>
                    ))}
                  </div>

                  <MiniDashboardChart />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white py-8 lg:py-9">
        <div className="mx-auto grid max-w-7xl gap-6 px-5 sm:px-8 lg:grid-cols-[0.65fr_1.6fr] lg:px-10">
          <h2 className="text-2xl font-black leading-tight tracking-tight">
            Responbot funciona para negocios que reciben consultas <span className="text-[#7C5CFF]">todos los días.</span>
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

      <section id="preguntas" className="bg-white py-12 lg:flex lg:min-h-screen lg:items-center lg:py-14">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 sm:px-8 lg:grid-cols-[0.9fr_1.6fr] lg:items-center lg:px-10">
          <div>
            <h2 className="text-3xl font-black tracking-tight">Preguntas frecuentes</h2>
            <p className="mt-4 text-slate-500">Respuestas simples para decidir sin vueltas.</p>
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

      <section id="precios" className="bg-[#0F1424] py-12 text-white lg:py-14">
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="mx-auto max-w-4xl text-center">
            <p className="mb-2 inline-flex rounded-full border border-violet-400/20 bg-violet-400/10 px-4 py-2 text-sm font-black text-violet-200">
              Tarifario recomendado
            </p>
            <h2 className="text-4xl font-black leading-tight tracking-tight">
              Elegi por donde queres empezar
              <span className="block text-[#A855F7]">y suma canales cuando haga falta.</span>
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              Los planes de entrada son Basico WhatsApp y Mails. Completo suma redes y CRM. Gold agrega agenda de turnos y recordatorios automaticos.
            </p>
          </div>

          <div className="mt-7">
            <div className="mb-3 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">Planes de entrada</p>
                <h3 className="text-2xl font-black">Arrancar simple</h3>
              </div>
              <p className="hidden max-w-sm text-right text-sm text-slate-300 sm:block">La promo vive dentro del plan. No hay doble tarjeta ni precio duplicado.</p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {entryPlanOrder.map((tier) => (
                <article key={tier} className={`rounded-[2rem] border p-6 ${
                  tier === 'whatsapp'
                    ? 'border-emerald-300 bg-gradient-to-br from-emerald-50 via-white to-white text-slate-950 shadow-2xl shadow-emerald-950/20'
                    : 'border-violet-200/60 bg-white text-slate-950 shadow-2xl shadow-black/20'
                }`}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-2xl font-black">{PLANS[tier].name}</h4>
                        <span className={`rounded-full px-3 py-1 text-[11px] font-black ${tier === 'whatsapp' ? 'bg-emerald-500 text-white' : 'bg-[#F1EDFF] text-[#6C4DFF]'}`}>
                          {tier === 'whatsapp' ? 'Entrada recomendada' : 'Plan de mails'}
                        </span>
                      </div>
                      <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">{PLANS[tier].description}</p>
                    </div>
                    <div className={`rounded-2xl border px-4 py-3 ${tier === 'whatsapp' ? 'border-emerald-200 bg-emerald-50' : 'border-violet-100 bg-violet-50'}`}>
                      <p className="text-xs font-black uppercase tracking-wide text-slate-500">{PLANS[tier].firstMonthLabel}</p>
                      <p className="mt-1 text-2xl font-black text-slate-950">{PLANS[tier].publicLabel}</p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    {[...PLANS[tier].features.slice(0, 4), PLANS[tier].limit, PLANS[tier].users].map((feature) => (
                      <div key={feature} className="flex items-start gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#22C55E]" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Link href="/register" className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 ${
                    tier === 'whatsapp' ? 'bg-emerald-500 shadow-lg shadow-emerald-950/10' : 'bg-gradient-to-r from-[#6C4DFF] to-[#A855F7] shadow-lg shadow-violet-950/10'
                  }`}>
                    {tier === 'whatsapp' ? 'Arrancar con Basico' : 'Activar Mails'} <ArrowRight className="h-4 w-4" />
                  </Link>
                </article>
              ))}
            </div>
          </div>

          <div className="mt-8 mb-3 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-300">Planes avanzados</p>
              <h3 className="text-2xl font-black">Crecer y automatizar</h3>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {growthPlanOrder.map((tier) => {
              const isGold = tier === 'gold'
              return (
                <article key={tier} className={`rounded-[2rem] border p-6 text-slate-950 shadow-2xl ${isGold ? 'border-amber-300 bg-gradient-to-br from-amber-50 via-white to-white shadow-amber-950/15' : 'border-violet-300 bg-white shadow-violet-950/15'}`}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-2xl font-black">{PLANS[tier].name}</h4>
                        {PLANS[tier].badge && (
                          <span className={`rounded-full px-3 py-1 text-[11px] font-black text-white ${isGold ? 'bg-amber-500' : 'bg-[#A855F7]'}`}>
                            {PLANS[tier].badge}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">{PLANS[tier].description}</p>
                    </div>
                    <div className={`shrink-0 rounded-2xl px-4 py-3 text-left ${isGold ? 'bg-amber-50 border border-amber-200' : 'bg-violet-50'}`}>
                      <p className={`text-xs font-black uppercase tracking-wide ${isGold ? 'text-amber-700' : 'text-[#6C4DFF]'}`}>{PLANS[tier].firstMonthLabel}</p>
                      <p className="mt-1 text-2xl font-black text-slate-950">{PLANS[tier].priceLabel}</p>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    {[...PLANS[tier].features.slice(0, 4), PLANS[tier].limit, PLANS[tier].users].map((feature) => (
                      <div key={feature} className="flex items-start gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                        <Check className={`mt-0.5 h-4 w-4 shrink-0 ${isGold ? 'text-amber-500' : 'text-[#22C55E]'}`} />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                  <Link href="/register" className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 shadow-lg ${isGold ? 'bg-amber-500 shadow-amber-950/10' : 'bg-gradient-to-r from-[#6C4DFF] to-[#A855F7] shadow-violet-950/10'}`}>
                    {isGold ? 'Activar Gold con Agenda' : 'Activar Completo'} <ArrowRight className="h-4 w-4" />
                  </Link>
                </article>
              )
            })}
          </div>

          <div className="mt-5 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm font-semibold leading-6 text-amber-100">
            Mensajes ilimitados dentro del panel. Respuestas asistidas incluidas segun plan. El uso intensivo de IA, WhatsApp oficial o APIs externas puede requerir ampliacion, siempre avisando antes de cualquier ajuste.
          </div>
        </div>
      </section>

      <footer className="bg-gradient-to-r from-[#6C4DFF] to-[#A855F7] px-5 py-6 text-white sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 text-center sm:flex-row sm:text-left">
          <p className="flex items-center gap-3 text-lg font-black">
            <Rocket className="h-6 w-6" />
            Empezá gratis y activá tu bot en menos de 2 minutos.
          </p>
          <Link
            href="/register"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-black text-[#6C4DFF] shadow-lg transition hover:-translate-y-0.5 sm:w-auto"
          >
            Quiero probar gratis
            <ArrowRight className="h-4 w-4" />
          </Link>
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
