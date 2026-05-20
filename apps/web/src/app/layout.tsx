import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Responbot — Tu negocio respondiendo solo',
  description: 'Conectá tu WhatsApp y dejá que la IA responda por vos, 24/7.',
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
