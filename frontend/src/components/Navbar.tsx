'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Menu, X } from 'lucide-react'

const NAV_LINKS = [
  { to: '/docs',  label: 'Docs'  },
  { to: '/qna',   label: 'Q&A'   },
  { to: '/about', label: 'About' },
]

export default function Navbar() {
  const pathname  = usePathname()
  const router    = useRouter()
  const isAdmin   = pathname?.startsWith('/admin') ?? false
  const [open, setOpen] = useState(false)

  function handleLogout() {
    localStorage.removeItem('admin_token')
    router.push('/admin/login')
    setOpen(false)
  }

  const close = () => setOpen(false)

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">

          {/* Logo — always visible */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0" onClick={close}>
            <img src="/esportorium-logo.png" alt="Esportorium" className="h-8 w-8 rounded-md" />
            <span className="text-xl font-extrabold tracking-tight text-foreground">
              Esportorium
            </span>
          </Link>

          {/* Desktop centre nav (non-admin only) */}
          {!isAdmin && (
            <nav className="hidden items-center gap-1 sm:flex">
              {NAV_LINKS.map(({ to, label }) => (
                <Link
                  key={to}
                  href={to}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground',
                    pathname === to ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {label}
                </Link>
              ))}
            </nav>
          )}

          {/* Desktop right nav — hidden on mobile, replaced by hamburger */}
          <nav className="hidden items-center gap-3 shrink-0 sm:flex">
            {isAdmin ? (
              <>
                <Link href="/admin/dashboard"><Button variant="ghost" size="sm">Pending</Button></Link>
                <Link href="/admin/tournaments"><Button variant="ghost" size="sm">Tournaments</Button></Link>
                <Button variant="outline" size="sm" onClick={handleLogout}>Logout</Button>
              </>
            ) : (
              <>
                <Link href="/submit"><Button variant="outline" size="sm">Submit Tournament</Button></Link>
                <Link href="/admin/login">
                  <Button variant="ghost" size="sm" className="text-muted-foreground">Admin</Button>
                </Link>
              </>
            )}
          </nav>

          {/* Hamburger — visible on mobile only */}
          <button
            onClick={() => setOpen(prev => !prev)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            className="flex items-center justify-center rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

        </div>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="border-t border-border bg-background sm:hidden">
          <div className="mx-auto max-w-6xl space-y-1 px-4 py-3">
            {isAdmin ? (
              <>
                <MobileLink href="/admin/dashboard"   label="Pending"       onClick={close} />
                <MobileLink href="/admin/tournaments" label="Tournaments"   onClick={close} />
                <button
                  onClick={handleLogout}
                  className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                {NAV_LINKS.map(({ to, label }) => (
                  <MobileLink key={to} href={to} label={label} onClick={close} active={pathname === to} />
                ))}
                <div className="border-t border-border pt-2 space-y-1">
                  <MobileLink href="/submit" label="Submit Tournament" onClick={close} primary />
                  <MobileLink href="/admin/login" label="Admin" onClick={close} />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

function MobileLink({
  href, label, onClick, primary = false, active = false,
}: {
  href: string
  label: string
  onClick: () => void
  primary?: boolean
  active?: boolean
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'block w-full rounded-md px-3 py-2 text-sm font-medium transition-colors',
        primary
          ? 'bg-primary text-primary-foreground hover:bg-primary/90'
          : active
            ? 'bg-muted text-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      {label}
    </Link>
  )
}
