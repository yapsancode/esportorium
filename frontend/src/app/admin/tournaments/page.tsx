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
import { Textarea } from '@/components/ui/textarea'
import PrizeBreakdownEditor from '@/components/PrizeBreakdownEditor'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { adminFetch, uploadBanner, ApiError } from '@/lib/api'
import type { PrizeBreakdownItem } from '@/lib/types'

const STATES = [
  'Kuala Lumpur', 'Selangor', 'Johor', 'Penang', 'Sabah', 'Sarawak',
  'Perak', 'Kedah', 'Kelantan', 'Terengganu', 'Pahang', 'Negeri Sembilan',
  'Melaka', 'Perlis', 'Putrajaya', 'Labuan',
]

interface Tournament {
  id: string
  title: string
  status: string
  format: string | null
  state: string | null
  prize_pool_rm: number | null
  is_approved: boolean
}

interface FormState {
  title: string; format: string; state: string; venue: string; stage_notes: string; description: string
  start_date: string; end_date: string; registration_deadline: string
  prize_pool_rm: string; max_teams: string; additional_prizes: string
  organiser_name: string; organiser_contact: string; organiser_email: string
  registration_link: string; banner_image: string
}

const EMPTY_FORM: FormState = {
  title: '', format: '', state: '', venue: '', stage_notes: '', description: '',
  start_date: '', end_date: '', registration_deadline: '',
  prize_pool_rm: '', max_teams: '', additional_prizes: '',
  organiser_name: '', organiser_contact: '', organiser_email: '',
  registration_link: '', banner_image: '',
}

function toFormValues(t: any): FormState {
  return {
    title: t.title ?? '', format: t.format ?? '', state: t.state ?? '', venue: t.venue ?? '',
    stage_notes: t.stage_notes ?? '', description: t.description ?? '',
    start_date: t.start_date ?? '', end_date: t.end_date ?? '', registration_deadline: t.registration_deadline ?? '',
    prize_pool_rm: t.prize_pool_rm != null ? String(t.prize_pool_rm) : '', max_teams: t.max_teams != null ? String(t.max_teams) : '',
    additional_prizes: (t.additional_prizes ?? []).join(', '),
    organiser_name: t.organiser_name ?? '', organiser_contact: t.organiser_contact ?? '',
    organiser_email: t.organiser_email ?? '', registration_link: t.registration_link ?? '',
    banner_image: t.banner_image ?? '',
  }
}

// Only `title` is required — this form doubles as the manual-seeding tool for
// tournaments scraped from other sources, where most details aren't known yet.
function toPayload(form: FormState, prizeBreakdown: PrizeBreakdownItem[]) {
  return {
    title: form.title, format: form.format || null, state: form.state || null, venue: form.venue || null,
    stage_notes: form.stage_notes || null, description: form.description || null,
    start_date: form.start_date || null, end_date: form.end_date || null, registration_deadline: form.registration_deadline || null,
    prize_pool_rm: form.prize_pool_rm ? parseInt(form.prize_pool_rm, 10) : null,
    max_teams: form.max_teams ? parseInt(form.max_teams, 10) : null,
    additional_prizes: form.additional_prizes ? form.additional_prizes.split(',').map(s => s.trim()).filter(Boolean) : [],
    prize_breakdown: prizeBreakdown.filter(item => item.placement.trim() && item.reward.trim()),
    organiser_name: form.organiser_name || null, organiser_contact: form.organiser_contact || null,
    organiser_email: form.organiser_email || null, registration_link: form.registration_link || null,
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
  const [prizeBreakdown, setPrizeBreakdown] = useState<PrizeBreakdownItem[]>([])
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [bannerUploading, setBannerUploading] = useState(false)
  const [bannerError, setBannerError] = useState('')

  async function loadTournaments() {
    setLoading(true)
    setError('')
    try {
      const data = await adminFetch('/api/admin/tournaments')
      setTournaments(data)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
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

  function openAdd() { setEditing(null); setForm(EMPTY_FORM); setPrizeBreakdown([]); setFormError(''); setDialogOpen(true) }
  function openEdit(t: Tournament) {
    setEditing(t)
    setForm(toFormValues(t))
    setPrizeBreakdown((t as any).prize_breakdown ?? [])
    setFormError('')
    setDialogOpen(true)
  }

  function set(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }))
  }
  function setSelect(field: keyof FormState) {
    return (value: string) => setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleBannerUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBannerError('')
    if (!file.type.startsWith('image/')) {
      setBannerError('Please choose an image file.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setBannerError('Image must be 2 MB or smaller.')
      return
    }
    setBannerUploading(true)
    try {
      const url = await uploadBanner(file)
      setForm(prev => ({ ...prev, banner_image: url }))
    } catch {
      setBannerError('Upload failed. Please try again.')
    } finally {
      setBannerUploading(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      const payload = toPayload(form, prizeBreakdown)
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
                        <TableCell>{formatCell(t)}</TableCell>
                        <TableCell>{t.prize_pool_rm != null ? `RM ${t.prize_pool_rm.toLocaleString()}` : 'TBD'}</TableCell>
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
            <Field label="Description / Rules (optional)" id="d-description">
              <Textarea id="d-description" maxLength={2000} rows={4} value={form.description} onChange={set('description')} />
            </Field>
            <Field label="Format (optional)" id="d-format">
              <Select value={form.format} onValueChange={setSelect('format')}>
                <SelectTrigger id="d-format"><SelectValue placeholder="Select format" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                  <SelectItem value="hybrid">Hybrid (online + offline)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {(form.format === 'offline' || form.format === 'hybrid') && (
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
            {form.format === 'hybrid' && (
              <Field label="Stage Breakdown (optional)" id="d-stage-notes">
                <Input id="d-stage-notes" placeholder="e.g. Group stage online, playoffs offline in KL" maxLength={300} value={form.stage_notes} onChange={set('stage_notes')} />
              </Field>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Start Date (optional)" id="d-start"><Input id="d-start" type="date" value={form.start_date} onChange={set('start_date')} /></Field>
              <Field label="End Date (optional)" id="d-end"><Input id="d-end" type="date" value={form.end_date} onChange={set('end_date')} /></Field>
            </div>
            <Field label="Registration Deadline (optional)" id="d-deadline"><Input id="d-deadline" type="date" value={form.registration_deadline} onChange={set('registration_deadline')} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Prize Pool (RM, optional)" id="d-prize"><Input id="d-prize" type="number" min={0} value={form.prize_pool_rm} onChange={set('prize_pool_rm')} /></Field>
              <Field label="Max Teams (optional)" id="d-teams"><Input id="d-teams" type="number" min={2} value={form.max_teams} onChange={set('max_teams')} /></Field>
            </div>
            <Field label="Additional Prizes (optional, comma separated)" id="d-extras"><Input id="d-extras" placeholder="e.g. Trophy, Jersey" value={form.additional_prizes} onChange={set('additional_prizes')} /></Field>
            <Field label="Prize Breakdown (optional)" id="d-prize-breakdown">
              <PrizeBreakdownEditor items={prizeBreakdown} onChange={setPrizeBreakdown} />
            </Field>
            <Field label="Registration Link (optional)" id="d-reglink"><Input id="d-reglink" type="url" value={form.registration_link} onChange={set('registration_link')} /></Field>
            <Field label="Banner Image (optional)" id="d-banner-file">
              {form.banner_image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.banner_image} alt="Banner preview" className="mb-2 h-32 w-full rounded-md border border-border object-cover" />
              )}
              <Input id="d-banner-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={bannerUploading} onChange={handleBannerUpload} />
              {bannerUploading && <p className="mt-1 text-xs text-muted-foreground">Uploading…</p>}
              {bannerError && <p className="mt-1 text-xs text-red-500">{bannerError}</p>}
              <Input id="d-banner" type="url" placeholder="…or paste an image URL" className="mt-2" value={form.banner_image} onChange={set('banner_image')} />
            </Field>
            <div className="border-t pt-4">
              <p className="mb-3 font-semibold text-sm">Organiser Info (optional)</p>
              <div className="space-y-4">
                <Field label="Organiser Name" id="d-orgname"><Input id="d-orgname" maxLength={100} value={form.organiser_name} onChange={set('organiser_name')} /></Field>
                <Field label="Contact (WhatsApp / email)" id="d-orgcontact"><Input id="d-orgcontact" maxLength={100} value={form.organiser_contact} onChange={set('organiser_contact')} /></Field>
                <Field label="Organiser Email" id="d-orgemail"><Input id="d-orgemail" type="email" value={form.organiser_email} onChange={set('organiser_email')} /></Field>
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

function formatCell(t: Tournament) {
  if (!t.format) return 'TBD'
  if ((t.format === 'offline' || t.format === 'hybrid') && t.state) {
    return `${t.format.charAt(0).toUpperCase() + t.format.slice(1)} · ${t.state}`
  }
  return t.format.charAt(0).toUpperCase() + t.format.slice(1)
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  )
}
