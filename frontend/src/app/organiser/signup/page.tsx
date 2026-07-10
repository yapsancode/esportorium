'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiFetch, getValidOrganiserToken, ApiError, NetworkError } from '@/lib/api'

// Only allow redirecting back to internal organiser paths — never an
// attacker-supplied absolute URL (open-redirect guard).
function safeNext(): string {
  if (typeof window === 'undefined') return '/organiser/dashboard'
  const next = new URLSearchParams(window.location.search).get('next')
  return next && next.startsWith('/organiser/') ? next : '/organiser/dashboard'
}

export default function OrganiserSignup() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '', display_name: '', contact: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Already signed in? Skip straight to the dashboard (or the claim we came from).
  useEffect(() => {
    if (getValidOrganiserToken()) router.replace(safeNext())
  }, [router])

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setLoading(true)
    try {
      await apiFetch('/api/organiser/auth/signup', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      // Signup returns a profile, not a token — log in with the same credentials.
      const data = await apiFetch('/api/organiser/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: form.email, password: form.password }),
      })
      localStorage.setItem('organiser_token', data.access_token)
      router.push(safeNext())
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError('An account with this email already exists. Log in instead.')
      } else if (err instanceof ApiError && err.status === 422) {
        setError('Please check your details and try again.')
      } else if (err instanceof NetworkError) {
        setError("Can't reach the server. Check your connection and try again.")
      } else {
        setError('Something went wrong. Please try again.')
      }
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Link href="/" className="absolute top-5 left-5 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to home
      </Link>
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center items-center">
          <Image src="/esportorium-logo.png" alt="Esportorium" width={48} height={48} className="mb-2 h-12 w-12 rounded-lg" />
          <CardTitle className="text-2xl font-extrabold">Create organiser account</CardTitle>
          <CardDescription>List and manage your own tournaments</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="display_name">Organiser / Team Name</Label>
              <Input id="display_name" type="text" placeholder="e.g. KL Esports Club"
                value={form.display_name} onChange={set('display_name')} required minLength={2} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" placeholder="you@example.com"
                value={form.email} onChange={set('email')} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact">Contact (WhatsApp / email)</Label>
              <Input id="contact" type="text" placeholder="e.g. +6012-3456789"
                value={form.contact} onChange={set('contact')} required minLength={5} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password" value={form.password} onChange={set('password')}
                  className="pr-10" required minLength={8} />
                <Button type="button" variant="ghost" size="icon"
                  className="absolute right-0 top-0 h-full w-10 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(v => !v)} tabIndex={-1}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">At least 8 characters.</p>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account…' : 'Create account'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/organiser/login" className="font-medium text-primary hover:underline">Log in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
