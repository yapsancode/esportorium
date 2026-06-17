import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import TournamentList from '@/components/TournamentList'
import JsonLd from '@/components/JsonLd'

export const metadata: Metadata = {
  title: 'Malaysia Esports Tournaments',
  description: 'Discover upcoming, live, and past Mobile Legends tournaments across Malaysia. Browse by state, format, and status. Free to enter. Free to list.',
  keywords: ['malaysia mobile legends tournament', 'esports tournament malaysia', 'turnamen ml malaysia', 'pertandingan esport malaysia', 'ml tournament 2026'],
  alternates: { canonical: '/' },
  openGraph: {
    url: 'https://esportorium.com/',
    title: 'Esportorium — Malaysia Esports Tournaments',
    description: 'Discover upcoming, live, and past Mobile Legends tournaments across Malaysia.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Esportorium — Malaysia Esports Tournaments',
    description: 'Discover upcoming, live, and past Mobile Legends tournaments across Malaysia.',
  },
}

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Esportorium",
  "url": "https://esportorium.com",
  "description": "Malaysia's curated esports tournament discovery platform for Mobile Legends.",
  "inLanguage": "en-MY",
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <JsonLd schema={websiteSchema} />
      <Navbar />
      <TournamentList />
      <Footer />
    </div>
  )
}
