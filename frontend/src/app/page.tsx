import type { Metadata } from 'next'
import JsonLd from '@/components/JsonLd'
import LandingClient from '@/components/LandingClient'
import { serverFetch } from '@/lib/api'
import type { Tournament } from '@/lib/types'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Esportorium — Malaysia Esports Tournaments',
  description: 'Malaysia\'s curated home for Mobile Legends tournaments. Find upcoming tournaments near you, or list yours for free and reach players nationwide.',
  keywords: ['malaysia mobile legends tournament', 'esports tournament malaysia', 'turnamen ml malaysia', 'pertandingan esport malaysia', 'ml tournament 2026'],
  alternates: { canonical: '/' },
  openGraph: {
    url: 'https://esportorium.com/',
    title: 'Esportorium — Malaysia Esports Tournaments',
    description: 'Malaysia\'s curated home for Mobile Legends tournaments. Find one near you, or list yours for free.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Esportorium — Malaysia Esports Tournaments',
    description: 'Malaysia\'s curated home for Mobile Legends tournaments. Find one near you, or list yours for free.',
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

// Landing data is best-effort: if the backend is cold or down, render the
// static sections and skip stats/featured rather than blocking the page.
async function getTournaments(): Promise<Tournament[] | null> {
  try {
    return await serverFetch<Tournament[]>('/api/tournaments', {
      next: { revalidate: 60 },
    })
  } catch (err) {
    console.error('[LandingPage] getTournaments failed:', err)
    return null
  }
}

export default async function LandingPage() {
  const tournaments = await getTournaments()

  return (
    <>
      <JsonLd schema={websiteSchema} />
      <LandingClient tournaments={tournaments} />
    </>
  )
}
