import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import logo from '@/assets/esportorium-logo.png'

const NAV_LINKS = [
  { to: '/docs',  label: 'Docs'  },
  { to: '/qna',   label: 'Q&A'   },
  { to: '/about', label: 'About' },
]

export default function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const isAdmin = location.pathname.startsWith('/admin')

  function handleLogout() {
    localStorage.removeItem('admin_token')
    navigate('/admin/login')
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-6">

          {/* Left: logo + wordmark + nav links */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2.5 shrink-0">
              <img src={logo} alt="Esportorium" className="h-8 w-8 rounded-md" />
              <span className="text-xl font-extrabold tracking-tight text-foreground">
                Esportorium
              </span>
            </Link>

            {!isAdmin && (
              <nav className="hidden items-center gap-1 sm:flex">
                {NAV_LINKS.map(({ to, label }) => (
                  <Link
                    key={to}
                    to={to}
                    className={cn(
                      'rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground',
                      location.pathname === to
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                    )}
                  >
                    {label}
                  </Link>
                ))}
              </nav>
            )}
          </div>

          {/* Right: action buttons */}
          <nav className="flex items-center gap-3 shrink-0">
            {isAdmin ? (
              <>
                <Link to="/admin/dashboard">
                  <Button variant="ghost" size="sm">Pending</Button>
                </Link>
                <Link to="/admin/tournaments">
                  <Button variant="ghost" size="sm">Tournaments</Button>
                </Link>
                <Button variant="outline" size="sm" onClick={handleLogout}>Logout</Button>
              </>
            ) : (
              <>
                <Link to="/submit">
                  <Button variant="outline" size="sm">Submit Tournament</Button>
                </Link>
                <Link to="/admin/login">
                  <Button variant="ghost" size="sm" className="text-muted-foreground">
                    Admin
                  </Button>
                </Link>
              </>
            )}
          </nav>

        </div>
      </div>
    </header>
  )
}
