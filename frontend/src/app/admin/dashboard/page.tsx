'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import Navbar from '@/components/Navbar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Check, X } from 'lucide-react'
import { adminFetch, ApiError } from '@/lib/api'
import { useLang } from '@/lib/i18n'

interface Submission {
  id: string
  title: string
  organiser_name: string
  format: string
  state: string | null
  created_at: string
}

function AdminDashboardContent() {
  const router = useRouter()
  const { t, lang } = useLang()
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadSubmissions() {
    setLoading(true)
    setError('')
    try {
      const data = await adminFetch('/api/admin/submissions')
      setSubmissions(data)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        localStorage.removeItem('admin_token')
        router.push('/admin/login')
      } else {
        setError(t.admin.failedLoadSubmissions)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadSubmissions() }, [])

  async function handleApprove(id: string) {
    try {
      await adminFetch(`/api/admin/tournaments/${id}/approve`, { method: 'PATCH' })
      setSubmissions(prev => prev.filter(s => s.id !== id))
    } catch {
      alert(t.admin.approveFailed)
    }
  }

  async function handleReject(id: string) {
    if (!confirm(t.admin.rejectConfirm)) return
    try {
      await adminFetch(`/api/admin/tournaments/${id}/reject`, { method: 'PATCH' })
      setSubmissions(prev => prev.filter(s => s.id !== id))
    } catch {
      alert(t.admin.rejectFailed)
    }
  }

  function formatLabel(sub: Submission) {
    const fmtMap: Record<string, string> = { online: t.format.online, offline: t.format.offline, hybrid: t.format.hybrid }
    const fmt = fmtMap[sub.format] ?? sub.format
    if ((sub.format === 'offline' || sub.format === 'hybrid') && sub.state) {
      return `${fmt} · ${sub.state}`
    }
    return fmt
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-foreground">{t.admin.pendingTitle}</h1>
            <p className="mt-1 text-muted-foreground">{t.admin.pendingSubtitle}</p>
          </div>
          <Badge className="text-sm px-3 py-1">{t.admin.pendingCount(submissions.length)}</Badge>
        </div>

        {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">{t.admin.awaitingReview}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <p className="px-6 py-8 text-center text-muted-foreground">{t.common.loading}</p>
            ) : submissions.length === 0 ? (
              <p className="px-6 py-8 text-center text-muted-foreground">{t.admin.noPending}</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.admin.colTournament}</TableHead>
                      <TableHead>{t.admin.colOrganiser}</TableHead>
                      <TableHead>{t.admin.colFormat}</TableHead>
                      <TableHead>{t.admin.colSubmitted}</TableHead>
                      <TableHead className="text-right">{t.admin.colActions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.map((sub) => (
                      <TableRow key={sub.id}>
                        <TableCell className="font-medium">{sub.title}</TableCell>
                        <TableCell className="text-muted-foreground">{sub.organiser_name}</TableCell>
                        <TableCell>{formatLabel(sub)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(sub.created_at).toLocaleDateString(lang === 'ms' ? 'ms-MY' : 'en-MY')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" className="h-8 gap-1.5" onClick={() => handleApprove(sub.id)}>
                              <Check className="h-3.5 w-3.5" /> {t.admin.approve}
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => handleReject(sub.id)}>
                              <X className="h-3.5 w-3.5" /> {t.admin.reject}
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

export default function AdminDashboardPage() {
  return (
    <ProtectedRoute>
      <AdminDashboardContent />
    </ProtectedRoute>
  )
}
