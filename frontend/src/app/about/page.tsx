import type { Metadata } from 'next'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import JsonLd from '@/components/JsonLd'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Trophy, MapPin, Users, Zap, Info, Code, ExternalLink } from 'lucide-react'

export const metadata: Metadata = {
  title: 'About Esportorium — Malaysia Esports Tournament Platform',
  description: "Learn about Esportorium — Malaysia's curated esports tournament discovery platform. Our mission, what we stand for, and the roadmap ahead.",
  alternates: { canonical: '/about' },
  openGraph: {
    url: 'https://esportorium.com/about',
    title: 'About Esportorium',
    description: "Malaysia's curated esports tournament discovery platform — built for players who want to compete, and organisers who want to be found.",
  },
}

const ROADMAP = [
  { phase: 'MVP', status: 'current',  items: ['Mobile Legends tournaments', 'Public browse & discovery', 'Organiser submission form', 'Admin review panel', 'Cloudflare R2 banner hosting'] },
  { phase: 'V2',  status: 'upcoming', items: ['Organiser accounts & login', 'Additional games (Valorant, PUBG Mobile)', 'Malaysia map view', 'Email notifications to players', 'Tournament bracket display'] },
  { phase: 'V3',  status: 'upcoming', items: ['Native registration flow', 'Player profiles', 'Monetisation & featured listings', 'Mobile app'] },
]

const ORG_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Esportorium",
  "url": "https://esportorium.com",
  "logo": "https://esportorium.com/android-chrome-512x512.png",
  "description": "Malaysia's curated esports tournament discovery platform for Mobile Legends.",
  "email": "team.iidevstudio@gmail.com",
  "foundingDate": "2025",
  "areaServed": "MY",
  "sameAs": [],
}

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <JsonLd schema={ORG_SCHEMA} />
      <Navbar />

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">

        <div className="mb-10 flex flex-col items-center text-center">
          <img src="/esportorium-logo.png" alt="Esportorium" className="mb-5 h-20 w-20 rounded-2xl shadow-md" />
          <div className="mb-2 flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">About</span>
          </div>
          <h1 className="text-4xl font-extrabold text-foreground sm:text-5xl">Esportorium</h1>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground">
            Malaysia's dedicated esports tournament discovery platform — built for players who want to compete,
            and organisers who want to be found.
          </p>
        </div>

        <Separator className="my-8" />

        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-bold">Our Mission</h2>
          <p className="text-muted-foreground leading-relaxed">
            The Malaysian esports scene is thriving, but tournament information is scattered across
            Telegram groups, social media posts, and word-of-mouth. Esportorium exists to solve that —
            a single, clean, curated space where every serious player can discover what's happening
            and every organiser can get their event in front of the right audience.
          </p>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            We keep the bar high. Every listing is reviewed before it goes live, so players always
            see legitimate, accurate tournament information.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 text-2xl font-bold">What We Stand For</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: <Trophy className="h-5 w-5 text-primary" />, title: 'Competitive first', desc: "Every feature is designed with the player and organiser in mind — not casual gaming blogs or news." },
              { icon: <MapPin className="h-5 w-5 text-primary" />, title: 'Malaysia focused', desc: "We're not trying to be global. Deep, accurate coverage of the Malaysian esports ecosystem is the goal." },
              { icon: <Users className="h-5 w-5 text-primary" />, title: 'Organiser friendly', desc: "No fees, no accounts, no hassle. Submit a form, get reviewed, go live. That's it." },
              { icon: <Zap className="h-5 w-5 text-primary" />, title: 'Fast & minimal', desc: "The platform is intentionally lean — no clutter, no distractions. Just tournaments, well presented." },
            ].map((item) => (
              <Card key={item.title}>
                <CardContent className="pt-5">
                  <div className="mb-2 flex items-center gap-2">
                    {item.icon}
                    <span className="font-semibold">{item.title}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Separator className="my-10" />

        <section className="mb-12">
          <h2 className="mb-6 text-2xl font-bold">Roadmap</h2>
          <div className="space-y-6">
            {ROADMAP.map((phase) => (
              <div key={phase.phase} className="flex gap-5">
                <div className="flex flex-col items-center">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${phase.status === 'current' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    {phase.phase}
                  </div>
                  <div className="mt-1 flex-1 w-px bg-border" />
                </div>
                <div className="pb-6">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="font-semibold">{phase.phase}</span>
                    <Badge variant={phase.status === 'current' ? 'current' : 'secondary' as any} className="text-xs">
                      {phase.status === 'current' ? 'In progress' : 'Planned'}
                    </Badge>
                  </div>
                  <ul className="space-y-1">
                    {phase.items.map((item) => (
                      <li key={item} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-border" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>

        <Separator className="my-10" />

        <section className="mb-12">
          <Card className="overflow-hidden border-border/50">
            <CardContent className="flex flex-col items-center gap-4 py-8 text-center sm:flex-row sm:items-start sm:text-left sm:gap-6">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Code className="h-7 w-7 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">Built &amp; maintained by</p>
                <h3 className="text-lg font-bold text-foreground">iidev Studio</h3>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed max-w-lg">
                  Helping Malaysian businesses grow with digitalisation — high-performance websites, e-commerce platforms, and digital solutions.
                </p>
                <a href="https://www.iidevstudio.com" target="_blank" rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                  Visit iidevstudio.com <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="rounded-xl bg-muted p-8 text-center">
          <h2 className="mb-2 text-xl font-bold">Have a tournament to list?</h2>
          <p className="mb-6 text-muted-foreground">Submissions are free and take less than 5 minutes.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/submit"><Button>Submit a Tournament</Button></Link>
            <Link href="/docs"><Button variant="outline">Read the Docs</Button></Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
