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
import { useLang } from '@/lib/i18n'

// Only allow redirecting back to internal organiser paths — never an
// attacker-supplied absolute URL (open-redirect guard).
function safeNext(): string {
  if (typeof window === 'undefined') return '/organiser/dashboard'
  const next = new URLSearchParams(window.location.search).get('next')
  return next && next.startsWith('/organiser/') ? next : '/organiser/dashboard'
}

export default function OrganiserLogin() {
  const router = useRouter()
  const { t } = useLang()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (getValidOrganiserToken()) router.replace(safeNext())
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await apiFetch('/api/organiser/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      localStorage.setItem('organiser_token', data.access_token)
      router.push(safeNext())
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError(t.organiser.invalidCredentials)
      } else if (err instanceof NetworkError) {
        setError(t.organiser.cantReachServer)
      } else {
        setError(t.organiser.somethingWrong)
      }
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Link href="/" className="absolute top-5 left-5 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> {t.common.backToHome}
      </Link>
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center items-center">
          <Image src="/esportorium-logo.png" alt="Esportorium" width={48} height={48} className="mb-2 h-12 w-12 rounded-lg" />
          <CardTitle className="text-2xl font-extrabold">{t.organiser.loginTitle}</CardTitle>
          <CardDescription>{t.organiser.loginSubtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t.common.email}</Label>
              <Input id="email" type="email" autoComplete="email" placeholder={t.organiser.emailPlaceholder}
                value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t.common.password}</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password" value={password}
                  onChange={e => setPassword(e.target.value)} className="pr-10" required />
                <Button type="button" variant="ghost" size="icon"
                  className="absolute right-0 top-0 h-full w-10 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(v => !v)} tabIndex={-1}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t.common.loggingIn : t.common.logIn}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {t.organiser.newHere}{' '}
            <Link href="/organiser/signup" className="font-medium text-primary hover:underline">{t.organiser.createAccount}</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
