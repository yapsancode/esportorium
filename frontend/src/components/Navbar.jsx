import { Link, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import logo from '@/assets/esportorium-logo.png'

export default function Navbar() {
  const location = useLocation()
  const isAdmin = location.pathname.startsWith('/admin')

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img
              src={logo}
              alt="Esportorium"
              className="h-8 w-8 rounded-md"
            />
            <span className="text-xl font-extrabold tracking-tight text-foreground">
              Esportorium
            </span>
          </Link>

          <nav className="flex items-center gap-4">
            {isAdmin ? (
              <>
                <Link to="/admin/dashboard">
                  <Button variant="ghost" size="sm">Pending</Button>
                </Link>
                <Link to="/admin/tournaments">
                  <Button variant="ghost" size="sm">Tournaments</Button>
                </Link>
              </>
            ) : (
              <>
                <Link to="/submit">
                  <Button variant="outline" size="sm">Submit Tournament</Button>
                </Link>
                <Link to="/admin/login">
                  <Button variant="ghost" size="sm" className="text-muted-foreground">Admin</Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}
