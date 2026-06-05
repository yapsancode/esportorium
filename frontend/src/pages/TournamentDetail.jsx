import { useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import JsonLd from '@/components/JsonLd'
import Navbar from '@/components/Navbar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Share2, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

export default function TournamentDetail() {
  const { id } = useParams()
  const [bannerExpanded, setBannerExpanded] = useState(true)

  // Placeholder values — replace with real tournament data once API is wired
  const title = `Tournament ${id} — Placeholder Title`
  const description = "A Mobile Legends tournament open to Malaysian participants. Check the registration link for details."
  const canonicalUrl = `https://esportorium.com/tournament/${id}`

  const eventSchema = {
    "@context": "https://schema.org",
    "@type": "Event",
    "name": title,
    "description": description,
    "url": canonicalUrl,
    "startDate": "2025-01-01",
    "endDate": "2025-01-15",
    "eventStatus": "https://schema.org/EventScheduled",
    "eventAttendanceMode": "https://schema.org/OnlineEventAttendanceMode",
    "location": {
      "@type": "VirtualLocation",
      "url": "https://esportorium.com"
    },
    "organizer": {
      "@type": "Organization",
      "name": "Placeholder Org"
    },
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "MYR",
      "availability": "https://schema.org/InStock",
      "url": canonicalUrl
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{title} — Esportorium</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content={`${title} — Esportorium`} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <meta name="twitter:title" content={`${title} — Esportorium`} />
        <meta name="twitter:description" content={description} />
      </Helmet>
      <JsonLd schema={eventSchema} />
      <Navbar />

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center gap-3">
          <Badge variant="upcoming">Upcoming</Badge>
          <span className="text-sm text-muted-foreground">Mobile Legends · Online</span>
        </div>

        <h1 className="text-3xl font-extrabold text-foreground sm:text-4xl">
          Tournament {id} — Placeholder Title
        </h1>

        <p className="mt-1 text-muted-foreground">Organised by Placeholder Org</p>

        <div className="mt-6 flex flex-wrap gap-3">
          <a href="#" target="_blank" rel="noreferrer">
            <Button>
              Register Now <ExternalLink className="ml-1 h-4 w-4" />
            </Button>
          </a>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Share2 className="mr-2 h-4 w-4" /> Share
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Share Tournament</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-3 pt-2">
                <Button variant="outline">Copy link</Button>
                <Button variant="outline">Share with poster</Button>
                <Button variant="outline">Share without poster</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mt-8">
          <button
            onClick={() => setBannerExpanded(!bannerExpanded)}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            Banner {bannerExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {bannerExpanded && (
            <div className="aspect-video w-full rounded-lg bg-muted overflow-hidden" />
          )}
        </div>

        <Separator className="my-8" />

        <div className="grid gap-8 sm:grid-cols-2">
          <section>
            <h2 className="mb-4 font-bold text-lg">Details</h2>
            <dl className="space-y-3 text-sm">
              <DetailRow label="Start Date" value="1 January 2025" />
              <DetailRow label="End Date" value="15 January 2025" />
              <DetailRow label="Registration Deadline" value="25 December 2024" />
              <DetailRow label="Format" value="Online" />
              <DetailRow label="Max Teams" value="16" />
            </dl>
          </section>

          <section>
            <h2 className="mb-4 font-bold text-lg">Prize Pool</h2>
            <dl className="space-y-3 text-sm">
              <DetailRow label="Cash Prize" value="RM 500" />
              <DetailRow label="Additional" value="Trophy, Jersey" />
            </dl>

            <h2 className="mb-4 mt-8 font-bold text-lg">Organiser</h2>
            <dl className="space-y-3 text-sm">
              <DetailRow label="Name" value="Placeholder Org" />
              <DetailRow label="Contact" value="placeholder@example.com" />
            </dl>
          </section>
        </div>
      </main>
    </div>
  )
}

function DetailRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-right">{value}</dd>
    </div>
  )
}
