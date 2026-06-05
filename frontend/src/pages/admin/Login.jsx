import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import logo from '@/assets/esportorium-logo.png'

export default function AdminLogin() {
  const navigate = useNavigate()

  // noindex — admin pages must never appear in search results

  function handleSubmit(e) {
    e.preventDefault()
    // TODO: call POST /api/admin/auth/login
    navigate('/admin/dashboard')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
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
              <Input id="username" type="text" placeholder="admin" autoComplete="username" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="current-password" />
            </div>
            <Button type="submit" className="w-full">Log in</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
