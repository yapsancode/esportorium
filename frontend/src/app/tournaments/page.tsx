import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import TournamentList from '@/components/TournamentList'

export const metadata: Metadata = {
  title: 'Browse Tournaments',
  description: 'Discover upcoming, live, and past Mobile Legends tournaments across Malaysia. Browse by state, format, and status. Free to enter. Free to list.',
  keywords: ['malaysia mobile legends tournament', 'esports tournament malaysia', 'turnamen ml malaysia', 'pertandingan esport malaysia', 'ml tournament 2026'],
  alternates: { canonical: '/tournaments' },
  openGraph: {
    url: 'https://esportorium.com/tournaments',
    title: 'Browse Tournaments — Esportorium',
    description: 'Discover upcoming, live, and past Mobile Legends tournaments across Malaysia.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Browse Tournaments — Esportorium',
    description: 'Discover upcoming, live, and past Mobile Legends tournaments across Malaysia.',
  },
}

export default function TournamentsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <TournamentList />
      <Footer />
    </div>
  )
}
