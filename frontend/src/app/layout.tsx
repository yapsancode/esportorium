import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://esportorium.com'),
  title: {
    default: 'Esportorium — Malaysia Esports Tournaments',
    template: '%s — Esportorium',
  },
  description: 'Discover upcoming, live, and past Mobile Legends tournaments across Malaysia. Free to browse. Free to list.',
  twitter: {
    card: 'summary_large_image',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-MY">
      <body>{children}</body>
    </html>
  )
}
