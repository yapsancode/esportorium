import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Submit a Tournament',
  description: 'List your Mobile Legends tournament on Esportorium. Free, no account needed.',
  alternates: { canonical: '/submit' },
}

export default function SubmitLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
