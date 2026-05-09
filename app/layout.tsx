import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = { 
  title: 'The Sneacker Guys - Sales & Stock Manager', 
  description: 'Inventory and CRM',
  icons: { icon: '/icon.svg' }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="es"><body>{children}</body></html>
}