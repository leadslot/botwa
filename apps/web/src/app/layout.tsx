import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Responbot — Tu negocio respondiendo solo',
  description: 'Respondé WhatsApp, Web Chat, Telegram, Meta, Email y CRM desde una sola plataforma.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  )
}
