'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'
import Navbar from '@/components/Navbar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pencil, Trash2, Plus, Sparkles } from 'lucide-react'
import { organiserFetch, ApiError } from '@/lib/api'
import { useLang } from '@/lib/i18n'
import type { Tournament } from '@/lib/types'

function DashboardContent() {
  const router = useRouter()
  const { t, lang } = useLang()
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const data = await organiserFetch('/api/organiser/tournaments')
      setTournaments(data)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        localStorage.removeItem('organiser_token')
        router.push('/organiser/login')
      } else {
        setError(t.organiser.failedToLoad)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleDelete(id: string, title: string) {
    if (!confirm(t.organiser.deleteConfirm(title))) return
    try {
      await organiserFetch(`/api/organiser/tournaments/${id}`, { method: 'DELETE' })
      setTournaments(prev => prev.filter(item => item.id !== id))
    } catch {
      alert(t.organiser.deleteFailed)
    }
  }

  function statusBadge(tour: Tournament) {
    if (!tour.is_approved) return <Badge variant="secondary">{t.status.pendingReview}</Badge>
    const label = (t.status as Record<string, string>)[tour.status] ?? tour.status
    return <Badge>{label}</Badge>
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-foreground">{t.organiser.dashboardTitle}</h1>
            <p className="mt-1 text-muted-foreground">{t.organiser.dashboardSubtitle}</p>
          </div>
          <Link href="/organiser/tournaments/new">
            <Button className="gap-1.5"><Plus className="h-4 w-4" /> {t.nav.newTournament}</Button>
          </Link>
        </div>

        {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">{t.organiser.yourListings}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <p className="px-6 py-8 text-center text-muted-foreground">{t.common.loading}</p>
            ) : tournaments.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <Sparkles className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                <p className="text-muted-foreground">{t.organiser.noneYet}</p>
                <Link href="/organiser/tournaments/new">
                  <Button className="mt-4 gap-1.5"><Plus className="h-4 w-4" /> {t.organiser.createFirst}</Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.organiser.colTournament}</TableHead>
                      <TableHead>{t.organiser.colStatus}</TableHead>
                      <TableHead>{t.organiser.colStartDate}</TableHead>
                      <TableHead className="text-right">{t.organiser.colActions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tournaments.map(tour => (
                      <TableRow key={tour.id}>
                        <TableCell className="font-medium">{tour.title}</TableCell>
                        <TableCell>{statusBadge(tour)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {tour.start_date ? new Date(tour.start_date).toLocaleDateString(lang === 'ms' ? 'ms-MY' : 'en-MY') : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Link href={`/organiser/tournaments/${tour.id}/edit`}>
                              <Button size="sm" variant="outline" className="h-8 gap-1.5">
                                <Pencil className="h-3.5 w-3.5" /> {t.organiser.edit}
                              </Button>
                            </Link>
                            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-red-600 hover:text-red-700"
                              onClick={() => handleDelete(tour.id, tour.title)}>
                              <Trash2 className="h-3.5 w-3.5" /> {t.organiser.delete}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export default function OrganiserDashboardPage() {
  return (
    <ProtectedRoute role="organiser">
      <DashboardContent />
    </ProtectedRoute>
  )
}
