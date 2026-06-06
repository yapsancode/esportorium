import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import Navbar from '@/components/Navbar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Check, X } from 'lucide-react'
import { adminFetch } from '@/lib/api'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadSubmissions() {
    setLoading(true)
    setError('')
    try {
      const data = await adminFetch('/api/admin/submissions')
      setSubmissions(data)
    } catch (err) {
      if (err.message.includes('401')) {
        localStorage.removeItem('admin_token')
        navigate('/admin/login')
      } else {
        setError('Failed to load submissions.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadSubmissions() }, [])

  async function handleApprove(id) {
    try {
      await adminFetch(`/api/admin/tournaments/${id}/approve`, { method: 'PATCH' })
      setSubmissions(prev => prev.filter(s => s.id !== id))
    } catch {
      alert('Failed to approve. Please try again.')
    }
  }

  async function handleReject(id) {
    if (!confirm('Reject and delete this submission?')) return
    try {
      await adminFetch(`/api/admin/tournaments/${id}/reject`, { method: 'PATCH' })
      setSubmissions(prev => prev.filter(s => s.id !== id))
    } catch {
      alert('Failed to reject. Please try again.')
    }
  }

  function formatLabel(t) {
    if (t.format === 'offline' && t.state) return `Offline · ${t.state}`
    return t.format.charAt(0).toUpperCase() + t.format.slice(1)
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Pending Submissions — Esportorium Admin</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-foreground">Pending Submissions</h1>
            <p className="mt-1 text-muted-foreground">Review and approve or reject tournament submissions.</p>
          </div>
          <Badge className="text-sm px-3 py-1">
            {submissions.length} pending
          </Badge>
        </div>

        {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Awaiting Review</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <p className="px-6 py-8 text-center text-muted-foreground">Loading…</p>
            ) : submissions.length === 0 ? (
              <p className="px-6 py-8 text-center text-muted-foreground">No pending submissions.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tournament</TableHead>
                    <TableHead>Organiser</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium">{sub.title}</TableCell>
                      <TableCell className="text-muted-foreground">{sub.organiser_name}</TableCell>
                      <TableCell>{formatLabel(sub)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(sub.created_at).toLocaleDateString('en-MY')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" className="h-8 gap-1.5" onClick={() => handleApprove(sub.id)}>
                            <Check className="h-3.5 w-3.5" /> Approve
                          </Button>
                          <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => handleReject(sub.id)}>
                            <X className="h-3.5 w-3.5" /> Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
