import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Submit a Tournament',
  description: 'List your Mobile Legends tournament on Esportorium for free. No account required. Submissions are reviewed within 1–2 business days.',
  alternates: { canonical: '/submit' },
  openGraph: {
    url: 'https://esportorium.com/submit',
    title: 'Submit a Tournament — Esportorium',
    description: 'List your Mobile Legends tournament on Esportorium for free. No account required. Review within 1–2 business days.',
  },
}

export default function SubmitLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
