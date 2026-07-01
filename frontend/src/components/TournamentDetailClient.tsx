'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { Tournament } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Share2, ExternalLink, ChevronDown, ChevronUp, CalendarPlus, MessageCircle, Check, ArrowLeft } from 'lucide-react'

function formatDate(d: string | null) {
  if (!d) return 'TBD'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-MY', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function whatsAppUrl(contact: string | null) {
  if (!contact) return null
  const digits = contact.replace(/\D/g, '')
  if (digits.length < 9) return null
  const withCode = digits.startsWith('60') ? digits : `60${digits.replace(/^0/, '')}`
  return `https://wa.me/${withCode}`
}

function downloadIcs({ title, startDate, endDate, url }: { title: string; startDate: string; endDate: string; url: string }) {
  const fmt = (d: string) => d.replace(/-/g, '')
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Esportorium//EN',
    'BEGIN:VEVENT',
    `DTSTART:${fmt(startDate)}`,
    `DTEND:${fmt(endDate)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:Mobile Legends tournament. Register at ${url}`,
    `URL:${url}`,
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n')
  const blob = new Blob([ics], { type: 'text/calendar' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${title.replace(/[^a-z0-9]/gi, '_')}.ics`
  link.click()
  URL.revokeObjectURL(link.href)
}

function googleCalendarUrl({ title, startDate, endDate, description }: { title: string; startDate: string; endDate: string; description: string }) {
  const fmt = (d: string) => d.replace(/-/g, '')
  const params = new URLSearchParams({
    action: 'TEMPLATE', text: title,
    dates: `${fmt(startDate)}/${fmt(endDate)}`,
    details: description,
  })
  return `https://calendar.google.com/calendar/render?${params}`
}

export default function TournamentDetailClient({ tournament }: { tournament: Tournament }) {
  const [bannerExpanded, setBannerExpanded] = useState(true)
  const [copied, setCopied]                 = useState(false)
  const [calendarOpen, setCalendarOpen]     = useState(false)

  const {
    title, status, format, state, venue, stage_notes,
    start_date, end_date, registration_deadline,
    prize_pool_rm, additional_prizes, max_teams,
    organiser_name, organiser_contact,
    registration_link, banner_image,
  } = tournament

  const pageUrl      = typeof window !== 'undefined' ? window.location.href : ''
  const formatLabel  = format === 'online' ? 'Online'
    : format === 'hybrid' ? `Hybrid${state ? ` · ${state}` : ''}`
    : format === 'offline' ? `Offline${state ? ` · ${state}` : ''}`
    : 'Format TBD'
  const prizeLabel   = prize_pool_rm != null ? `RM ${prize_pool_rm.toLocaleString()}` : 'TBD'
  const description  = `A Mobile Legends tournament open to Malaysian participants. Prize pool: ${prizeLabel}. Register before ${formatDate(registration_deadline)}.`
  const wa           = whatsAppUrl(organiser_contact)
  const hasDates     = Boolean(start_date && end_date)

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: `🎮 Check out this ML tournament on Esportorium!\n${title}`, url: pageUrl })
        return
      } catch { /* cancelled */ }
    }
    await navigator.clipboard.writeText(pageUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to tournaments
      </Link>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Badge variant={status as any}>{status === 'tbd' ? 'TBD' : status.charAt(0).toUpperCase() + status.slice(1)}</Badge>
        <span className="text-sm text-muted-foreground">Mobile Legends · {formatLabel}</span>
      </div>

      <h1 className="text-3xl font-extrabold text-foreground sm:text-4xl">{title}</h1>
      <p className="mt-1 text-muted-foreground">Organised by {organiser_name ?? 'TBD'}</p>

      <div className="mt-6 flex flex-wrap gap-3">
        {registration_link ? (
          <a href={registration_link} target="_blank" rel="noreferrer">
            <Button>
              Register Now <ExternalLink className="ml-1 h-4 w-4" />
            </Button>
          </a>
        ) : (
          <Button disabled>Registration link coming soon</Button>
        )}

        <Button variant="outline" onClick={handleShare}>
          {copied
            ? <><Check className="mr-2 h-4 w-4 text-green-600" /> Copied!</>
            : <><Share2 className="mr-2 h-4 w-4" /> Share</>
          }
        </Button>

        {hasDates && (
          <div className="relative">
            <Button variant="outline" onClick={() => setCalendarOpen(!calendarOpen)}>
              <CalendarPlus className="mr-2 h-4 w-4" /> Add to Calendar
            </Button>
            {calendarOpen && (
              <div className="absolute left-0 top-12 z-10 w-52 rounded-lg border border-border bg-background shadow-md">
                <button
                  onClick={() => { downloadIcs({ title, startDate: start_date as string, endDate: end_date as string, url: pageUrl }); setCalendarOpen(false) }}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-muted transition-colors rounded-t-lg"
                >
                  Download .ics (Apple / Outlook)
                </button>
                <a
                  href={googleCalendarUrl({ title, startDate: start_date as string, endDate: end_date as string, description })}
                  target="_blank" rel="noreferrer"
                  onClick={() => setCalendarOpen(false)}
                  className="flex w-full items-center gap-2 px-4 py-3 text-sm hover:bg-muted transition-colors rounded-b-lg border-t border-border"
                >
                  Open in Google Calendar
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {banner_image && (
        <div className="mt-8">
          <button
            onClick={() => setBannerExpanded(!bannerExpanded)}
            className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Banner {bannerExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {bannerExpanded && (
            <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
              <Image
                src={banner_image}
                alt={`${title} banner`}
                fill
                sizes="(max-width: 768px) 100vw, 768px"
                className="object-cover"
              />
            </div>
          )}
        </div>
      )}

      <Separator className="my-8" />

      <div className="grid gap-8 sm:grid-cols-2">
        <section>
          <h2 className="mb-4 text-lg font-bold">Details</h2>
          <dl className="space-y-3 text-sm">
            <DetailRow label="Start Date"            value={formatDate(start_date)} />
            <DetailRow label="End Date"              value={formatDate(end_date)} />
            <DetailRow label="Registration Deadline" value={formatDate(registration_deadline)} />
            <DetailRow label="Format"                value={formatLabel} />
            {venue && <DetailRow label="Venue"       value={venue} />}
            {format === 'hybrid' && stage_notes && <DetailRow label="Stages" value={stage_notes} />}
            <DetailRow label="Max Teams"             value={max_teams != null ? String(max_teams) : 'TBD'} />
          </dl>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-bold">Prize Pool</h2>
          <dl className="space-y-3 text-sm">
            <DetailRow label="Cash Prize" value={prizeLabel} />
            {additional_prizes?.length > 0 && (
              <DetailRow label="Additional" value={additional_prizes.join(', ')} />
            )}
          </dl>

          <h2 className="mb-4 mt-8 text-lg font-bold">Organiser</h2>
          <dl className="space-y-3 text-sm">
            <DetailRow label="Name" value={organiser_name ?? 'TBD'} />
            {organiser_contact && (
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Contact</dt>
                <dd className="text-right font-medium">
                  {wa ? (
                    <a href={wa} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-green-700 hover:underline">
                      <MessageCircle className="h-4 w-4" />
                      {organiser_contact}
                      <span className="text-xs text-muted-foreground">(WhatsApp)</span>
                    </a>
                  ) : (
                    <a href={`mailto:${organiser_contact}`} className="text-primary hover:underline">
                      {organiser_contact}
                    </a>
                  )}
                </dd>
              </div>
            )}
          </dl>
        </section>
      </div>

      <div className="mt-10 rounded-lg bg-muted/60 px-5 py-4">
        <p className="text-xs leading-relaxed text-muted-foreground">
          <strong className="font-semibold text-foreground">Note:</strong>{' '}
          Esportorium lists this tournament for informational purposes only. We do not organise,
          manage, or guarantee this event. Verify details with the organiser before registering.
          Participate at your own risk.
        </p>
      </div>
    </main>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  )
}
