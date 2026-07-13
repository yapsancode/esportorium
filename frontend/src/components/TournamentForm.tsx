'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import PrizeBreakdownEditor from '@/components/PrizeBreakdownEditor'
import { AlertCircle } from 'lucide-react'
import { uploadBanner } from '@/lib/api'
import { useLang } from '@/lib/i18n'
import type { PrizeBreakdownItem, Tournament } from '@/lib/types'

const STATES = [
  'Kuala Lumpur', 'Selangor', 'Johor', 'Penang', 'Sabah', 'Sarawak',
  'Perak', 'Kedah', 'Kelantan', 'Terengganu', 'Pahang', 'Negeri Sembilan',
  'Melaka', 'Perlis', 'Putrajaya', 'Labuan',
]

// Internal form state — everything is a string so inputs stay controlled.
// Highlighted fields (from an ingest draft) get a subtle ring to prompt review.
export interface TournamentFormValues {
  title: string
  description: string
  format: string
  state: string
  venue: string
  stage_notes: string
  start_date: string
  end_date: string
  registration_deadline: string
  prize_pool_rm: string
  max_teams: string
  additional_prizes: string
  registration_link: string
  organiser_name: string
  organiser_contact: string
  banner_image: string
}

export const EMPTY_FORM: TournamentFormValues = {
  title: '', description: '', format: '', state: '', venue: '', stage_notes: '',
  start_date: '', end_date: '', registration_deadline: '', prize_pool_rm: '',
  max_teams: '', additional_prizes: '', registration_link: '', organiser_name: '',
  organiser_contact: '', banner_image: '',
}

// Build the API-ready payload the tournament create/update endpoints expect.
export function toPayload(form: TournamentFormValues, prizeBreakdown: PrizeBreakdownItem[]) {
  return {
    title: form.title,
    format: form.format || null,
    state: form.state || null,
    venue: form.venue || null,
    stage_notes: form.stage_notes || null,
    description: form.description || null,
    start_date: form.start_date || null,
    end_date: form.end_date || null,
    registration_deadline: form.registration_deadline || null,
    prize_pool_rm: form.prize_pool_rm ? parseInt(form.prize_pool_rm, 10) : null,
    max_teams: form.max_teams ? parseInt(form.max_teams, 10) : null,
    additional_prizes: form.additional_prizes
      ? form.additional_prizes.split(',').map(s => s.trim()).filter(Boolean)
      : [],
    prize_breakdown: prizeBreakdown.filter(i => i.placement.trim() && i.reward.trim()),
    registration_link: form.registration_link || null,
    organiser_name: form.organiser_name || null,
    organiser_contact: form.organiser_contact || null,
    banner_image: form.banner_image || null,
  }
}

// Convert an existing tournament (from the API) into editable form values.
export function tournamentToForm(t: Tournament): TournamentFormValues {
  return {
    title: t.title ?? '',
    description: t.description ?? '',
    format: t.format ?? '',
    state: t.state ?? '',
    venue: t.venue ?? '',
    stage_notes: t.stage_notes ?? '',
    start_date: t.start_date ?? '',
    end_date: t.end_date ?? '',
    registration_deadline: t.registration_deadline ?? '',
    prize_pool_rm: t.prize_pool_rm != null ? String(t.prize_pool_rm) : '',
    max_teams: t.max_teams != null ? String(t.max_teams) : '',
    additional_prizes: (t.additional_prizes ?? []).join(', '),
    registration_link: t.registration_link ?? '',
    organiser_name: t.organiser_name ?? '',
    organiser_contact: t.organiser_contact ?? '',
    banner_image: t.banner_image ?? '',
  }
}

export default function TournamentForm({
  initialForm,
  initialPrizeBreakdown = [],
  highlightFields = [],
  submitLabel,
  loadingLabel,
  loading,
  onSubmit,
}: {
  initialForm: TournamentFormValues
  initialPrizeBreakdown?: PrizeBreakdownItem[]
  highlightFields?: string[]
  submitLabel: string
  loadingLabel: string
  loading: boolean
  onSubmit: (payload: ReturnType<typeof toPayload>) => void
}) {
  const { t } = useLang()
  const [form, setForm] = useState<TournamentFormValues>(initialForm)
  const [prizeBreakdown, setPrizeBreakdown] = useState<PrizeBreakdownItem[]>(initialPrizeBreakdown)
  const [error, setError] = useState('')
  const [bannerUploading, setBannerUploading] = useState(false)
  const [bannerError, setBannerError] = useState('')

  const highlight = new Set(highlightFields)
  const ring = (field: string) =>
    highlight.has(field) ? 'ring-2 ring-primary/40 rounded-md' : ''

  function set(field: keyof TournamentFormValues) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }))
  }
  function setSelect(field: keyof TournamentFormValues) {
    return (value: string) => setForm(prev => ({ ...prev, [field]: value }))
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // Relational date checks — mirror the backend rules for instant feedback.
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
    onSubmit(toPayload(form, prizeBreakdown))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormField label={t.form.tournamentName} id="title" required>
        <Input id="title" placeholder={t.form.tournamentNamePlaceholder} maxLength={200} required
          className={ring('title')} value={form.title} onChange={set('title')} />
      </FormField>

      <FormField label={t.form.descriptionRules} id="description">
        <Textarea id="description" rows={4} maxLength={2000}
          placeholder={t.form.descriptionPlaceholder}
          value={form.description} onChange={set('description')} />
      </FormField>

      <FormField label={t.form.format} id="format">
        <Select value={form.format} onValueChange={setSelect('format')}>
          <SelectTrigger id="format" className={ring('format')}>
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
          <FormField label={t.form.state} id="state" required>
            <Select value={form.state} onValueChange={setSelect('state')}>
              <SelectTrigger id="state" className={ring('state')}>
                <SelectValue placeholder={t.form.selectState} />
              </SelectTrigger>
              <SelectContent>
                {STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label={t.form.venue} id="venue">
            <Input id="venue" placeholder={t.form.venuePlaceholder} maxLength={300}
              className={ring('venue')} value={form.venue} onChange={set('venue')} />
          </FormField>
        </>
      )}

      {form.format === 'hybrid' && (
        <FormField label={t.form.stageBreakdown} id="stage_notes">
          <Input id="stage_notes" placeholder={t.form.stageBreakdownPlaceholder}
            maxLength={300} value={form.stage_notes} onChange={set('stage_notes')} />
        </FormField>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t.form.startDate} id="start_date">
          <Input id="start_date" type="date" className={ring('start_date')}
            value={form.start_date} onChange={set('start_date')} />
        </FormField>
        <FormField label={t.form.endDate} id="end_date">
          <Input id="end_date" type="date" className={ring('end_date')}
            value={form.end_date} onChange={set('end_date')} />
        </FormField>
      </div>

      <FormField label={t.form.registrationDeadline} id="registration_deadline">
        <Input id="registration_deadline" type="date" className={ring('registration_deadline')}
          value={form.registration_deadline} onChange={set('registration_deadline')} />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t.form.prizePoolRM} id="prize_pool_rm">
          <Input id="prize_pool_rm" type="number" min={0} placeholder={t.form.prizePoolPlaceholder}
            className={ring('prize_pool_rm')} value={form.prize_pool_rm} onChange={set('prize_pool_rm')} />
        </FormField>
        <FormField label={t.form.maxTeams} id="max_teams">
          <Input id="max_teams" type="number" min={2} placeholder={t.form.maxTeamsPlaceholder}
            className={ring('max_teams')} value={form.max_teams} onChange={set('max_teams')} />
        </FormField>
      </div>

      <FormField label={t.form.additionalPrizes} id="additional_prizes">
        <Input id="additional_prizes" placeholder={t.form.additionalPrizesPlaceholder}
          value={form.additional_prizes} onChange={set('additional_prizes')} />
      </FormField>

      <FormField label={t.form.prizeBreakdown} id="prize_breakdown">
        <PrizeBreakdownEditor items={prizeBreakdown} onChange={setPrizeBreakdown} />
      </FormField>

      <FormField label={t.form.registrationLink} id="registration_link">
        <Input id="registration_link" type="url" placeholder="https://forms.gle/..."
          className={ring('registration_link')} value={form.registration_link} onChange={set('registration_link')} />
      </FormField>

      <FormField label={t.form.bannerImage} id="banner_image">
        {form.banner_image ? (
          <div className="space-y-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={form.banner_image} alt="Banner preview" className="h-36 w-full rounded-md border border-border object-cover" />
            <Button type="button" variant="outline" size="sm" onClick={() => setForm(prev => ({ ...prev, banner_image: '' }))}>
              {t.form.removeImage}
            </Button>
          </div>
        ) : (
          <Input id="banner_image" type="file" accept="image/png,image/jpeg,image/webp,image/gif"
            disabled={bannerUploading} onChange={handleBannerUpload} />
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
          <FormField label={t.form.organiserTeamName} id="organiser_name">
            <Input id="organiser_name" placeholder={t.form.organiserNamePlaceholder} maxLength={100}
              value={form.organiser_name} onChange={set('organiser_name')} />
          </FormField>
          <FormField label={t.form.publicContact} id="organiser_contact">
            <Input id="organiser_contact" placeholder={t.form.contactPlaceholder} maxLength={100}
              value={form.organiser_contact} onChange={set('organiser_contact')} />
          </FormField>
        </div>
      </div>

      {error && (
        <p className="flex items-center gap-2 text-sm text-red-500">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={loading || bannerUploading}>
        {loading ? loadingLabel : submitLabel}
      </Button>
    </form>
  )
}

function FormField({ label, id, required, children }: { label: string; id: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      {children}
    </div>
  )
}
