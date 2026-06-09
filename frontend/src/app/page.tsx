import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import TournamentList from '@/components/TournamentList'
import JsonLd from '@/components/JsonLd'
import { serverFetch } from '@/lib/api'
import type { Tournament } from '@/lib/types'

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

async function getTournaments(): Promise<Tournament[] | null> {
  try {
    return await serverFetch<Tournament[]>('/api/tournaments', {
      next: { revalidate: 60 },
    })
  } catch (err) {
    console.error('[HomePage] getTournaments failed:', err)
    return null   // null = fetch error; [] = genuinely empty
  }
}


export default async function HomePage() {
  const tournaments = await getTournaments()

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Malaysian Esports Tournaments",
    "description": "Curated list of Mobile Legends tournaments in Malaysia.",
    "url": "https://esportorium.com",
    "numberOfItems": tournaments?.length ?? 0,
    "itemListElement": (tournaments ?? []).slice(0, 20).map((t, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "url": `https://esportorium.com/tournament/${t.id}`,
      "name": t.title,
    })),
  }

  return (
    <div className="min-h-screen bg-background">
      <JsonLd schema={websiteSchema} />
      <JsonLd schema={itemListSchema} />
      <Navbar />
      <TournamentList initialTournaments={tournaments} />
      <Footer />
    </div>
  )
}
