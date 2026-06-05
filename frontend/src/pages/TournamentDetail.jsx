import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import JsonLd from '@/components/JsonLd'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Share2, ExternalLink, ChevronDown, ChevronUp, CalendarPlus, MessageCircle, Copy, Check } from 'lucide-react'

// ─── Utilities ────────────────────────────────────────────────────────────────

/** Detect a Malaysian phone number and return a wa.me URL, or null. */
function whatsAppUrl(contact) {
  const digits = contact.replace(/\D/g, '')
  if (digits.length < 9) return null
  // Normalise to country code 60 (Malaysia)
  const withCode = digits.startsWith('60')
    ? digits
    : `60${digits.replace(/^0/, '')}`
  return `https://wa.me/${withCode}`
}

/** Generate a .ics calendar file and trigger download. */
function downloadIcs({ title, startDate, endDate, url }) {
  const fmt = (d) => d.replace(/-/g, '')   // "2025-01-01" → "20250101"
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Esportorium//EN',
    'BEGIN:VEVENT',
    `DTSTART:${fmt(startDate)}`,
    `DTEND:${fmt(endDate)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:Mobile Legends tournament. Register at ${url}`,
    `URL:${url}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')

  const blob = new Blob([ics], { type: 'text/calendar' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${title.replace(/[^a-z0-9]/gi, '_')}.ics`
  link.click()
  URL.revokeObjectURL(link.href)
}

/** Open Google Calendar with pre-filled event. */
function googleCalendarUrl({ title, startDate, endDate, description }) {
  const fmt = (d) => d.replace(/-/g, '')
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${fmt(startDate)}/${fmt(endDate)}`,
    details: description,
  })
  return `https://calendar.google.com/calendar/render?${params}`
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TournamentDetail() {
  const { id } = useParams()
  const [bannerExpanded, setBannerExpanded] = useState(true)
  const [copied, setCopied] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)

  // ── Placeholder data — replace with API response once wired ──────────────
  const tournament = {
    title: `Tournament ${id} — Placeholder Title`,
    organiser: 'Placeholder Org',
    contact: '+60123456789',   // phone → WhatsApp link; email → mailto
    status: 'upcoming',
    format: 'Online',
    startDate: '2025-01-01',
    endDate: '2025-01-15',
    regDeadline: '2025-12-25',
    maxTeams: 16,
    prizeRm: 500,
    additionalPrizes: 'Trophy, Jersey',
    registrationLink: '#',
  }

  const pageUrl   = window.location.href
  const shareText = `🎮 Check out this ML tournament on Esportorium!\n${tournament.title}`

  const description = `A Mobile Legends tournament open to Malaysian participants. Prize pool: RM ${tournament.prizeRm}. Register before ${tournament.regDeadline}.`
  const canonicalUrl = `https://esportorium.com/tournament/${id}`

  const wa = whatsAppUrl(tournament.contact)

  // ── Event JSON-LD ─────────────────────────────────────────────────────────
  const eventSchema = {
    "@context": "https://schema.org",
    "@type": "Event",
    "name": tournament.title,
    "description": description,
    "url": canonicalUrl,
    "startDate": tournament.startDate,
    "endDate": tournament.endDate,
    "eventStatus": "https://schema.org/EventScheduled",
    "eventAttendanceMode": tournament.format === 'Online'
      ? "https://schema.org/OnlineEventAttendanceMode"
      : "https://schema.org/OfflineEventAttendanceMode",
    "organizer": { "@type": "Organization", "name": tournament.organiser },
    "offers": { "@type": "Offer", "price": "0", "priceCurrency": "MYR", "url": canonicalUrl },
  }

  // ── Share handler (Web Share API → clipboard fallback) ────────────────────
  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: tournament.title, text: shareText, url: pageUrl })
        return
      } catch {
        // User cancelled or share failed — fall through to clipboard
      }
    }
    await navigator.clipboard.writeText(pageUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{tournament.title} — Esportorium</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content={`${tournament.title} — Esportorium`} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <meta name="twitter:title" content={`${tournament.title} — Esportorium`} />
        <meta name="twitter:description" content={description} />
      </Helmet>
      <JsonLd schema={eventSchema} />
      <Navbar />

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Badge variant={tournament.status}>{tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1)}</Badge>
          <span className="text-sm text-muted-foreground">Mobile Legends · {tournament.format}</span>
        </div>

        <h1 className="text-3xl font-extrabold text-foreground sm:text-4xl">
          {tournament.title}
        </h1>
        <p className="mt-1 text-muted-foreground">Organised by {tournament.organiser}</p>

        {/* Action buttons */}
        <div className="mt-6 flex flex-wrap gap-3">
          <a href={tournament.registrationLink} target="_blank" rel="noreferrer">
            <Button>
              Register Now <ExternalLink className="ml-1 h-4 w-4" />
            </Button>
          </a>

          <Button variant="outline" onClick={handleShare}>
            {copied
              ? <><Check className="mr-2 h-4 w-4 text-green-600" /> Copied!</>
              : <><Share2 className="mr-2 h-4 w-4" /> Share</>
            }
          </Button>

          {/* Add to Calendar — expands inline */}
          <div className="relative">
            <Button variant="outline" onClick={() => setCalendarOpen(!calendarOpen)}>
              <CalendarPlus className="mr-2 h-4 w-4" /> Add to Calendar
            </Button>
            {calendarOpen && (
              <div className="absolute left-0 top-12 z-10 w-52 rounded-lg border border-border bg-background shadow-md">
                <button
                  onClick={() => { downloadIcs({ title: tournament.title, startDate: tournament.startDate, endDate: tournament.endDate, url: pageUrl }); setCalendarOpen(false) }}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-muted transition-colors rounded-t-lg"
                >
                  Download .ics (Apple / Outlook)
                </button>
                <a
                  href={googleCalendarUrl({ title: tournament.title, startDate: tournament.startDate, endDate: tournament.endDate, description })}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setCalendarOpen(false)}
                  className="flex w-full items-center gap-2 px-4 py-3 text-sm hover:bg-muted transition-colors rounded-b-lg border-t border-border"
                >
                  Open in Google Calendar
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Collapsible banner */}
        <div className="mt-8">
          <button
            onClick={() => setBannerExpanded(!bannerExpanded)}
            className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Banner {bannerExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {bannerExpanded && (
            <div className="aspect-video w-full overflow-hidden rounded-lg bg-muted" />
          )}
        </div>

        <Separator className="my-8" />

        {/* Details grid */}
        <div className="grid gap-8 sm:grid-cols-2">
          <section>
            <h2 className="mb-4 text-lg font-bold">Details</h2>
            <dl className="space-y-3 text-sm">
              <DetailRow label="Start Date" value="1 January 2025" />
              <DetailRow label="End Date" value="15 January 2025" />
              <DetailRow label="Registration Deadline" value="25 December 2024" />
              <DetailRow label="Format" value={tournament.format} />
              <DetailRow label="Max Teams" value={String(tournament.maxTeams)} />
            </dl>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-bold">Prize Pool</h2>
            <dl className="space-y-3 text-sm">
              <DetailRow label="Cash Prize" value={`RM ${tournament.prizeRm.toLocaleString()}`} />
              <DetailRow label="Additional" value={tournament.additionalPrizes} />
            </dl>

            <h2 className="mb-4 mt-8 text-lg font-bold">Organiser</h2>
            <dl className="space-y-3 text-sm">
              <DetailRow label="Name" value={tournament.organiser} />
              <dt className="text-muted-foreground">Contact</dt>
              <dd className="font-medium">
                {wa ? (
                  <a
                    href={wa}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-green-700 hover:underline"
                  >
                    <MessageCircle className="h-4 w-4" />
                    {tournament.contact}
                    <span className="text-xs text-muted-foreground">(WhatsApp)</span>
                  </a>
                ) : (
                  <a href={`mailto:${tournament.contact}`} className="text-primary hover:underline">
                    {tournament.contact}
                  </a>
                )}
              </dd>
            </dl>
          </section>
        </div>

        {/* Disclaimer */}
        <div className="mt-10 rounded-lg bg-muted/60 px-5 py-4">
          <p className="text-xs leading-relaxed text-muted-foreground">
            <strong className="font-semibold text-foreground">Note:</strong>{' '}
            Esportorium lists this tournament for informational purposes only. We do not organise,
            manage, or guarantee this event. Verify details with the organiser before registering.
            Participate at your own risk.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  )
}

function DetailRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  )
}
