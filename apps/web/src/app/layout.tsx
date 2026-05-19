import type { Metadata } from 'next'
import './globals.css'
import CookieCleaner from '@/components/CookieCleaner'

export const metadata: Metadata = {
  title: 'BotWA — Tu negocio respondiendo solo',
  description: 'Conectá tu WhatsApp y dejá que la IA responda por vos, 24/7.',
}

const fetchPatchScript = `(function(){if(window.__fp)return;var f=window.fetch.bind(window);window.fetch=function(i,o){if(o&&o.headers){var e=o.headers instanceof Headers?[...o.headers.entries()]:Object.entries(o.headers);var s={};e.forEach(function(x){s[x[0]]=String(x[1]).replace(/[^\\x00-\\xFF]/g,'');});o=Object.assign({},o,{headers:s});}return f(i,o);};window.__fp=1;})()`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        {/* Parchea window.fetch ANTES de que Supabase inicialice — evita el error ISO-8859-1 */}
        <script dangerouslySetInnerHTML={{ __html: fetchPatchScript }} />
      </head>
      <body className="bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  )
}
