import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Platform Guide',
  description: 'Complete guide to Esportorium: how to submit a tournament, eligibility criteria, image guidelines, and a full field reference for organisers.',
  alternates: { canonical: '/docs' },
  openGraph: {
    url: 'https://esportorium.com/docs',
    title: 'Platform Guide — Esportorium Docs',
    description: 'How to list your ML tournament on Esportorium — eligibility, submission steps, image specs, and field reference.',
  },
}

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
