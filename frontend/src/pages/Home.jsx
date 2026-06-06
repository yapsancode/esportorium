import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import JsonLd from '@/components/JsonLd'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Preloader from '@/components/ui/preloader'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { LayoutGrid, List, Wifi, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiFetch } from '@/lib/api'

const STATES = [
  'Kuala Lumpur', 'Selangor', 'Johor', 'Penang', 'Sabah', 'Sarawak',
  'Perak', 'Kedah', 'Kelantan', 'Terengganu', 'Pahang', 'Negeri Sembilan',
  'Melaka', 'Perlis', 'Putrajaya', 'Labuan',
]

const FORMAT_OPTIONS = [
  { value: 'all',     label: 'All' },
  { value: 'online',  label: 'Online',  icon: <Wifi className="h-3.5 w-3.5" /> },
  { value: 'offline', label: 'Offline', icon: <MapPin className="h-3.5 w-3.5" /> },
]

const PRELOADER_KEY = 'esportorium_preloader_shown'

function formatDateRange(start, end) {
  const fmt = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
  if (start === end) return fmt(start)
  return `${fmt(start)} – ${fmt(end)}`
}

export default function Home() {
  const [showPreloader] = useState(() => {
    const alreadyShown = sessionStorage.getItem(PRELOADER_KEY)
    if (!alreadyShown) {
      sessionStorage.setItem(PRELOADER_KEY, 'true')
      return true
    }
    return false
  })

  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')

  const [statusFilter, setStatusFilter] = useState('upcoming')
  const [formatFilter, setFormatFilter] = useState('all')
  const [stateFilter,  setStateFilter]  = useState('')
  const [viewMode,     setViewMode]     = useState('grid')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      try {
        const data = await apiFetch('/api/tournaments')
        setTournaments(data)
      } catch {
        setError('Failed to load tournaments. Please try again later.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function handleFormatChange(val) {
    setFormatFilter(val)
    if (val === 'online') setStateFilter('')
  }

  const filtered = tournaments.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false
    if (formatFilter !== 'all' && t.format !== formatFilter) return false
    if (stateFilter && formatFilter !== 'online') {
      if (t.format === 'offline' && t.state !== stateFilter) return false
    }
    return true
  })

  const stateDisabled = formatFilter === 'online'

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Esportorium",
    "url": "https://esportorium.com",
    "description": "Malaysia's curated esports tournament discovery platform for Mobile Legends.",
    "inLanguage": ["en-MY", "ms-MY"],
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://esportorium.com/?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Esportorium — Malaysia Esports Tournaments</title>
        <meta name="description" content="Discover upcoming, live, and past Mobile Legends tournaments across Malaysia. Browse by state, format, and status. Free to enter. Free to list." />
        <meta name="keywords" content="malaysia mobile legends tournament, esports tournament malaysia, turnamen ml malaysia, pertandingan esport malaysia, ml tournament 2026" />
        <link rel="canonical" href="https://esportorium.com/" />
        <meta property="og:url" content="https://esportorium.com/" />
        <meta property="og:title" content="Esportorium — Malaysia Esports Tournaments" />
        <meta property="og:description" content="Discover upcoming, live, and past Mobile Legends tournaments across Malaysia." />
        <meta property="og:type" content="website" />
        <meta name="twitter:title" content="Esportorium — Malaysia Esports Tournaments" />
        <meta name="twitter:description" content="Discover upcoming, live, and past Mobile Legends tournaments across Malaysia." />
      </Helmet>
      <JsonLd schema={websiteSchema} />

      <Preloader show={showPreloader} />
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-foreground sm:text-4xl">
            Malaysia Esports Tournaments
          </h1>
          <p className="mt-2 text-muted-foreground">
            Discover upcoming Mobile Legends tournaments across Malaysia.
          </p>
        </div>

        {/* Filter bar */}
        <div className="mb-6 flex flex-col gap-3">

          {/* Row 1: Status tabs */}
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="current">Current</TabsTrigger>
              <TabsTrigger value="past">Past</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Row 2: Format toggle + State select + View toggle */}
          <div className="flex flex-wrap items-center gap-3">

            {/* Format button group */}
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

            {/* State select */}
            <div className="relative">
              <Select
                value={stateFilter || 'all-states'}
                onValueChange={(v) => setStateFilter(v === 'all-states' ? '' : v)}
                disabled={stateDisabled}
              >
                <SelectTrigger className={cn('w-44', stateDisabled && 'opacity-40 cursor-not-allowed')}>
                  <SelectValue placeholder="Filter by state" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-states">All States</SelectItem>
                  {STATES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {stateDisabled && (
                <p className="absolute -bottom-5 left-0 text-xs text-muted-foreground whitespace-nowrap">
                  Online tournaments are nationwide
                </p>
              )}
            </div>

            <div className="flex-1" />

            {/* Grid / List toggle */}
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

        {/* Results */}
        {loading ? (
          <div className="flex justify-center py-20">
            <p className="text-muted-foreground">Loading tournaments…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center py-20 text-center">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-lg font-semibold text-foreground">No tournaments found</p>
            <p className="mt-1 text-sm text-muted-foreground">Try adjusting your filters.</p>
          </div>
        ) : (
          <div className={cn(
            'gap-4',
            viewMode === 'grid' ? 'grid sm:grid-cols-2 lg:grid-cols-3' : 'flex flex-col'
          )}>
            {filtered.map((t) => (
              <TournamentCard key={t.id} tournament={t} viewMode={viewMode} />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}

function TournamentCard({ tournament, viewMode }) {
  const { id, title, status, format, state, organiser_name, prize_pool_rm, start_date, end_date, banner_image } = tournament
  const location = format === 'online' ? 'Online' : (state || 'Malaysia')
  const dateRange = formatDateRange(start_date, end_date)

  if (viewMode === 'list') {
    return (
      <Link to={`/tournament/${id}`}>
        <Card className="overflow-hidden transition-shadow hover:shadow-md cursor-pointer">
          <div className="flex items-center gap-4 p-4">
            <div className="h-16 w-24 shrink-0 rounded-md bg-muted overflow-hidden">
              {banner_image && <img src={banner_image} alt={title} className="h-full w-full object-cover" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-foreground truncate">{title}</p>
                <div className="flex items-center gap-2 shrink-0">
                  <FormatBadge format={format} />
                  <Badge variant={status}>{capitalise(status)}</Badge>
                </div>
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">{organiser_name}</p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>📅 {dateRange}</span>
                <span>📍 {location}</span>
                <span>🏆 RM {prize_pool_rm.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </Card>
      </Link>
    )
  }

  return (
    <Link to={`/tournament/${id}`}>
      <Card className="overflow-hidden transition-shadow hover:shadow-md cursor-pointer">
        <div className="aspect-video w-full bg-muted overflow-hidden">
          {banner_image && <img src={banner_image} alt={title} className="h-full w-full object-cover" />}
        </div>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base leading-snug">{title}</CardTitle>
            <Badge variant={status} className="shrink-0">{capitalise(status)}</Badge>
          </div>
          <CardDescription>{organiser_name}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p>📅 {dateRange}</p>
          <div className="flex items-center justify-between">
            <p>📍 {location}</p>
            <FormatBadge format={format} />
          </div>
          <p>🏆 RM {prize_pool_rm.toLocaleString()} prize pool</p>
        </CardContent>
      </Card>
    </Link>
  )
}

function FormatBadge({ format }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
      format === 'online' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'
    )}>
      {format === 'online'
        ? <><Wifi className="h-3 w-3" /> Online</>
        : <><MapPin className="h-3 w-3" /> Offline</>
      }
    </span>
  )
}

function capitalise(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
