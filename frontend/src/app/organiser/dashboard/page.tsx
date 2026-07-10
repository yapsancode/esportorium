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
import type { Tournament } from '@/lib/types'

function DashboardContent() {
  const router = useRouter()
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
        setError('Failed to load your tournaments.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
    try {
      await organiserFetch(`/api/organiser/tournaments/${id}`, { method: 'DELETE' })
      setTournaments(prev => prev.filter(t => t.id !== id))
    } catch {
      alert('Failed to delete. Please try again.')
    }
  }

  function statusBadge(t: Tournament) {
    if (!t.is_approved) return <Badge variant="secondary">Pending review</Badge>
    const label = t.status.charAt(0).toUpperCase() + t.status.slice(1)
    return <Badge>{label}</Badge>
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-foreground">My Tournaments</h1>
            <p className="mt-1 text-muted-foreground">Create, edit, and track your tournament listings.</p>
          </div>
          <Link href="/organiser/tournaments/new">
            <Button className="gap-1.5"><Plus className="h-4 w-4" /> New Tournament</Button>
          </Link>
        </div>

        {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Your Listings</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <p className="px-6 py-8 text-center text-muted-foreground">Loading…</p>
            ) : tournaments.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <Sparkles className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                <p className="text-muted-foreground">You haven&apos;t listed any tournaments yet.</p>
                <Link href="/organiser/tournaments/new">
                  <Button className="mt-4 gap-1.5"><Plus className="h-4 w-4" /> Create your first</Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tournament</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tournaments.map(t => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.title}</TableCell>
                        <TableCell>{statusBadge(t)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {t.start_date ? new Date(t.start_date).toLocaleDateString('en-MY') : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Link href={`/organiser/tournaments/${t.id}/edit`}>
                              <Button size="sm" variant="outline" className="h-8 gap-1.5">
                                <Pencil className="h-3.5 w-3.5" /> Edit
                              </Button>
                            </Link>
                            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-red-600 hover:text-red-700"
                              onClick={() => handleDelete(t.id, t.title)}>
                              <Trash2 className="h-3.5 w-3.5" /> Delete
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
