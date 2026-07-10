import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import JsonLd from '@/components/JsonLd'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Trophy, MapPin, Users, Zap, Info, Code, ExternalLink, ShieldCheck, CheckCircle2 } from 'lucide-react'

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
  {
    label: 'Available now',
    status: 'live',
    items: [
      'Browse & discover Mobile Legends tournaments',
      'Filter by status, format & Malaysian state',
      'Shareable tournament pages with registration links',
      'Free organiser submissions — no account needed',
      'Every listing human-reviewed before it goes live',
    ],
  },
  {
    label: 'Coming next',
    status: 'next',
    items: [
      'Organiser accounts & dashboard',
      'AI-assisted submission — paste a poster or message, we structure it',
      'More games — Valorant & PUBG Mobile',
      'Malaysia map view',
      'Tournament bracket display',
      'Match notifications for players',
    ],
  },
  {
    label: 'Later',
    status: 'later',
    items: [
      'Native registration flow',
      'Player profiles',
      'Featured listings for organisers',
      'Mobile app',
    ],
  },
]

const ORG_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Esportorium",
  "url": "https://esportorium.com",
  "logo": {
    "@type": "ImageObject",
    "url": "https://esportorium.com/esportorium-logo.png",
  },
  "description": "Malaysia's curated esports tournament discovery platform for Mobile Legends.",
  "email": "team.iidevstudio@gmail.com",
  "foundingDate": "2025",
  "areaServed": {
    "@type": "Country",
    "name": "Malaysia",
    "sameAs": "https://www.wikidata.org/wiki/Q833",
  },
  "knowsAbout": [
    "Mobile Legends: Bang Bang",
    "Esports",
    "Gaming Tournaments",
    "Malaysia Esports",
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "email": "team.iidevstudio@gmail.com",
    "contactType": "customer support",
    "areaServed": "MY",
    "availableLanguage": ["English", "Malay"],
  },
  "sameAs": [
    "https://discord.gg/XufVXcbS",
    "https://t.me/esportorium",
  ],
}

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <JsonLd schema={ORG_SCHEMA} />
      <Navbar />

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">

        <div className="mb-10 flex flex-col items-center text-center">
          <Image src="/esportorium-logo.png" alt="Esportorium" width={80} height={80} className="mb-5 h-20 w-20 rounded-2xl shadow-md" />
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
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold">How We Source &amp; Verify Tournaments</h2>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            Every tournament on Esportorium is <strong className="text-foreground">submitted by its organiser</strong> —
            we do not scrape, auto-aggregate, or copy listings from other sites. Before anything goes live,
            a human reviews it. Here is what we check on every submission:
          </p>
          <ul className="mt-5 space-y-3">
            {[
              ['Registration link works', 'We open the link and confirm it leads to a real, working registration page.'],
              ['Dates make sense', 'Start, end, and deadline dates are valid and the event has not already passed.'],
              ['Fits our scope', 'It is a Mobile Legends tournament relevant to players in Malaysia.'],
              ['Organiser looks legitimate', 'We do a basic check that the organiser and event appear genuine and contactable.'],
            ].map(([title, desc]) => (
              <li key={title} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span className="text-sm text-muted-foreground">
                  <strong className="text-foreground">{title}.</strong> {desc}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-muted-foreground leading-relaxed">
            Tournament <strong className="text-foreground">status</strong> (upcoming, current, past) is never set by
            hand — it is calculated automatically from the start and end dates, so it is always accurate.
          </p>
          <p className="mt-4 rounded-lg bg-muted/60 px-5 py-4 text-sm leading-relaxed text-muted-foreground">
            <strong className="text-foreground">Being transparent about the limits:</strong> our review confirms a
            listing is legitimate and correctly scoped, but we cannot independently guarantee every detail — such
            as exact prize amounts or that an event will run exactly as described. If you spot something wrong,{' '}
            <a href="mailto:team.iidevstudio@gmail.com" className="text-primary hover:underline">tell us</a> and we
            will update or remove it quickly.
          </p>
        </section>

        <Separator className="my-10" />

        <section className="mb-12">
          <h2 className="mb-6 text-2xl font-bold">Roadmap</h2>
          <div className="space-y-6">
            {ROADMAP.map((group, i) => (
              <div key={group.label} className="flex gap-5">
                <div className="flex flex-col items-center">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${group.status === 'live' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    {group.status === 'live'
                      ? <CheckCircle2 className="h-5 w-5" />
                      : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                  </div>
                  {i < ROADMAP.length - 1 && <div className="mt-1 flex-1 w-px bg-border" />}
                </div>
                <div className="pb-6">
                  <h3 className="mb-2 font-semibold">{group.label}</h3>
                  <ul className="space-y-1">
                    {group.items.map((item) => (
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
