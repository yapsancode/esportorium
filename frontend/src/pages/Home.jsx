import Navbar from '@/components/Navbar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { LayoutGrid, List } from 'lucide-react'

const STATES = [
  'All States', 'Kuala Lumpur', 'Selangor', 'Johor', 'Penang', 'Sabah', 'Sarawak',
  'Perak', 'Kedah', 'Kelantan', 'Terengganu', 'Pahang', 'Negeri Sembilan', 'Melaka',
  'Perlis', 'Putrajaya', 'Labuan',
]

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
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

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Tabs defaultValue="upcoming">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="current">Current</TabsTrigger>
              <TabsTrigger value="past">Past</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-3">
            <Select defaultValue="all">
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Filter by state" />
              </SelectTrigger>
              <SelectContent>
                {STATES.map((s) => (
                  <SelectItem key={s} value={s.toLowerCase().replace(' ', '-')}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex rounded-lg border border-border">
              <Button variant="ghost" size="icon" className="rounded-r-none border-r border-border">
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-l-none">
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <TournamentCard key={i} index={i} />
          ))}
        </div>
      </main>
    </div>
  )
}

function TournamentCard({ index }) {
  const statuses = ['upcoming', 'current', 'past']
  const status = statuses[index % 3]

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md cursor-pointer">
      <div className="aspect-video w-full bg-muted" />
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">Tournament {index} — Placeholder</CardTitle>
          <Badge variant={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>
        </div>
        <CardDescription>Organised by Placeholder Org</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground space-y-1">
        <p>📅 1 Jan – 15 Jan 2025</p>
        <p>📍 Online</p>
        <p>🏆 RM 500 prize pool</p>
      </CardContent>
    </Card>
  )
}
