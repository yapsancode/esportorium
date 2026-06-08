import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'FAQ',
  description: 'Answers to common questions about submitting tournaments, how listings work, eligibility, and the Esportorium platform.',
  alternates: { canonical: '/qna' },
  openGraph: {
    url: 'https://esportorium.com/qna',
    title: 'Frequently Asked Questions — Esportorium',
    description: 'Got questions about submitting or listing a tournament? Find your answers here.',
  },
}

export default function QnALayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
