import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import JsonLd from '@/components/JsonLd'
import TournamentDetailClient from '@/components/TournamentDetailClient'

interface Tournament {
  id: string
  title: string
  status: string
  format: string
  state: string | null
  venue: string | null
  start_date: string
  end_date: string
  registration_deadline: string
  prize_pool_rm: number
  additional_prizes: string[]
  max_teams: number
  organiser_name: string
  organiser_contact: string
  registration_link: string
  banner_image: string | null
}

async function getTournament(id: string): Promise<Tournament | null> {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'
  try {
    const res = await fetch(`${base}/api/tournaments/${id}`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-MY', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params
  const tournament = await getTournament(id)
  if (!tournament) return { title: 'Tournament Not Found' }

  const { title, prize_pool_rm, registration_deadline, format, banner_image } = tournament
  const description = `A Mobile Legends tournament open to Malaysian participants. Prize pool: RM ${prize_pool_rm.toLocaleString()}. Register before ${formatDate(registration_deadline)}.`
  const canonicalUrl = `https://esportorium.com/tournament/${id}`

  return {
    title,
    description,
    alternates: { canonical: `/tournament/${id}` },
    openGraph: {
      url: canonicalUrl,
      title: `${title} — Esportorium`,
      description,
      type: 'website',
      ...(banner_image ? { images: [{ url: banner_image, width: 1280, height: 720, alt: title }] } : {}),
    },
    twitter: {
      card: banner_image ? 'summary_large_image' : 'summary',
      title: `${title} — Esportorium`,
      description,
      ...(banner_image ? { images: [banner_image] } : {}),
    },
  }
}

export default async function TournamentDetailPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const tournament = await getTournament(id)
  if (!tournament) notFound()

  const { title, prize_pool_rm, registration_deadline, format, start_date, end_date } = tournament
  const canonicalUrl = `https://esportorium.com/tournament/${id}`
  const description = `A Mobile Legends tournament open to Malaysian participants. Prize pool: RM ${prize_pool_rm.toLocaleString()}. Register before ${formatDate(registration_deadline)}.`

  const eventSchema = {
    "@context": "https://schema.org",
    "@type": "Event",
    "name": title,
    "description": description,
    "url": canonicalUrl,
    "startDate": start_date,
    "endDate": end_date,
    "eventStatus": "https://schema.org/EventScheduled",
    "eventAttendanceMode": format === 'online'
      ? "https://schema.org/OnlineEventAttendanceMode"
      : "https://schema.org/OfflineEventAttendanceMode",
    ...(tournament.banner_image ? { "image": tournament.banner_image } : {}),
    "location": format === 'online'
      ? { "@type": "VirtualLocation", "url": tournament.registration_link }
      : {
          "@type": "Place",
          "name": tournament.venue || tournament.state || "Malaysia",
          "address": {
            "@type": "PostalAddress",
            "addressCountry": "MY",
            ...(tournament.state ? { "addressRegion": tournament.state } : {}),
            ...(tournament.venue ? { "streetAddress": tournament.venue } : {}),
          },
        },
    "organizer": { "@type": "Organization", "name": tournament.organiser_name },
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "MYR",
      "url": tournament.registration_link,
      "availability": "https://schema.org/InStock",
      "validThrough": registration_deadline,
    },
  }

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://esportorium.com" },
      { "@type": "ListItem", "position": 2, "name": title, "item": canonicalUrl },
    ],
  }

  return (
    <div className="min-h-screen bg-background">
      <JsonLd schema={eventSchema} />
      <JsonLd schema={breadcrumbSchema} />
      <Navbar />
      <TournamentDetailClient tournament={tournament} />
      <Footer />
    </div>
  )
}
