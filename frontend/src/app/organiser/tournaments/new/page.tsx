'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import Navbar from '@/components/Navbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react'
import TournamentForm, { EMPTY_FORM, type TournamentFormValues } from '@/components/TournamentForm'
import { organiserFetch, organiserIngest, ApiError, NetworkError } from '@/lib/api'
import { useLang } from '@/lib/i18n'
import type { IngestDraft, IngestDraftOut } from '@/lib/types'

// Map an ingest draft onto the form's string-valued fields.
function draftToForm(d: IngestDraft): TournamentFormValues {
  return {
    ...EMPTY_FORM,
    title: d.title ?? '',
    format: d.format ?? '',
    state: d.state ?? '',
    venue: d.venue ?? '',
    start_date: d.start_date ?? '',
    end_date: d.end_date ?? '',
    registration_deadline: d.registration_deadline ?? '',
    prize_pool_rm: d.prize_pool_rm != null ? String(d.prize_pool_rm) : '',
    max_teams: d.max_teams != null ? String(d.max_teams) : '',
    registration_link: d.registration_link ?? '',
  }
}

function NewTournamentContent() {
  const router = useRouter()
  const { t } = useLang()

  // Ingest panel state
  const [ingestText, setIngestText] = useState('')
  const [ingestFile, setIngestFile] = useState<File | null>(null)
  const [ingesting, setIngesting] = useState(false)
  const [ingestError, setIngestError] = useState('')
  const [ingestResult, setIngestResult] = useState<IngestDraftOut | null>(null)

  // Form seed — bumping formKey remounts the form with new initial values.
  const [formSeed, setFormSeed] = useState<TournamentFormValues>(EMPTY_FORM)
  const [highlight, setHighlight] = useState<string[]>([])
  const [formKey, setFormKey] = useState(0)

  // Submit state
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  async function handleIngest() {
    if (!ingestText.trim() && !ingestFile) {
      setIngestError(t.organiser.ingestEmpty)
      return
    }
    setIngestError('')
    setIngesting(true)
    try {
      const result = await organiserIngest({
        text: ingestText.trim() || undefined,
        file: ingestFile ?? undefined,
      })
      setIngestResult(result)
      setFormSeed(draftToForm(result.draft))
      setHighlight(result.flagged_fields)
      setFormKey(k => k + 1)
    } catch (err) {
      if (err instanceof ApiError && err.status === 503) {
        setIngestError(t.organiser.ingestNotConfigured)
      } else if (err instanceof ApiError && err.status === 415) {
        setIngestError(t.organiser.ingestUnsupported)
      } else if (err instanceof NetworkError) {
        setIngestError(t.organiser.cantReachServer)
      } else {
        setIngestError(t.organiser.ingestFailed)
      }
    } finally {
      setIngesting(false)
    }
  }

  async function handleSubmit(payload: object) {
    setSaveError('')
    setSaving(true)
    try {
      await organiserFetch('/api/organiser/tournaments', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      router.push('/organiser/dashboard')
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        localStorage.removeItem('organiser_token')
        router.push('/organiser/login')
      } else if (err instanceof ApiError && err.status === 422) {
        setSaveError(t.organiser.saveInvalid)
      } else {
        setSaveError(t.organiser.saveFailed)
      }
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-foreground">{t.organiser.newTitle}</h1>
          <p className="mt-2 text-muted-foreground">
            {t.organiser.newSubtitle}
          </p>
        </div>

        {/* ── AI import ──────────────────────────────────────────────── */}
        <Card className="mb-8 border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Sparkles className="h-4 w-4 text-primary" /> {t.organiser.importWithAI}
            </CardTitle>
            <CardDescription>
              {t.organiser.importDescription}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ingest_text">{t.organiser.announcementText}</Label>
              <Textarea id="ingest_text" rows={5}
                placeholder={t.organiser.announcementPlaceholder}
                value={ingestText} onChange={e => setIngestText(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ingest_file">{t.organiser.posterOrPdf}</Label>
              <Input id="ingest_file" type="file"
                accept="image/png,image/jpeg,image/gif,image/webp,application/pdf"
                onChange={e => setIngestFile(e.target.files?.[0] ?? null)} />
            </div>
            {ingestError && (
              <p className="flex items-center gap-2 text-sm text-red-500">
                <AlertCircle className="h-4 w-4 shrink-0" />{ingestError}
              </p>
            )}
            <Button type="button" onClick={handleIngest} disabled={ingesting} className="gap-1.5">
              <Sparkles className="h-4 w-4" />
              {ingesting ? t.organiser.extracting : t.organiser.extractDetails}
            </Button>

            {ingestResult && (
              <div className="rounded-lg border border-border bg-muted/50 p-4 text-sm">
                <p className="flex items-center gap-2 font-medium text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  {t.organiser.filledFields(ingestResult.extracted_count, ingestResult.total_fields)}
                </p>
                {ingestResult.flagged_fields.length > 0 && (
                  <div className="mt-2">
                    <p className="text-muted-foreground">{t.organiser.reviewHighlighted}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {ingestResult.flagged_fields.map(f => (
                        <Badge key={f} variant="secondary" className="font-normal">{f.replace(/_/g, ' ')}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── The form ───────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>{t.organiser.detailsCardTitle}</CardTitle>
            <CardDescription>{t.organiser.detailsCardDescNew}</CardDescription>
          </CardHeader>
          <CardContent>
            {saveError && (
              <p className="mb-4 flex items-center gap-2 text-sm text-red-500">
                <AlertCircle className="h-4 w-4 shrink-0" />{saveError}
              </p>
            )}
            <TournamentForm
              key={formKey}
              initialForm={formSeed}
              highlightFields={highlight}
              submitLabel={t.submit.submitForReview}
              loadingLabel={t.submit.submitting}
              loading={saving}
              onSubmit={handleSubmit}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export default function NewTournamentPage() {
  return (
    <ProtectedRoute role="organiser">
      <NewTournamentContent />
    </ProtectedRoute>
  )
}
