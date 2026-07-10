'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Turnstile } from '@marsidev/react-turnstile'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import PrizeBreakdownEditor from '@/components/PrizeBreakdownEditor'
import { AlertCircle, ShieldCheck } from 'lucide-react'
import { apiFetch, uploadBanner } from '@/lib/api'
import type { PrizeBreakdownItem } from '@/lib/types'

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'

const STATES = [
  'Kuala Lumpur', 'Selangor', 'Johor', 'Penang', 'Sabah', 'Sarawak',
  'Perak', 'Kedah', 'Kelantan', 'Terengganu', 'Pahang', 'Negeri Sembilan',
  'Melaka', 'Perlis', 'Putrajaya', 'Labuan',
]

const INITIAL = {
  title: '',
  format: '',
  state: '',
  venue: '',
  stage_notes: '',
  description: '',
  start_date: '',
  end_date: '',
  registration_deadline: '',
  prize_pool_rm: '',
  max_teams: '',
  additional_prizes: '',
  registration_link: '',
  organiser_name: '',
  organiser_contact: '',
  organiser_email: '',
  banner_image: '',
}

export default function Submit() {
  const [form, setForm] = useState(INITIAL)
  const [prizeBreakdown, setPrizeBreakdown] = useState<PrizeBreakdownItem[]>([])
  const [turnstileToken, setTurnstileToken] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [bannerUploading, setBannerUploading] = useState(false)
  const [bannerError, setBannerError] = useState('')

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }))
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

  function setSelect(field: string) {
    return (value: string) => setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!turnstileToken) {
      setError('Please complete the bot verification.')
      return
    }
    // Date sanity checks — mirror the backend rules for instant feedback.
    // ISO date strings (YYYY-MM-DD) compare correctly with < / >.
    // Only run these when the relevant dates were actually provided — all fields
    // except the title are optional now.
    const today = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD in local time
    if (form.start_date && form.start_date < today) {
      setError('Start date must be today or in the future.')
      return
    }
    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      setError('End date must be on or after the start date.')
      return
    }
    if (form.start_date && form.registration_deadline && form.registration_deadline > form.start_date) {
      setError('Registration deadline must be on or before the tournament start date.')
      return
    }
    if ((form.format === 'offline' || form.format === 'hybrid') && !form.state) {
      setError('State is required for offline and hybrid tournaments.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const payload = {
        ...form,
        format: form.format || null,
        prize_pool_rm: form.prize_pool_rm ? parseInt(form.prize_pool_rm, 10) : null,
        max_teams: form.max_teams ? parseInt(form.max_teams, 10) : null,
        additional_prizes: form.additional_prizes
          ? form.additional_prizes.split(',').map(s => s.trim()).filter(Boolean)
          : [],
        state: form.state || null,
        venue: form.venue || null,
        stage_notes: form.stage_notes || null,
        description: form.description || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        registration_deadline: form.registration_deadline || null,
        organiser_name: form.organiser_name || null,
        organiser_contact: form.organiser_contact || null,
        organiser_email: form.organiser_email || null,
        registration_link: form.registration_link || null,
        prize_breakdown: prizeBreakdown.filter(item => item.placement.trim() && item.reward.trim()),
        banner_image: form.banner_image || null,
        turnstile_token: turnstileToken,
      }
      await apiFetch('/api/tournaments/submit', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      setSubmitted(true)
    } catch (err) {
      setError('Submission failed. Please check all fields and try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="mx-auto max-w-lg px-4 py-20 text-center sm:px-6">
          <ShieldCheck className="mx-auto mb-4 h-12 w-12 text-green-600" />
          <h1 className="text-2xl font-extrabold">Submission received!</h1>
          <p className="mt-3 text-muted-foreground">
            We'll review your tournament within 1–2 business days
            {form.organiser_email ? ' and notify you at the email you provided.' : '.'}
          </p>
          <Button
            className="mt-8"
            onClick={() => {
              setForm(INITIAL)
              setPrizeBreakdown([])
              setTurnstileToken('')
              setError('')
              setSubmitted(false)
            }}
          >
            Submit Another Tournament
          </Button>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-foreground">Submit a Tournament</h1>
          <p className="mt-2 text-muted-foreground">
            Fill in the details below. Your submission will be reviewed by our team before going live.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Organising regularly?{' '}
            <Link href="/organiser/signup" className="font-medium text-primary hover:underline">
              Create an organiser account
            </Link>{' '}
            to manage your listings and auto-fill tournaments from a poster with AI.
          </p>
        </div>

        <div className="mb-6 flex gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            By submitting, you confirm that all details are accurate and the tournament is a genuine event.
            Esportorium lists tournaments for informational purposes only and is not responsible for any
            disputes arising from listed events.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tournament Details</CardTitle>
            <CardDescription>Only the tournament name is required — fill in what you can, our team will help complete the rest during review.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">

              <FormField label="Tournament Name" id="title">
                <Input id="title" placeholder="e.g. ML Warriors Open 2025" maxLength={200} required value={form.title} onChange={set('title')} />
              </FormField>

              <FormField label="Description / Rules (optional)" id="description">
                <Textarea
                  id="description"
                  placeholder="e.g. Open to Malaysian players only. Must be Mythic rank or above. Bring your own device."
                  maxLength={2000}
                  rows={4}
                  value={form.description}
                  onChange={set('description')}
                />
              </FormField>

              <FormField label="Format (optional)" id="format">
                <Select value={form.format} onValueChange={setSelect('format')}>
                  <SelectTrigger id="format">
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                    <SelectItem value="hybrid">Hybrid (online + offline)</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>

              {(form.format === 'offline' || form.format === 'hybrid') && (
                <>
                  <FormField label="State" id="state">
                    <Select required value={form.state} onValueChange={setSelect('state')}>
                      <SelectTrigger id="state">
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        {STATES.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>

                  <FormField label="Venue" id="venue">
                    <Input id="venue" placeholder="e.g. Berjaya Times Square, KL" maxLength={300} value={form.venue} onChange={set('venue')} />
                  </FormField>
                </>
              )}

              {form.format === 'hybrid' && (
                <FormField label="Stage Breakdown (optional)" id="stage_notes">
                  <Input id="stage_notes" placeholder="e.g. Group stage online, playoffs offline in KL" maxLength={300} value={form.stage_notes} onChange={set('stage_notes')} />
                </FormField>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Start Date (optional)" id="start_date">
                  <Input id="start_date" type="date" value={form.start_date} onChange={set('start_date')} />
                </FormField>
                <FormField label="End Date (optional)" id="end_date">
                  <Input id="end_date" type="date" value={form.end_date} onChange={set('end_date')} />
                </FormField>
              </div>

              <FormField label="Registration Deadline (optional)" id="registration_deadline">
                <Input id="registration_deadline" type="date" value={form.registration_deadline} onChange={set('registration_deadline')} />
              </FormField>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Prize Pool (RM) (optional)" id="prize_pool_rm">
                  <Input id="prize_pool_rm" type="number" min={0} placeholder="e.g. 500" value={form.prize_pool_rm} onChange={set('prize_pool_rm')} />
                </FormField>
                <FormField label="Max Teams (optional)" id="max_teams">
                  <Input id="max_teams" type="number" min={2} placeholder="e.g. 16" value={form.max_teams} onChange={set('max_teams')} />
                </FormField>
              </div>

              <FormField label="Additional Prizes (optional)" id="additional_prizes">
                <Input id="additional_prizes" placeholder="e.g. Trophy, Jersey (comma separated)" value={form.additional_prizes} onChange={set('additional_prizes')} />
              </FormField>

              <FormField label="Prize Breakdown (optional)" id="prize_breakdown">
                <PrizeBreakdownEditor items={prizeBreakdown} onChange={setPrizeBreakdown} />
              </FormField>

              <FormField label="Registration Link (optional)" id="registration_link">
                <Input id="registration_link" type="url" placeholder="https://forms.gle/..." value={form.registration_link} onChange={set('registration_link')} />
              </FormField>

              <FormField label="Banner Image (optional)" id="banner_image">
                {form.banner_image ? (
                  <div className="space-y-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={form.banner_image} alt="Banner preview" className="h-36 w-full rounded-md border border-border object-cover" />
                    <Button type="button" variant="outline" size="sm" onClick={() => setForm(prev => ({ ...prev, banner_image: '' }))}>
                      Remove image
                    </Button>
                  </div>
                ) : (
                  <Input
                    id="banner_image"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    disabled={bannerUploading}
                    onChange={handleBannerUpload}
                  />
                )}
                {bannerUploading && <p className="mt-1 text-xs text-muted-foreground">Uploading…</p>}
                {bannerError && <p className="mt-1 text-xs text-red-500">{bannerError}</p>}
                {!form.banner_image && !bannerError && (
                  <p className="mt-1 text-xs text-muted-foreground">Landscape 16:9 recommended. JPG, PNG, WebP or GIF, max 2 MB.</p>
                )}
              </FormField>

              <div className="border-t border-border pt-6">
                <h3 className="mb-4 font-semibold">Organiser Info</h3>
                <div className="space-y-4">
                  <FormField label="Organiser Name (optional)" id="organiser_name">
                    <Input id="organiser_name" placeholder="e.g. KL Esports Club" maxLength={100} value={form.organiser_name} onChange={set('organiser_name')} />
                  </FormField>
                  <FormField label="Contact (WhatsApp / email) (optional)" id="organiser_contact">
                    <Input id="organiser_contact" placeholder="e.g. +6012-3456789" maxLength={100} value={form.organiser_contact} onChange={set('organiser_contact')} />
                  </FormField>
                  <FormField label="Email (for approval notification) (optional)" id="organiser_email">
                    <Input id="organiser_email" type="email" placeholder="organiser@example.com" value={form.organiser_email} onChange={set('organiser_email')} />
                  </FormField>
                </div>
              </div>

              <div>
                <Turnstile
                  siteKey={TURNSTILE_SITE_KEY}
                  onSuccess={(token) => setTurnstileToken(token)}
                  onError={() => setTurnstileToken('')}
                  onExpire={() => setTurnstileToken('')}
                />
              </div>

              {error && (
                <p className="flex items-center gap-2 text-sm text-red-500">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Submitting…' : 'Submit for Review'}
              </Button>

            </form>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  )
}

function FormField({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  )
}
