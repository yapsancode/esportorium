'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Turnstile } from '@marsidev/react-turnstile'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import LocalizedMeta from '@/components/LocalizedMeta'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import PrizeBreakdownEditor from '@/components/PrizeBreakdownEditor'
import { AlertCircle, ShieldCheck } from 'lucide-react'
import { apiFetch, uploadBanner } from '@/lib/api'
import { useLang } from '@/lib/i18n'
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
  const { t } = useLang()
  const opt = ` ${t.common.optional}`
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
      setBannerError(t.form.chooseImageError)
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setBannerError(t.form.imageTooLarge)
      return
    }
    setBannerUploading(true)
    try {
      const url = await uploadBanner(file)
      setForm(prev => ({ ...prev, banner_image: url }))
    } catch {
      setBannerError(t.form.uploadFailed)
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
      setError(t.submit.botVerification)
      return
    }
    // Date sanity checks — mirror the backend rules for instant feedback.
    // ISO date strings (YYYY-MM-DD) compare correctly with < / >.
    // Only run these when the relevant dates were actually provided — all fields
    // except the title are optional now.
    const today = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD in local time
    if (form.start_date && form.start_date < today) {
      setError(t.form.errStartPast)
      return
    }
    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      setError(t.form.errEndBeforeStart)
      return
    }
    if (form.start_date && form.registration_deadline && form.registration_deadline > form.start_date) {
      setError(t.form.errDeadlineAfterStart)
      return
    }
    if ((form.format === 'offline' || form.format === 'hybrid') && !form.state) {
      setError(t.form.errStateRequired)
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
      setError(t.submit.submitFailed)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <LocalizedMeta title={t.meta.submitTitle} description={t.meta.submitDescription} />
        <Navbar />
        <main className="mx-auto max-w-lg px-4 py-20 text-center sm:px-6">
          <ShieldCheck className="mx-auto mb-4 h-12 w-12 text-green-600" />
          <h1 className="text-2xl font-extrabold">{t.submit.receivedTitle}</h1>
          <p className="mt-3 text-muted-foreground">
            {form.organiser_email ? t.submit.receivedWithEmail : t.submit.receivedNoEmail}
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
            {t.submit.submitAnother}
          </Button>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <LocalizedMeta title={t.meta.submitTitle} description={t.meta.submitDescription} />
      <Navbar />

      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-foreground">{t.submit.title}</h1>
          <p className="mt-2 text-muted-foreground">
            {t.submit.subtitle}
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            {t.submit.organisingRegularly}{' '}
            <Link href="/organiser/signup" className="font-medium text-primary hover:underline">
              {t.submit.createAccountLink}
            </Link>{' '}
            {t.submit.createAccountTail}
          </p>
        </div>

        <div className="mb-6 flex gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{t.submit.warning}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t.submit.cardTitle}</CardTitle>
            <CardDescription>{t.submit.cardDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">

              <FormField label={t.form.tournamentName} id="title">
                <Input id="title" placeholder={t.form.tournamentNamePlaceholder} maxLength={200} required value={form.title} onChange={set('title')} />
              </FormField>

              <FormField label={t.form.descriptionRules + opt} id="description">
                <Textarea
                  id="description"
                  placeholder={t.form.descriptionPlaceholder}
                  maxLength={2000}
                  rows={4}
                  value={form.description}
                  onChange={set('description')}
                />
              </FormField>

              <FormField label={t.form.format + opt} id="format">
                <Select value={form.format} onValueChange={setSelect('format')}>
                  <SelectTrigger id="format">
                    <SelectValue placeholder={t.form.selectFormat} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online">{t.format.online}</SelectItem>
                    <SelectItem value="offline">{t.format.offline}</SelectItem>
                    <SelectItem value="hybrid">{t.format.hybridLong}</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>

              {(form.format === 'offline' || form.format === 'hybrid') && (
                <>
                  <FormField label={t.form.state} id="state">
                    <Select required value={form.state} onValueChange={setSelect('state')}>
                      <SelectTrigger id="state">
                        <SelectValue placeholder={t.form.selectState} />
                      </SelectTrigger>
                      <SelectContent>
                        {STATES.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>

                  <FormField label={t.form.venue} id="venue">
                    <Input id="venue" placeholder={t.form.venuePlaceholder} maxLength={300} value={form.venue} onChange={set('venue')} />
                  </FormField>
                </>
              )}

              {form.format === 'hybrid' && (
                <FormField label={t.form.stageBreakdown + opt} id="stage_notes">
                  <Input id="stage_notes" placeholder={t.form.stageBreakdownPlaceholder} maxLength={300} value={form.stage_notes} onChange={set('stage_notes')} />
                </FormField>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label={t.form.startDate + opt} id="start_date">
                  <Input id="start_date" type="date" value={form.start_date} onChange={set('start_date')} />
                </FormField>
                <FormField label={t.form.endDate + opt} id="end_date">
                  <Input id="end_date" type="date" value={form.end_date} onChange={set('end_date')} />
                </FormField>
              </div>

              <FormField label={t.form.registrationDeadline + opt} id="registration_deadline">
                <Input id="registration_deadline" type="date" value={form.registration_deadline} onChange={set('registration_deadline')} />
              </FormField>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label={t.form.prizePoolRM + opt} id="prize_pool_rm">
                  <Input id="prize_pool_rm" type="number" min={0} placeholder={t.form.prizePoolPlaceholder} value={form.prize_pool_rm} onChange={set('prize_pool_rm')} />
                </FormField>
                <FormField label={t.form.maxTeams + opt} id="max_teams">
                  <Input id="max_teams" type="number" min={2} placeholder={t.form.maxTeamsPlaceholder} value={form.max_teams} onChange={set('max_teams')} />
                </FormField>
              </div>

              <FormField label={t.form.additionalPrizes + opt} id="additional_prizes">
                <Input id="additional_prizes" placeholder={t.form.additionalPrizesPlaceholder} value={form.additional_prizes} onChange={set('additional_prizes')} />
              </FormField>

              <FormField label={t.form.prizeBreakdown + opt} id="prize_breakdown">
                <PrizeBreakdownEditor items={prizeBreakdown} onChange={setPrizeBreakdown} />
              </FormField>

              <FormField label={t.form.registrationLink + opt} id="registration_link">
                <Input id="registration_link" type="url" placeholder="https://forms.gle/..." value={form.registration_link} onChange={set('registration_link')} />
              </FormField>

              <FormField label={t.form.bannerImage + opt} id="banner_image">
                {form.banner_image ? (
                  <div className="space-y-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={form.banner_image} alt="Banner preview" className="h-36 w-full rounded-md border border-border object-cover" />
                    <Button type="button" variant="outline" size="sm" onClick={() => setForm(prev => ({ ...prev, banner_image: '' }))}>
                      {t.form.removeImage}
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
                {bannerUploading && <p className="mt-1 text-xs text-muted-foreground">{t.form.uploading}</p>}
                {bannerError && <p className="mt-1 text-xs text-red-500">{bannerError}</p>}
                {!form.banner_image && !bannerError && (
                  <p className="mt-1 text-xs text-muted-foreground">{t.form.bannerHint}</p>
                )}
              </FormField>

              <div className="border-t border-border pt-6">
                <h3 className="mb-4 font-semibold">{t.form.organiserInfo}</h3>
                <div className="space-y-4">
                  <FormField label={t.form.organiserName + opt} id="organiser_name">
                    <Input id="organiser_name" placeholder={t.form.organiserNamePlaceholder} maxLength={100} value={form.organiser_name} onChange={set('organiser_name')} />
                  </FormField>
                  <FormField label={t.form.contactWhatsappEmail + opt} id="organiser_contact">
                    <Input id="organiser_contact" placeholder={t.form.contactPlaceholder} maxLength={100} value={form.organiser_contact} onChange={set('organiser_contact')} />
                  </FormField>
                  <FormField label={t.form.organiserEmail + opt} id="organiser_email">
                    <Input id="organiser_email" type="email" placeholder={t.form.organiserEmailPlaceholder} value={form.organiser_email} onChange={set('organiser_email')} />
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
                {loading ? t.submit.submitting : t.submit.submitForReview}
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
