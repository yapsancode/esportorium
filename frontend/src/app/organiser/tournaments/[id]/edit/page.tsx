'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'
import Navbar from '@/components/Navbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import TournamentForm, { tournamentToForm, type TournamentFormValues } from '@/components/TournamentForm'
import { organiserFetch, ApiError } from '@/lib/api'
import type { Tournament, PrizeBreakdownItem } from '@/lib/types'

function EditContent() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [initialForm, setInitialForm] = useState<TournamentFormValues | null>(null)
  const [prizeBreakdown, setPrizeBreakdown] = useState<PrizeBreakdownItem[]>([])
  const [approved, setApproved] = useState(false)
  const [status, setStatus] = useState('')
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const t: Tournament = await organiserFetch(`/api/organiser/tournaments/${id}`)
        setInitialForm(tournamentToForm(t))
        setPrizeBreakdown(t.prize_breakdown ?? [])
        setApproved(t.is_approved)
        setStatus(t.status)
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          localStorage.removeItem('organiser_token')
          router.push('/organiser/login')
        } else if (err instanceof ApiError && err.status === 404) {
          setLoadError('This tournament was not found, or it is not yours to edit.')
        } else {
          setLoadError('Failed to load this tournament.')
        }
      }
    }
    load()
  }, [id, router])

  async function handleSubmit(payload: object) {
    setSaveError('')
    setSaving(true)
    try {
      await organiserFetch(`/api/organiser/tournaments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })
      router.push('/organiser/dashboard')
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        localStorage.removeItem('organiser_token')
        router.push('/organiser/login')
      } else if (err instanceof ApiError && err.status === 404) {
        setSaveError('This tournament is no longer available.')
      } else if (err instanceof ApiError && err.status === 422) {
        setSaveError('Some fields are invalid. Please review and try again.')
      } else {
        setSaveError('Failed to save. Please try again.')
      }
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
        <Link href="/organiser/dashboard" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to my tournaments
        </Link>

        {loadError ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="mx-auto mb-3 h-8 w-8 text-red-500" />
              <p className="text-muted-foreground">{loadError}</p>
              <Link href="/organiser/dashboard">
                <Button className="mt-4" variant="outline">Back to dashboard</Button>
              </Link>
            </CardContent>
          </Card>
        ) : !initialForm ? (
          <p className="py-12 text-center text-muted-foreground">Loading…</p>
        ) : (
          <>
            <div className="mb-8 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-extrabold text-foreground">Edit Tournament</h1>
              {approved
                ? <Badge>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>
                : <Badge variant="secondary">Pending review</Badge>}
            </div>

            {approved && (
              <p className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                This tournament is already live. Saving changes updates the public listing immediately.
              </p>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Tournament Details</CardTitle>
                <CardDescription>Update any field and save your changes.</CardDescription>
              </CardHeader>
              <CardContent>
                {saveError && (
                  <p className="mb-4 flex items-center gap-2 text-sm text-red-500">
                    <AlertCircle className="h-4 w-4 shrink-0" />{saveError}
                  </p>
                )}
                <TournamentForm
                  initialForm={initialForm}
                  initialPrizeBreakdown={prizeBreakdown}
                  submitLabel="Save Changes"
                  loadingLabel="Saving…"
                  loading={saving}
                  onSubmit={handleSubmit}
                />
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  )
}

export default function EditTournamentPage() {
  return (
    <ProtectedRoute role="organiser">
      <EditContent />
    </ProtectedRoute>
  )
}
