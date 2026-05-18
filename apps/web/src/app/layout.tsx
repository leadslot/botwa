import type { Metadata } from 'next'
import './globals.css'
import CookieCleaner from '@/components/CookieCleaner'

export const metadata: Metadata = {
  title: 'BotWA — Tu negocio respondiendo solo',
  description: 'Conectá tu WhatsApp y dejá que la IA responda por vos, 24/7.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <CookieCleaner />
        {children}
      </body>
    </html>
  )
}
