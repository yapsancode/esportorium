import type { Metadata } from 'next'
import PrivacyClient from '@/components/PrivacyClient'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Esportorium collects, uses, and protects your data — including organiser emails, what is public, and which third-party services we rely on.',
  alternates: { canonical: '/privacy' },
  openGraph: {
    url: 'https://esportorium.com/privacy',
    title: 'Privacy Policy — Esportorium',
    description: 'What we collect, how we use it, and what is never shown publicly.',
  },
}

export default function PrivacyPolicy() {
  return <PrivacyClient />
}
