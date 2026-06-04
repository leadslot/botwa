import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Responbot - Tu negocio respondiendo solo',
  description: 'Responde WhatsApp por QR y Telegram desde un mismo panel, sin API oficial de WhatsApp.',
  icons: { icon: '/logo.png', apple: '/logo.png' },
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
