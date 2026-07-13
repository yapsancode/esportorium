'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useLang, type Lang } from '@/lib/i18n'
import { Menu, X } from 'lucide-react'

// `floating` renders the navbar as a rounded pill hovering over the page
// (used on the landing page, over the scenic background) instead of the
// default full-width sticky bar.
export default function Navbar({ floating = false }: { floating?: boolean }) {
  const pathname    = usePathname()
  const router      = useRouter()
  const { t }       = useLang()
  const isAdmin     = pathname?.startsWith('/admin') ?? false
  const isOrganiser = pathname?.startsWith('/organiser') ?? false
  const [open, setOpen] = useState(false)

  const NAV_LINKS = [
    { to: '/tournaments', label: t.nav.tournaments },
    { to: '/docs',  label: t.nav.docs  },
    { to: '/qna',   label: t.nav.qna   },
    { to: '/about', label: t.nav.about },
  ]

  function handleLogout() {
    localStorage.removeItem('admin_token')
    router.push('/admin/login')
    setOpen(false)
  }

  function handleOrganiserLogout() {
    localStorage.removeItem('organiser_token')
    router.push('/organiser/login')
    setOpen(false)
  }

  const close = () => setOpen(false)

  return (
    <header
      className={cn(
        floating
          ? 'absolute inset-x-0 top-4 z-40 px-4 sm:top-6 sm:px-6'
          : 'sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur'
      )}
    >
      <div
        className={cn(
          floating
            ? 'mx-auto max-w-5xl rounded-2xl border border-white/60 bg-background/90 px-4 shadow-lg shadow-black/5 backdrop-blur-md sm:px-6'
            : 'mx-auto max-w-6xl px-4 sm:px-6 lg:px-8'
        )}
      >
        <div className={cn('flex items-center justify-between gap-4', floating ? 'h-14' : 'h-16')}>

          {/* Logo — always visible */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0" onClick={close}>
            <Image src="/esportorium-logo.png" alt="Esportorium" width={32} height={32} className="h-8 w-8 rounded-md" />
            <span className="text-xl font-extrabold tracking-tight text-foreground">
              Esportorium
            </span>
          </Link>

          {/* Desktop centre nav (public pages only) */}
          {!isAdmin && !isOrganiser && (
            <nav className="hidden items-center gap-1 lg:flex">
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
          <nav className="hidden items-center gap-3 shrink-0 lg:flex">
            {isAdmin ? (
              <>
                <Link href="/admin/dashboard"><Button variant="ghost" size="sm">{t.nav.pending}</Button></Link>
                <Link href="/admin/tournaments"><Button variant="ghost" size="sm">{t.nav.tournaments}</Button></Link>
                <Button variant="outline" size="sm" onClick={handleLogout}>{t.common.logout}</Button>
              </>
            ) : isOrganiser ? (
              <>
                <Link href="/organiser/dashboard"><Button variant="ghost" size="sm">{t.nav.myTournaments}</Button></Link>
                <Link href="/organiser/tournaments/new"><Button size="sm">{t.nav.newTournament}</Button></Link>
                <Button variant="outline" size="sm" onClick={handleOrganiserLogout}>{t.common.logout}</Button>
              </>
            ) : (
              <>
                <Link href="/submit"><Button variant="outline" size="sm">{t.nav.submitTournament}</Button></Link>
                <Link href="/organiser/login"><Button variant="ghost" size="sm">{t.nav.organisers}</Button></Link>
                <Link href="/admin/login">
                  <Button variant="ghost" size="sm" className="text-muted-foreground">{t.nav.admin}</Button>
                </Link>
              </>
            )}
            <LanguageToggle />
          </nav>

          {/* Hamburger — visible on mobile only */}
          <button
            onClick={() => setOpen(prev => !prev)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            className="flex items-center justify-center rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

        </div>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div
          className={cn(
            'lg:hidden',
            floating
              ? 'mx-auto mt-2 max-w-5xl rounded-2xl border border-white/60 bg-background/95 shadow-lg shadow-black/5 backdrop-blur-md'
              : 'border-t border-border bg-background'
          )}
        >
          <div className="mx-auto max-w-6xl space-y-1 px-4 py-3">
            {isAdmin ? (
              <>
                <MobileLink href="/admin/dashboard"   label={t.nav.pending}       onClick={close} />
                <MobileLink href="/admin/tournaments" label={t.nav.tournaments}   onClick={close} />
                <button
                  onClick={handleLogout}
                  className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {t.common.logout}
                </button>
              </>
            ) : isOrganiser ? (
              <>
                <MobileLink href="/organiser/dashboard"        label={t.nav.myTournaments} onClick={close} />
                <MobileLink href="/organiser/tournaments/new"  label={t.nav.newTournament} onClick={close} primary />
                <button
                  onClick={handleOrganiserLogout}
                  className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {t.common.logout}
                </button>
              </>
            ) : (
              <>
                {NAV_LINKS.map(({ to, label }) => (
                  <MobileLink key={to} href={to} label={label} onClick={close} active={pathname === to} />
                ))}
                <div className="border-t border-border pt-2 space-y-1">
                  <MobileLink href="/submit" label={t.nav.submitTournament} onClick={close} primary />
                  <MobileLink href="/organiser/login" label={t.nav.organisers} onClick={close} />
                  <MobileLink href="/admin/login" label={t.nav.admin} onClick={close} />
                </div>
              </>
            )}

            {/* Language toggle — always present at the bottom of the mobile menu */}
            <div className="border-t border-border pt-3">
              <div className="flex items-center justify-between px-3">
                <span className="text-sm font-medium text-muted-foreground">{t.nav.languageLabel}</span>
                <LanguageToggle />
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

// EN / BM segmented switch. Persists via the LanguageProvider (localStorage).
function LanguageToggle() {
  const { lang, setLang } = useLang()
  const options: { value: Lang; label: string }[] = [
    { value: 'en', label: 'EN' },
    { value: 'ms', label: 'BM' },
  ]
  return (
    <div
      role="group"
      aria-label="Language"
      className="inline-flex shrink-0 items-center rounded-full border border-border bg-background/80 p-0.5"
    >
      {options.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => setLang(value)}
          aria-pressed={lang === value}
          className={cn(
            'rounded-full px-2.5 py-1 text-xs font-semibold transition-colors',
            lang === value
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {label}
        </button>
      ))}
    </div>
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
