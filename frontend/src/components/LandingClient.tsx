'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Instrument_Serif } from 'next/font/google'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import LocalizedMeta from '@/components/LocalizedMeta'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import type { Tournament } from '@/lib/types'
import { cn, DEFAULT_BANNER } from '@/lib/utils'
import { useLang, formatDateRange } from '@/lib/i18n'
import {
  ShieldCheck, MapPin, Trophy, Send, CalendarDays,
  ArrowRight, ArrowUpRight, Wallet, Sparkles, CheckCircle2,
  AlertTriangle, ChevronDown,
} from 'lucide-react'

// Display serif used for accent words, headings, and stat numerals on the
// landing page only — body copy stays Plus Jakarta Sans.
const serif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  display: 'swap',
})

export default function LandingClient({ tournaments }: { tournaments: Tournament[] | null }) {
  const { t } = useLang()

  const upcoming = (tournaments ?? [])
    .filter((t) => t.status === 'upcoming')
    .sort((a, b) => (a.start_date ?? '9999').localeCompare(b.start_date ?? '9999'))
  const current = (tournaments ?? []).filter((t) => t.status === 'current')

  // Prefer soonest upcoming; pad with live ones if fewer than 3.
  const featured = [...upcoming, ...current].slice(0, 3)

  const totalPrizeRM = (tournaments ?? []).reduce((sum, t) => sum + (t.prize_pool_rm ?? 0), 0)

  const stats = tournaments && tournaments.length > 0 ? [
    { value: tournaments.length.toLocaleString(), label: t.home.statTournamentsListed },
    { value: (upcoming.length + current.length).toLocaleString(), label: t.home.statOpenOrLive },
    { value: `RM ${totalPrizeRM.toLocaleString()}`, label: t.home.statInPrizePools },
  ] : null

  return (
    <div className="relative min-h-screen">
      <LocalizedMeta title={t.meta.homeTitle} description={t.meta.homeDescription} />
      {/* Scenic backdrop — fixed so the floating panels scroll over it. */}
      <div className="fixed inset-0 -z-10" aria-hidden="true">
        <Image
          src="/background.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        {/* Soft wash so hero text stays readable over the busy mid-image. */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/85 via-white/55 to-white/15" />
      </div>

      <Navbar floating />

      <main className="px-4 pb-16 pt-32 sm:px-6 sm:pt-44 lg:px-8">

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl text-center">
          <h1 className="mx-auto max-w-4xl text-4xl font-light leading-[1.15] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            {t.home.heroEvery}{' '}
            <HeroChip icon={<Trophy className="h-4 w-4 text-white sm:h-5 sm:w-5" aria-hidden="true" />} tone="primary">
              {t.home.heroTournament}
            </HeroChip>{' '}
            {t.home.heroIn}
            <br />
            <HeroChip icon={<MapPin className="h-4 w-4 text-white sm:h-5 sm:w-5" aria-hidden="true" />} tone="neutral">
              {t.home.heroMalaysia}
            </HeroChip>{t.home.heroTail}
          </h1>

          <p className="mx-auto mt-7 max-w-xl text-base font-medium text-foreground/90 sm:text-lg">
            {t.home.heroSubtitle}
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/tournaments">
              <Button size="lg" className="h-12 gap-2 rounded-full px-7 text-base shadow-lg shadow-primary/30">
                {t.home.browseTournaments}
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </Link>
            <Link href="/submit">
              <Button
                size="lg"
                className="h-12 gap-2 rounded-full bg-white/90 px-7 text-base text-foreground shadow-md shadow-black/5 hover:bg-white"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
                {t.home.listYourTournament}
              </Button>
            </Link>
          </div>

          {stats && (
            <dl className="mt-12 flex flex-wrap items-center justify-center gap-3">
              {stats.map(({ value, label }) => (
                <div
                  key={label}
                  className="flex items-baseline gap-2 rounded-full border border-white/60 bg-white/85 px-5 py-2.5 shadow-sm"
                >
                  <dd className={cn(serif.className, 'text-2xl leading-none text-foreground')}>{value}</dd>
                  <dt className="text-sm text-muted-foreground">{label}</dt>
                </div>
              ))}
            </dl>
          )}
        </section>

        {/* ── Featured tournaments panel ───────────────────────────────── */}
        {featured.length > 0 && (
          <section className="mx-auto mt-20 max-w-6xl rounded-[2rem] border border-white/60 bg-background/95 p-6 shadow-2xl shadow-black/10 sm:p-10">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <h2 className={cn(serif.className, 'text-3xl text-foreground sm:text-4xl')}>{t.home.featuredTitle}</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">{t.home.featuredSubtitle}</p>
              </div>
              <Link
                href="/tournaments"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/15"
              >
                {t.home.viewAll}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((tour) => (
                <FeaturedCard key={tour.id} tournament={tour} />
              ))}
            </div>
          </section>
        )}

        {/* ── How it works panel ───────────────────────────────────────── */}
        <section className="mx-auto mt-8 max-w-6xl rounded-[2rem] border border-white/60 bg-background/95 p-6 shadow-2xl shadow-black/10 sm:p-10">
          <h2 className={cn(serif.className, 'text-center text-3xl text-foreground sm:text-4xl')}>
            {t.home.howItWorks}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-center text-sm text-muted-foreground">
            {t.home.howItWorksSubtitle}
          </p>

          {/* Players: numbered journey + browse preview */}
          <div className="mt-10 grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-12">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">{t.home.forPlayers}</p>
              <ol className="mt-6">
                <JourneyStep n="01" title={t.home.playerStep1Title}>
                  {t.home.playerStep1}
                </JourneyStep>
                <JourneyStep n="02" title={t.home.playerStep2Title}>
                  {t.home.playerStep2}
                </JourneyStep>
                <JourneyStep n="03" title={t.home.playerStep3Title}>
                  {t.home.playerStep3}
                </JourneyStep>
              </ol>
            </div>
            <BrowseMockup />
          </div>

          {/* Organisers: AI ingest showcase + numbered journey */}
          <div className="mt-12 grid grid-cols-1 items-center gap-8 border-t border-border pt-12 lg:grid-cols-2 lg:gap-12">
            <div className="lg:order-2">
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">{t.home.forOrganisers}</p>
              <ol className="mt-6">
                <JourneyStep n="01" title={t.home.organiserStep1Title}>
                  {t.home.organiserStep1}
                </JourneyStep>
                <JourneyStep n="02" title={t.home.organiserStep2Title}>
                  {t.home.organiserStep2}
                </JourneyStep>
                <JourneyStep n="03" title={t.home.organiserStep3Title}>
                  {t.home.organiserStep3}
                </JourneyStep>
              </ol>
            </div>
            <IngestShowcase />
          </div>

          <div className="mt-12 grid gap-8 border-t border-border pt-8 sm:grid-cols-3">
            <Feature icon={ShieldCheck} title={t.home.featureCuratedTitle}>
              {t.home.featureCurated}
            </Feature>
            <Feature icon={MapPin} title={t.home.featureAllMalaysiaTitle}>
              {t.home.featureAllMalaysia}
            </Feature>
            <Feature icon={Wallet} title={t.home.featureFreeTitle}>
              {t.home.featureFree}
            </Feature>
          </div>
        </section>

        {/* ── FAQ panel ────────────────────────────────────────────────── */}
        <section className="mx-auto mt-8 max-w-6xl rounded-[2rem] border border-white/60 bg-background/95 p-6 shadow-2xl shadow-black/10 sm:p-10">
          <div className="mx-auto max-w-2xl">
            <h2 className={cn(serif.className, 'text-center text-3xl text-foreground sm:text-4xl')}>
              {t.home.faqTitle}
            </h2>
            <div className="mt-6">
              {t.home.faqs.map(({ q, a }) => (
                <details key={q} className="group border-b border-border py-4 last:border-0">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-foreground [&::-webkit-details-marker]:hidden">
                    {q}
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{a}</p>
                </details>
              ))}
            </div>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              {t.home.faqMore}{' '}
              <Link href="/qna" className="font-medium text-primary hover:underline">{t.home.faqQnaLink}</Link>.
            </p>
          </div>
        </section>

        {/* ── Organiser CTA card ───────────────────────────────────────── */}
        <section className="mx-auto mt-8 max-w-6xl">
          <div className="relative overflow-hidden rounded-[2rem] bg-[#1C1815]/95 px-6 py-16 text-center shadow-2xl shadow-black/20 sm:px-12 lg:py-20">
            {/* Pro-player cutouts pinned to the bottom corners, toned dark and
                warm so they blend into the card instead of sitting on top of it.
                Desktop only — below lg they'd crowd the CTA text. */}
            <Image
              src="/pro-player1.png"
              alt=""
              width={399}
              height={501}
              aria-hidden="true"
              className="pointer-events-none absolute -left-2 bottom-0 hidden w-56 select-none opacity-50 grayscale sepia-[.4] brightness-[.55] contrast-[1.05] lg:block xl:w-72"
            />
            <Image
              src="/pro-player2.png"
              alt=""
              width={600}
              height={400}
              aria-hidden="true"
              className="pointer-events-none absolute -right-4 bottom-0 hidden w-80 select-none opacity-50 grayscale sepia-[.4] brightness-[.55] contrast-[1.05] lg:block xl:w-96"
            />

            <div className="relative z-10">
            <h2 className="relative mx-auto max-w-xl text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              {t.home.ctaTitleBefore}
              {t.home.ctaTitleWord
                ? <>{' '}<span className={cn(serif.className, 'font-normal italic text-[#E8A87C]')}>{t.home.ctaTitleWord}</span></>
                : null}
              {t.home.ctaTitleAfter}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm text-white/70 sm:text-base">
              {t.home.ctaSubtitle}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/submit">
                <Button size="lg" className="h-12 rounded-full bg-white px-7 text-base text-foreground hover:bg-white/90">
                  {t.home.ctaListFree}
                </Button>
              </Link>
              <Link href="/organiser/signup">
                <Button size="lg" className="h-12 rounded-full bg-transparent px-7 text-base text-white/85 shadow-none hover:bg-white/10 hover:text-white">
                  {t.home.ctaCreateAccount}
                </Button>
              </Link>
            </div>
            <p className="mt-5 text-xs text-white/50">
              {t.home.ctaFinePrint}
            </p>
            </div>

          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

// Highlighted word inside the hero headline — icon tile + serif italic text
// on a soft rounded chip, per the reference art direction.
function HeroChip({
  icon, tone, children,
}: {
  icon: React.ReactNode
  tone: 'primary' | 'neutral'
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        'mx-1 inline-flex -translate-y-1 items-center gap-2 rounded-2xl px-3 py-1.5 align-middle shadow-sm sm:gap-3 sm:px-4 sm:py-2',
        tone === 'primary' ? 'bg-[#F5E3D5]/95' : 'border border-white/60 bg-white/90'
      )}
    >
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-11 sm:w-11 sm:rounded-xl',
          tone === 'primary' ? 'bg-primary' : 'bg-foreground'
        )}
      >
        {icon}
      </span>
      <span className={cn(serif.className, 'italic', tone === 'primary' ? 'text-primary' : 'text-foreground')}>
        {children}
      </span>
    </span>
  )
}

function FeaturedCard({ tournament }: { tournament: Tournament }) {
  const { t, lang } = useLang()
  const { id, title, status, format, state, organiser_name, prize_pool_rm, start_date, end_date, banner_image } = tournament
  const location = format === 'online' ? t.browse.online : (state || t.browse.malaysia)
  const statusLabel = (t.status as Record<string, string>)[status] ?? status

  return (
    <Link href={`/tournament/${id}`}>
      <Card className="overflow-hidden transition-shadow hover:shadow-md cursor-pointer">
        <div className="relative aspect-video w-full bg-muted overflow-hidden">
          <Image
            src={banner_image || DEFAULT_BANNER}
            alt={title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
          />
        </div>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base leading-snug">{title}</CardTitle>
            <Badge variant={status as any} className="shrink-0">{statusLabel}</Badge>
          </div>
          <CardDescription>{organiser_name ?? t.home.organiserTBD}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm text-muted-foreground">
          <p className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {formatDateRange(start_date, end_date, lang)}
          </p>
          <p className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {location}
          </p>
          <p className="flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {prize_pool_rm != null ? `RM ${prize_pool_rm.toLocaleString()} ${t.home.prizePoolSuffix}` : t.home.prizePoolTBD}
          </p>
        </CardContent>
      </Card>
    </Link>
  )
}

// Numbered step with a serif numeral and a connecting rule down to the next step.
function JourneyStep({
  n, title, children,
}: {
  n: string
  title: string
  children: React.ReactNode
}) {
  return (
    <li className="relative flex gap-5 pb-7 last:pb-0 before:absolute before:bottom-0 before:left-5 before:top-12 before:w-px before:bg-border last:before:hidden">
      <span className={cn(serif.className, 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-lg text-primary')}>
        {n}
      </span>
      <div>
        <p className="font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{children}</p>
      </div>
    </li>
  )
}

// Static, illustrative peek at the /tournaments browse experience. Sample data
// only — never depends on the API, so it always renders.
function BrowseMockup() {
  const { t } = useLang()
  const rows = [
    { title: t.home.mockRow1Title, meta: t.home.mockRow1Meta, prize: 'RM 3,000', badge: 'upcoming', label: t.status.upcoming },
    { title: t.home.mockRow2Title, meta: t.home.mockRow2Meta, prize: 'RM 2,000', badge: 'upcoming', label: t.status.upcoming },
    { title: t.home.mockRow3Title, meta: t.home.mockRow3Meta, prize: 'RM 5,000', badge: 'current', label: t.status.live },
  ]
  return (
    <div aria-hidden="true" className="rounded-2xl border border-border bg-background p-4 shadow-xl shadow-black/5 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">{t.status.upcoming}</span>
        <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">{t.status.live}</span>
        <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">{t.status.past}</span>
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
          <MapPin className="h-3 w-3" />
          {t.home.mockAllStates}
          <ChevronDown className="h-3 w-3" />
        </span>
      </div>
      <div className="mt-4 space-y-2.5">
        {rows.map(({ title, meta, prize, badge, label }) => (
          <div key={title} className="flex items-center gap-3 rounded-xl border border-border p-2.5 sm:p-3">
            <div className="relative hidden h-12 w-20 shrink-0 overflow-hidden rounded-md bg-muted min-[420px]:block">
              <Image src={DEFAULT_BANNER} alt="" fill sizes="80px" className="object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm font-semibold text-foreground sm:line-clamp-1">{title}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{meta}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <Badge variant={badge as any}>{label}</Badge>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <Trophy className="h-3 w-3" />
                {prize}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Illustrative before/after of the agentic ingest: a messy pasted poster on
// top, extraction status pills, and the structured draft it produces.
function IngestShowcase() {
  const { t } = useLang()
  const fields = [
    { label: t.home.ingestFieldTitle, value: 'Piala Komuniti Selangor', ok: true },
    { label: t.home.ingestFieldDates, value: '23–24 Aug 2026', ok: true },
    { label: t.home.ingestFieldPrize, value: 'RM 2,000', ok: true },
    { label: t.home.ingestFieldDeadline, value: t.home.ingestConfirmThis, ok: false },
  ]
  return (
    <div aria-hidden="true" className="rounded-2xl bg-gradient-to-br from-rose-100 via-amber-50 to-sky-100 p-4 shadow-xl shadow-black/5 sm:p-6">
      <div className="rounded-xl bg-background/95 p-4 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t.home.ingestPasteLabel}</p>
        <p className="mt-1.5 text-sm leading-relaxed text-foreground/80">
          🏆🔥 OPEN REGISTRATION!! PIALA KOMUNITI SELANGOR — MLBB 5v5. 23–24 Ogos, Dewan MPS Shah Alam.
          Yuran RM50/team, 32 slot je!! Prize pool RM2,000 + trophy. DM utk daftar 🔥
        </p>
      </div>

      <div className="my-4 flex flex-col items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-full bg-background px-4 py-1.5 text-xs font-semibold tracking-wide text-foreground shadow-sm">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          {t.home.ingestParsed}
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-background px-4 py-1.5 text-xs font-semibold tracking-wide text-foreground shadow-sm">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          {t.home.ingestExtracted}
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-background px-4 py-1.5 text-xs font-semibold tracking-wide text-foreground shadow-sm">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
          {t.home.ingestFlagged}
        </span>
      </div>

      <div className="rounded-xl bg-background/95 p-4 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t.home.ingestDraftLabel}</p>
        <dl className="mt-2 space-y-1.5">
          {fields.map(({ label, value, ok }) => (
            <div key={label} className="flex items-center justify-between gap-3 text-sm">
              <dt className="shrink-0 text-muted-foreground">{label}</dt>
              <dd className="flex min-w-0 items-center gap-1.5 font-medium text-foreground">
                <span className="truncate">{value}</span>
                {ok
                  ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  : <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}

function Feature({
  icon: Icon, title, children,
}: {
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="text-center sm:text-left">
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-5 w-5 text-primary" aria-hidden />
      </span>
      <h3 className="mt-4 font-bold text-foreground">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{children}</p>
    </div>
  )
}
