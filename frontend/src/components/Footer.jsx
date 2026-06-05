import { Link } from 'react-router-dom'
import { Separator } from '@/components/ui/separator'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-16 border-t border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">

        {/* Legal disclaimer */}
        <div className="mb-8 rounded-lg bg-muted/60 px-5 py-4">
          <p className="text-xs leading-relaxed text-muted-foreground">
            <strong className="font-semibold text-foreground">Disclaimer:</strong>{' '}
            Esportorium is an open discovery platform. We list tournaments for informational
            purposes only and do not host, organise, or guarantee any listed events. Tournament
            details (including prize pools and registration deadlines) are provided by organisers
            and have not been independently verified. Players participate at their own risk.
            Esportorium is not liable for any disputes arising from listed events.
          </p>
        </div>

        <Separator className="mb-8" />

        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          {/* Brand */}
          <div>
            <p className="font-extrabold tracking-tight text-foreground">Esportorium</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Malaysia's curated esports tournament platform.
            </p>
          </div>

          {/* Links */}
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
            <Link to="/submit" className="hover:text-foreground transition-colors">Submit</Link>
            <Link to="/docs" className="hover:text-foreground transition-colors">Docs</Link>
            <Link to="/qna" className="hover:text-foreground transition-colors">Q&amp;A</Link>
            <Link to="/about" className="hover:text-foreground transition-colors">About</Link>
            <a href="mailto:team.iidevstudio@gmail.com" className="hover:text-foreground transition-colors">
              Contact
            </a>
          </nav>
        </div>

        <p className="mt-8 text-xs text-muted-foreground">
          &copy; {year} Esportorium · Built by{' '}
          <a
            href="https://www.iidevstudio.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            iidev Studio
          </a>
        </p>
      </div>
    </footer>
  )
}
