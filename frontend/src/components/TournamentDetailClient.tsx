'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { Tournament } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Share2, ExternalLink, ChevronDown, ChevronUp, CalendarPlus, MessageCircle, Check, ArrowLeft } from 'lucide-react'
import LocalizedMeta from '@/components/LocalizedMeta'
import { DEFAULT_BANNER } from '@/lib/utils'
import { useLang, formatDate as i18nFormatDate } from '@/lib/i18n'

function whatsAppUrl(contact: string | null) {
  if (!contact) return null
  const digits = contact.replace(/\D/g, '')
  if (digits.length < 9) return null
  const withCode = digits.startsWith('60') ? digits : `60${digits.replace(/^0/, '')}`
  return `https://wa.me/${withCode}`
}

function downloadIcs({ title, startDate, endDate, url, description }: { title: string; startDate: string; endDate: string; url: string; description: string }) {
  const fmt = (d: string) => d.replace(/-/g, '')
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Esportorium//EN',
    'BEGIN:VEVENT',
    `DTSTART:${fmt(startDate)}`,
    `DTEND:${fmt(endDate)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
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
  const { t, lang } = useLang()
  const [bannerExpanded, setBannerExpanded] = useState(true)
  const [copied, setCopied]                 = useState(false)
  const [calendarOpen, setCalendarOpen]     = useState(false)

  const formatDate = (d: string | null) => i18nFormatDate(d, lang)

  const {
    title, status, format, state, venue, stage_notes, description,
    start_date, end_date, registration_deadline,
    prize_pool_rm, additional_prizes, prize_breakdown, max_teams,
    organiser_name, organiser_contact,
    registration_link, banner_image,
  } = tournament

  const pageUrl      = typeof window !== 'undefined' ? window.location.href : ''
  const formatLabel  = format === 'online' ? t.detail.formatOnline
    : format === 'hybrid' ? `${t.detail.formatHybrid}${state ? ` · ${state}` : ''}`
    : format === 'offline' ? `${t.detail.formatOffline}${state ? ` · ${state}` : ''}`
    : t.detail.formatTBD
  const prizeLabel     = prize_pool_rm != null ? `RM ${prize_pool_rm.toLocaleString()}` : t.status.tbd
  const summaryText    = t.detail.summary(prizeLabel, formatDate(registration_deadline))
  const icsDescription = t.detail.icsDescription(registration_link || pageUrl)
  const statusLabel    = status === 'tbd' ? t.status.tbd : ((t.status as Record<string, string>)[status] ?? status)
  const wa           = whatsAppUrl(organiser_contact)
  const hasDates     = Boolean(start_date && end_date)

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: t.detail.shareText(title), url: pageUrl })
        return
      } catch { /* cancelled */ }
    }
    await navigator.clipboard.writeText(pageUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const metaDescription = description || summaryText

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <LocalizedMeta title={`${title}${t.meta.titleSuffix}`} description={metaDescription} />
      <Link href="/tournaments" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> {t.common.backToTournaments}
      </Link>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Badge variant={status as any}>{statusLabel}</Badge>
        <span className="text-sm text-muted-foreground">{t.detail.game} · {formatLabel}</span>
      </div>

      <h1 className="text-3xl font-extrabold text-foreground sm:text-4xl">{title}</h1>
      <p className="mt-1 text-muted-foreground">{t.detail.organisedBy} {organiser_name ?? t.status.tbd}</p>

      <div className="mt-6 flex flex-wrap gap-3">
        {registration_link ? (
          <a href={registration_link} target="_blank" rel="noreferrer">
            <Button>
              {t.detail.registerNow} <ExternalLink className="ml-1 h-4 w-4" />
            </Button>
          </a>
        ) : (
          <Button disabled>{t.detail.registrationSoon}</Button>
        )}

        <Button variant="outline" onClick={handleShare}>
          {copied
            ? <><Check className="mr-2 h-4 w-4 text-green-600" /> {t.detail.copied}</>
            : <><Share2 className="mr-2 h-4 w-4" /> {t.detail.share}</>
          }
        </Button>

        {hasDates && (
          <div className="relative">
            <Button variant="outline" onClick={() => setCalendarOpen(!calendarOpen)}>
              <CalendarPlus className="mr-2 h-4 w-4" /> {t.detail.addToCalendar}
            </Button>
            {calendarOpen && (
              <div className="absolute left-0 top-12 z-10 w-52 rounded-lg border border-border bg-background shadow-md">
                <button
                  onClick={() => { downloadIcs({ title, startDate: start_date as string, endDate: end_date as string, url: pageUrl, description: icsDescription }); setCalendarOpen(false) }}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-muted transition-colors rounded-t-lg"
                >
                  {t.detail.downloadIcs}
                </button>
                <a
                  href={googleCalendarUrl({ title, startDate: start_date as string, endDate: end_date as string, description: summaryText })}
                  target="_blank" rel="noreferrer"
                  onClick={() => setCalendarOpen(false)}
                  className="flex w-full items-center gap-2 px-4 py-3 text-sm hover:bg-muted transition-colors rounded-b-lg border-t border-border"
                >
                  {t.detail.openGoogleCalendar}
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-8">
        <button
          onClick={() => setBannerExpanded(!bannerExpanded)}
          className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {t.detail.banner} {bannerExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {bannerExpanded && (
          <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
            <Image
              src={banner_image || DEFAULT_BANNER}
              alt={`${title} banner`}
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
            />
          </div>
        )}
      </div>

      <Separator className="my-8" />

      {description && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-bold">{t.detail.description}</h2>
          <p className="whitespace-pre-line text-sm text-muted-foreground">{description}</p>
        </section>
      )}

      <div className="grid gap-8 sm:grid-cols-2">
        <section>
          <h2 className="mb-4 text-lg font-bold">{t.detail.details}</h2>
          <dl className="space-y-3 text-sm">
            <DetailRow label={t.detail.startDate}            value={formatDate(start_date)} />
            <DetailRow label={t.detail.endDate}              value={formatDate(end_date)} />
            <DetailRow label={t.detail.registrationDeadline} value={formatDate(registration_deadline)} />
            <DetailRow label={t.detail.format}               value={formatLabel} />
            {venue && <DetailRow label={t.detail.venue}      value={venue} />}
            {format === 'hybrid' && stage_notes && <DetailRow label={t.detail.stages} value={stage_notes} />}
            <DetailRow label={t.detail.maxTeams}             value={max_teams != null ? String(max_teams) : t.status.tbd} />
          </dl>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-bold">{t.detail.prizePool}</h2>
          <dl className="space-y-3 text-sm">
            <DetailRow label={t.detail.cashPrize} value={prizeLabel} />
            {prize_breakdown?.map((item, i) => (
              <DetailRow key={i} label={item.placement} value={item.reward} />
            ))}
            {additional_prizes?.length > 0 && (
              <DetailRow label={t.detail.additional} value={additional_prizes.join(', ')} />
            )}
          </dl>

          <h2 className="mb-4 mt-8 text-lg font-bold">{t.detail.organiser}</h2>
          <dl className="space-y-3 text-sm">
            <DetailRow label={t.detail.name} value={organiser_name ?? t.status.tbd} />
            {organiser_contact && (
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{t.detail.contact}</dt>
                <dd className="text-right font-medium">
                  {wa ? (
                    <a href={wa} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-green-700 hover:underline">
                      <MessageCircle className="h-4 w-4" />
                      {organiser_contact}
                      <span className="text-xs text-muted-foreground">{t.detail.whatsapp}</span>
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
          <strong className="font-semibold text-foreground">{t.detail.noteLabel}</strong>{' '}
          {t.detail.note}
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
