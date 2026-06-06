import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiFetch } from '@/lib/api'
import logo from '@/assets/esportorium-logo.png'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await apiFetch('/api/admin/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      })
      localStorage.setItem('admin_token', data.access_token)
      navigate('/admin/dashboard')
    } catch {
      setError('Invalid username or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Link to="/" className="absolute top-5 left-5 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to home
      </Link>
      <Helmet>
        <title>Admin Login — Esportorium</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center items-center">
          <img src={logo} alt="Esportorium" className="mb-2 h-12 w-12 rounded-lg" />
          <CardTitle className="text-2xl font-extrabold">Esportorium</CardTitle>
          <CardDescription>Admin access only</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="admin"
                autoComplete="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Logging in…' : 'Log in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
