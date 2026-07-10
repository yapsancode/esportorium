'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, CheckCircle2, AlertCircle, Trophy } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  apiFetch, organiserFetch, getValidOrganiserToken, ApiError, NetworkError,
} from '@/lib/api'

interface ClaimPreview {
  tournament_id: string
  title: string
  already_claimed: boolean
}

function ClaimContent() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get('token') ?? ''

  const [preview, setPreview] = useState<ClaimPreview | null>(null)
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(true)
  const [loggedIn, setLoggedIn] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [claimError, setClaimError] = useState('')

  // Where login/signup should return after authenticating.
  const nextPath = `/organiser/claim?token=${encodeURIComponent(token)}`

  useEffect(() => {
    setLoggedIn(!!getValidOrganiserToken())
    if (!token) {
      setLoadError('This claim link is missing its token. Please use the link from your approval email.')
      setLoading(false)
      return
    }
    async function loadPreview() {
      try {
        const data = await apiFetch(`/api/organiser/claim/preview?token=${encodeURIComponent(token)}`)
        setPreview(data)
      } catch (err) {
        if (err instanceof ApiError && err.status === 400) {
          setLoadError('This claim link is invalid or has expired. Please contact us if you need a new one.')
        } else if (err instanceof ApiError && err.status === 404) {
          setLoadError('The tournament for this link no longer exists.')
        } else if (err instanceof NetworkError) {
          setLoadError("Can't reach the server. Check your connection and try again.")
        } else {
          setLoadError('Something went wrong loading this claim link.')
        }
      } finally {
        setLoading(false)
      }
    }
    loadPreview()
  }, [token])

  async function handleClaim() {
    setClaimError('')
    setClaiming(true)
    try {
      await organiserFetch('/api/organiser/claim', {
        method: 'POST',
        body: JSON.stringify({ claim_token: token }),
      })
      router.push('/organiser/dashboard')
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        // Token expired between page load and claim — send them to log in.
        localStorage.removeItem('organiser_token')
        router.push(`/organiser/login?next=${encodeURIComponent(nextPath)}`)
      } else if (err instanceof ApiError && err.status === 409) {
        setClaimError('This tournament has already been claimed.')
      } else if (err instanceof ApiError && err.status === 400) {
        setClaimError('This claim link is invalid or has expired.')
      } else {
        setClaimError('Failed to claim. Please try again.')
      }
      setClaiming(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Link href="/" className="absolute top-5 left-5 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to home
      </Link>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center items-center">
          <Image src="/esportorium-logo.png" alt="Esportorium" width={48} height={48} className="mb-2 h-12 w-12 rounded-lg" />
          <CardTitle className="text-2xl font-extrabold">Claim your tournament</CardTitle>
          <CardDescription>Take ownership so you can manage this listing yourself</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-6 text-center text-muted-foreground">Loading…</p>
          ) : loadError ? (
            <div className="py-4 text-center">
              <AlertCircle className="mx-auto mb-3 h-8 w-8 text-red-500" />
              <p className="text-sm text-muted-foreground">{loadError}</p>
            </div>
          ) : preview?.already_claimed ? (
            <div className="py-4 text-center">
              <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-green-600" />
              <p className="font-medium text-foreground">&ldquo;{preview.title}&rdquo; is already claimed.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                If that was you, log in to manage it from your dashboard.
              </p>
              <Link href="/organiser/login">
                <Button className="mt-4 w-full">Go to organiser login</Button>
              </Link>
            </div>
          ) : preview ? (
            <div className="space-y-5">
              <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/50 p-4">
                <Trophy className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">You&apos;re claiming</p>
                  <p className="font-semibold text-foreground">{preview.title}</p>
                </div>
              </div>

              {claimError && (
                <p className="flex items-center gap-2 text-sm text-red-500">
                  <AlertCircle className="h-4 w-4 shrink-0" />{claimError}
                </p>
              )}

              {loggedIn ? (
                <>
                  <Button className="w-full" onClick={handleClaim} disabled={claiming}>
                    {claiming ? 'Claiming…' : 'Claim this tournament'}
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    It will be added to your organiser dashboard.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Log in or create an organiser account to claim it. It takes less than a minute.
                  </p>
                  <div className="space-y-2">
                    <Link href={`/organiser/signup?next=${encodeURIComponent(nextPath)}`}>
                      <Button className="w-full">Create an account &amp; claim</Button>
                    </Link>
                    <Link href={`/organiser/login?next=${encodeURIComponent(nextPath)}`}>
                      <Button variant="outline" className="w-full">I already have an account</Button>
                    </Link>
                  </div>
                </>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

export default function ClaimPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>}>
      <ClaimContent />
    </Suspense>
  )
}
