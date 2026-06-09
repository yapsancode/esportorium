'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import Navbar from '@/components/Navbar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { adminFetch } from '@/lib/api'

const STATES = [
  'Kuala Lumpur', 'Selangor', 'Johor', 'Penang', 'Sabah', 'Sarawak',
  'Perak', 'Kedah', 'Kelantan', 'Terengganu', 'Pahang', 'Negeri Sembilan',
  'Melaka', 'Perlis', 'Putrajaya', 'Labuan',
]

interface Tournament {
  id: string
  title: string
  status: string
  format: string
  state: string | null
  prize_pool_rm: number
  is_approved: boolean
}

interface FormState {
  title: string; format: string; state: string; venue: string
  start_date: string; end_date: string; registration_deadline: string
  prize_pool_rm: string; max_teams: string; additional_prizes: string
  organiser_name: string; organiser_contact: string; organiser_email: string
  registration_link: string; banner_image: string
}

const EMPTY_FORM: FormState = {
  title: '', format: '', state: '', venue: '',
  start_date: '', end_date: '', registration_deadline: '',
  prize_pool_rm: '', max_teams: '', additional_prizes: '',
  organiser_name: '', organiser_contact: '', organiser_email: '',
  registration_link: '', banner_image: '',
}

function toFormValues(t: any): FormState {
  return {
    title: t.title ?? '', format: t.format ?? '', state: t.state ?? '', venue: t.venue ?? '',
    start_date: t.start_date ?? '', end_date: t.end_date ?? '', registration_deadline: t.registration_deadline ?? '',
    prize_pool_rm: String(t.prize_pool_rm ?? ''), max_teams: String(t.max_teams ?? ''),
    additional_prizes: (t.additional_prizes ?? []).join(', '),
    organiser_name: t.organiser_name ?? '', organiser_contact: t.organiser_contact ?? '',
    organiser_email: t.organiser_email ?? '', registration_link: t.registration_link ?? '',
    banner_image: t.banner_image ?? '',
  }
}

function toPayload(form: FormState) {
  return {
    title: form.title, format: form.format, state: form.state || null, venue: form.venue || null,
    start_date: form.start_date, end_date: form.end_date, registration_deadline: form.registration_deadline,
    prize_pool_rm: parseInt(form.prize_pool_rm, 10), max_teams: parseInt(form.max_teams, 10),
    additional_prizes: form.additional_prizes ? form.additional_prizes.split(',').map(s => s.trim()).filter(Boolean) : [],
    organiser_name: form.organiser_name, organiser_contact: form.organiser_contact,
    organiser_email: form.organiser_email, registration_link: form.registration_link,
    banner_image: form.banner_image || null,
  }
}

function AdminTournamentsContent() {
  const router = useRouter()
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Tournament | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  async function loadTournaments() {
    setLoading(true)
    setError('')
    try {
      const data = await adminFetch('/api/admin/tournaments')
      setTournaments(data)
    } catch (err: any) {
      if (err.message.includes('401')) {
        localStorage.removeItem('admin_token')
        router.push('/admin/login')
      } else {
        setError('Failed to load tournaments.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadTournaments() }, [])

  function openAdd() { setEditing(null); setForm(EMPTY_FORM); setFormError(''); setDialogOpen(true) }
  function openEdit(t: Tournament) { setEditing(t); setForm(toFormValues(t)); setFormError(''); setDialogOpen(true) }

  function set(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }))
  }
  function setSelect(field: keyof FormState) {
    return (value: string) => setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      const payload = toPayload(form)
      if (editing) {
        const updated = await adminFetch(`/api/admin/tournaments/${editing.id}`, { method: 'PUT', body: JSON.stringify(payload) })
        setTournaments(prev => prev.map(t => t.id === editing.id ? updated : t))
      } else {
        const created = await adminFetch('/api/admin/tournaments', { method: 'POST', body: JSON.stringify({ ...payload, is_approved: true }) })
        setTournaments(prev => [created, ...prev])
      }
      setDialogOpen(false)
    } catch {
      setFormError('Failed to save. Check all fields and try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this tournament? This cannot be undone.')) return
    try {
      await adminFetch(`/api/admin/tournaments/${id}`, { method: 'DELETE' })
      setTournaments(prev => prev.filter(t => t.id !== id))
    } catch {
      alert('Failed to delete. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-foreground">Manage Tournaments</h1>
            <p className="mt-1 text-muted-foreground">Add, edit, or remove tournaments from the platform.</p>
          </div>
          <Button className="gap-2" onClick={openAdd}><Plus className="h-4 w-4" /> Add Tournament</Button>
        </div>

        {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

        <Card>
          <CardHeader><CardTitle className="text-base font-semibold">All Tournaments</CardTitle></CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <p className="px-6 py-8 text-center text-muted-foreground">Loading…</p>
            ) : tournaments.length === 0 ? (
              <p className="px-6 py-8 text-center text-muted-foreground">No tournaments yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tournament</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Approved</TableHead>
                      <TableHead>Format</TableHead>
                      <TableHead>Prize (RM)</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tournaments.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.title}</TableCell>
                        <TableCell><Badge variant={t.status as any}>{t.status.charAt(0).toUpperCase() + t.status.slice(1)}</Badge></TableCell>
                        <TableCell>{t.is_approved ? <span className="text-green-600 font-medium">Yes</span> : <span className="text-muted-foreground">Pending</span>}</TableCell>
                        <TableCell>{t.format === 'offline' && t.state ? `Offline · ${t.state}` : t.format.charAt(0).toUpperCase() + t.format.slice(1)}</TableCell>
                        <TableCell>RM {t.prize_pool_rm.toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? 'Edit Tournament' : 'Add Tournament'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 py-2">
            <Field label="Tournament Name" id="d-title"><Input id="d-title" required maxLength={200} value={form.title} onChange={set('title')} /></Field>
            <Field label="Format" id="d-format">
              <Select required value={form.format} onValueChange={setSelect('format')}>
                <SelectTrigger id="d-format"><SelectValue placeholder="Select format" /></SelectTrigger>
                <SelectContent><SelectItem value="online">Online</SelectItem><SelectItem value="offline">Offline</SelectItem></SelectContent>
              </Select>
            </Field>
            {form.format === 'offline' && (
              <>
                <Field label="State" id="d-state">
                  <Select required value={form.state} onValueChange={setSelect('state')}>
                    <SelectTrigger id="d-state"><SelectValue placeholder="Select state" /></SelectTrigger>
                    <SelectContent>{STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Venue (optional)" id="d-venue"><Input id="d-venue" maxLength={300} value={form.venue} onChange={set('venue')} /></Field>
              </>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Start Date" id="d-start"><Input id="d-start" type="date" required value={form.start_date} onChange={set('start_date')} /></Field>
              <Field label="End Date" id="d-end"><Input id="d-end" type="date" required value={form.end_date} onChange={set('end_date')} /></Field>
            </div>
            <Field label="Registration Deadline" id="d-deadline"><Input id="d-deadline" type="date" required value={form.registration_deadline} onChange={set('registration_deadline')} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Prize Pool (RM)" id="d-prize"><Input id="d-prize" type="number" min={0} required value={form.prize_pool_rm} onChange={set('prize_pool_rm')} /></Field>
              <Field label="Max Teams" id="d-teams"><Input id="d-teams" type="number" min={2} required value={form.max_teams} onChange={set('max_teams')} /></Field>
            </div>
            <Field label="Additional Prizes (optional, comma separated)" id="d-extras"><Input id="d-extras" placeholder="e.g. Trophy, Jersey" value={form.additional_prizes} onChange={set('additional_prizes')} /></Field>
            <Field label="Registration Link" id="d-reglink"><Input id="d-reglink" type="url" required value={form.registration_link} onChange={set('registration_link')} /></Field>
            <Field label="Banner Image URL (optional)" id="d-banner"><Input id="d-banner" type="url" placeholder="https://..." value={form.banner_image} onChange={set('banner_image')} /></Field>
            <div className="border-t pt-4">
              <p className="mb-3 font-semibold text-sm">Organiser Info</p>
              <div className="space-y-4">
                <Field label="Organiser Name" id="d-orgname"><Input id="d-orgname" required maxLength={100} value={form.organiser_name} onChange={set('organiser_name')} /></Field>
                <Field label="Contact (WhatsApp / email)" id="d-orgcontact"><Input id="d-orgcontact" required maxLength={100} value={form.organiser_contact} onChange={set('organiser_contact')} /></Field>
                <Field label="Organiser Email" id="d-orgemail"><Input id="d-orgemail" type="email" required value={form.organiser_email} onChange={set('organiser_email')} /></Field>
              </div>
            </div>
            {formError && <p className="text-sm text-red-500">{formError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function AdminTournamentsPage() {
  return (
    <ProtectedRoute>
      <AdminTournamentsContent />
    </ProtectedRoute>
  )
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  )
}
