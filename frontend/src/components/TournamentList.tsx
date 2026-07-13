'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { Tournament } from '@/lib/types'
import Preloader from '@/components/ui/preloader'
import JsonLd from '@/components/JsonLd'
import LocalizedMeta from '@/components/LocalizedMeta'
import { apiFetch } from '@/lib/api'
import { useLang, formatDateRange } from '@/lib/i18n'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { LayoutGrid, List, Wifi, MapPin } from 'lucide-react'
import { cn, DEFAULT_BANNER } from '@/lib/utils'

const STATES = [
  'Kuala Lumpur', 'Selangor', 'Johor', 'Penang', 'Sabah', 'Sarawak',
  'Perak', 'Kedah', 'Kelantan', 'Terengganu', 'Pahang', 'Negeri Sembilan',
  'Melaka', 'Perlis', 'Putrajaya', 'Labuan',
]

const PRELOADER_KEY = 'esportorium_preloader_shown'

export default function TournamentList() {
  const { t, lang } = useLang()

  // undefined = still loading; null = fetch failed; [] = API returned empty list.
  const [tournaments, setTournaments] = useState<Tournament[] | null | undefined>(undefined)
  const [showPreloader, setShowPreloader] = useState(true)

  // Only show the full-screen preloader once per browser session.
  useEffect(() => {
    if (sessionStorage.getItem(PRELOADER_KEY)) {
      setShowPreloader(false)
    } else {
      sessionStorage.setItem(PRELOADER_KEY, 'true')
    }
  }, [])

  // Fetch tournaments on the client so the page shell + preloader paint instantly,
  // even while the backend cold-starts.
  useEffect(() => {
    let cancelled = false
    apiFetch('/api/tournaments')
      .then((data: Tournament[]) => { if (!cancelled) setTournaments(data) })
      .catch(() => { if (!cancelled) setTournaments(null) })
    return () => { cancelled = true }
  }, [])

  const dataReady = tournaments !== undefined

  const FORMAT_OPTIONS = [
    { value: 'all',     label: t.format.all },
    { value: 'online',  label: t.format.online,  icon: <Wifi className="h-3.5 w-3.5" /> },
    { value: 'offline', label: t.format.offline, icon: <MapPin className="h-3.5 w-3.5" /> },
    { value: 'hybrid',  label: t.format.hybrid,  icon: <MapPin className="h-3.5 w-3.5" /> },
  ]

  const [statusFilter, setStatusFilter] = useState('upcoming')
  const [formatFilter, setFormatFilter] = useState('all')
  const [stateFilter,  setStateFilter]  = useState('')
  const [viewMode,     setViewMode]     = useState<'grid' | 'list'>('grid')

  function handleFormatChange(val: string) {
    setFormatFilter(val)
    if (val === 'online') setStateFilter('')
  }

  const filtered = (tournaments ?? []).filter((tour) => {
    if (statusFilter !== 'all' && tour.status !== statusFilter) return false
    if (formatFilter !== 'all' && tour.format !== formatFilter) return false
    if (stateFilter && formatFilter !== 'online') {
      if ((tour.format === 'offline' || tour.format === 'hybrid') && tour.state !== stateFilter) return false
    }
    return true
  })

  const stateDisabled = formatFilter === 'online'

  const itemListSchema = tournaments && tournaments.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Malaysian Esports Tournaments",
    "description": "Curated list of Mobile Legends tournaments in Malaysia.",
    "url": "https://esportorium.com/tournaments",
    "numberOfItems": tournaments.length,
    "itemListElement": tournaments.slice(0, 20).map((tour, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "url": `https://esportorium.com/tournament/${tour.id}`,
      "name": tour.title,
    })),
  } : null

  return (
    <>
      <LocalizedMeta title={t.meta.browseTitle} description={t.meta.browseDescription} />
      {showPreloader && <Preloader done={dataReady} />}
      {itemListSchema && <JsonLd schema={itemListSchema} />}
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-foreground sm:text-4xl">
            {t.browse.title}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {t.browse.subtitle}
          </p>
        </div>

        <div className="mb-6 flex flex-col gap-3">
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList>
              <TabsTrigger value="all">{t.format.all}</TabsTrigger>
              <TabsTrigger value="upcoming">{t.status.upcoming}</TabsTrigger>
              <TabsTrigger value="current">{t.status.current}</TabsTrigger>
              <TabsTrigger value="past">{t.status.past}</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-lg border border-border overflow-hidden">
              {FORMAT_OPTIONS.map(({ value, label, icon }) => (
                <button
                  key={value}
                  onClick={() => handleFormatChange(value)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors border-r border-border last:border-r-0',
                    formatFilter === value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>

            <div className="relative">
              <Select
                value={stateFilter || 'all-states'}
                onValueChange={(v) => setStateFilter(v === 'all-states' ? '' : v)}
                disabled={stateDisabled}
              >
                <SelectTrigger className={cn('w-44', stateDisabled && 'opacity-40 cursor-not-allowed')}>
                  <SelectValue placeholder={t.browse.filterByState} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-states">{t.browse.allStates}</SelectItem>
                  {STATES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {stateDisabled && (
                <p className="absolute -bottom-5 left-0 text-xs text-muted-foreground whitespace-nowrap">
                  {t.browse.onlineNationwide}
                </p>
              )}
            </div>

            <div className="flex-1" />

            <div className="flex rounded-lg border border-border overflow-hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode('grid')}
                className={cn('rounded-none border-r border-border', viewMode === 'grid' && 'bg-muted')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode('list')}
                className={cn('rounded-none', viewMode === 'list' && 'bg-muted')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {tournaments === undefined ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm text-muted-foreground">{t.browse.loadingTournaments}</p>
          </div>
        ) : tournaments === null ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-lg font-semibold text-foreground">{t.browse.couldNotLoad}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t.browse.couldNotLoadHint}
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-lg font-semibold text-foreground">{t.browse.noneFound}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t.browse.noneFoundHint}</p>
          </div>
        ) : (
          <div className={cn(
            'gap-4',
            viewMode === 'grid' ? 'grid sm:grid-cols-2 lg:grid-cols-3' : 'flex flex-col'
          )}>
            {filtered.map((tour) => (
              <TournamentCard key={tour.id} tournament={tour} viewMode={viewMode} />
            ))}
          </div>
        )}
      </main>
    </>
  )
}

function TournamentCard({ tournament, viewMode }: { tournament: Tournament; viewMode: 'grid' | 'list' }) {
  const { t, lang } = useLang()
  const { id, title, status, format, state, organiser_name, prize_pool_rm, start_date, end_date, banner_image } = tournament
  const location = format === 'online' ? t.browse.online : (state || t.browse.malaysia)
  const dateRange = formatDateRange(start_date, end_date, lang)
  const prizeLabel = prize_pool_rm != null ? `RM ${prize_pool_rm.toLocaleString()}` : 'RM TBD'
  const statusLabel = (t.status as Record<string, string>)[status] ?? status

  if (viewMode === 'list') {
    return (
      <Link href={`/tournament/${id}`}>
        <Card className="overflow-hidden transition-shadow hover:shadow-md cursor-pointer">
          <div className="flex items-center gap-4 p-4">
            <div className="relative h-16 w-24 shrink-0 rounded-md bg-muted overflow-hidden">
              <Image src={banner_image || DEFAULT_BANNER} alt={title} fill sizes="96px" className="object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-foreground truncate">{title}</p>
                <div className="flex items-center gap-2 shrink-0">
                  <FormatBadge format={format} />
                  <Badge variant={status as any}>{statusLabel}</Badge>
                </div>
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">{organiser_name ?? t.browse.organiserTBD}</p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>📅 {dateRange}</span>
                <span>📍 {location}</span>
                <span>🏆 {prizeLabel}</span>
              </div>
            </div>
          </div>
        </Card>
      </Link>
    )
  }

  return (
    <Link href={`/tournament/${id}`}>
      <Card className="overflow-hidden transition-shadow hover:shadow-md cursor-pointer">
        <div className="relative aspect-video w-full bg-muted overflow-hidden">
          <Image src={banner_image || DEFAULT_BANNER} alt={title} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover" />
        </div>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base leading-snug">{title}</CardTitle>
            <Badge variant={status as any} className="shrink-0">{statusLabel}</Badge>
          </div>
          <CardDescription>{organiser_name ?? t.browse.organiserTBD}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p>📅 {dateRange}</p>
          <div className="flex items-center justify-between">
            <p>📍 {location}</p>
            <FormatBadge format={format} />
          </div>
          <p>🏆 {prizeLabel} {t.browse.prizePoolSuffix}</p>
        </CardContent>
      </Card>
    </Link>
  )
}

function FormatBadge({ format }: { format: Tournament['format'] }) {
  const { t } = useLang()
  if (!format) return null
  const styles: Record<string, string> = {
    online: 'bg-blue-50 text-blue-700',
    offline: 'bg-orange-50 text-orange-700',
    hybrid: 'bg-purple-50 text-purple-700',
  }
  const labels: Record<string, React.ReactNode> = {
    online: <><Wifi className="h-3 w-3" /> {t.format.online}</>,
    offline: <><MapPin className="h-3 w-3" /> {t.format.offline}</>,
    hybrid: <><Wifi className="h-3 w-3" /> + <MapPin className="h-3 w-3" /> {t.format.hybrid}</>,
  }
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', styles[format])}>
      {labels[format]}
    </span>
  )
}
