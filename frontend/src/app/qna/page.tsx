'use client'

import { useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import JsonLd from '@/components/JsonLd'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { ChevronDown, MessageCircleQuestion, FileText, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'

const CONTACT_EMAIL = 'team.iidevstudio@gmail.com'

const FAQS = [
  {
    category: 'Submissions',
    items: [
      { q: "How do I submit my tournament?", a: "Click \"Submit Tournament\" in the navigation bar and fill in the form. Your submission will enter a pending queue and be reviewed by our admin team before going live. No account is needed." },
      { q: "Do I need an account to submit?", a: "No. The submission form is fully public — no login or account is required. Just fill in the form and submit." },
      { q: "How long does the review take?", a: "Typically 1–2 business days. You'll receive an email at the organiser email address you provided once a decision is made." },
      { q: "Can I edit my submission after sending it?", a: "Not directly through the platform. If your submission is still pending, email us at team.iidevstudio@gmail.com with the tournament name and the correction. Once a tournament is approved, only admins can edit it." },
      { q: "Why was my submission rejected?", a: "Common reasons include: missing or broken registration link, dates that have already passed, the tournament not being open to Malaysian participants, or a game other than Mobile Legends. You'll receive the specific reason in your notification email." },
      { q: "Can I resubmit after a rejection?", a: "Yes. Fix the issue mentioned in the rejection email and submit again through the same form. There is no limit on how many times you can resubmit." },
    ],
  },
  {
    category: 'Listings & Visibility',
    items: [
      { q: "Why doesn't my approved tournament show up?", a: "Only approved tournaments are shown publicly. If yours was approved but isn't visible, try a hard refresh (Ctrl+Shift+R). If the issue persists, email us at team.iidevstudio@gmail.com." },
      { q: "How is tournament status determined?", a: "Status is always computed from the start and end dates — it's never stored manually. Upcoming = start date is in the future. Current = today falls between start and end dates. Past = end date has passed." },
      { q: "My tournament is online. Will it appear when players filter by state?", a: "Yes. Online tournaments always appear regardless of the state filter selected, since they're open to participants from anywhere in Malaysia." },
      { q: "Can I list a tournament that is not Mobile Legends?", a: "Not yet. The current scope is Mobile Legends: Bang Bang only. Support for additional titles (Valorant, PUBG Mobile, etc.) is planned for V2." },
      { q: "Can I request to remove my tournament from the listing?", a: "Yes. Email team.iidevstudio@gmail.com with the tournament name and reason. We'll remove it promptly." },
    ],
  },
  {
    category: 'Platform',
    items: [
      { q: "Is Esportorium free to use?", a: "Yes — completely free for both players browsing tournaments and organisers listing them. There are no fees at the current stage." },
      { q: "Does Esportorium handle player registration?", a: "No. We link out to your own registration platform (Google Forms, Battlefy, Challonge, etc.). Native registration is not part of the current scope." },
      { q: "Can I get notified about new tournaments?", a: "Not yet. Notifications for players are not part of the current release. For now, check the home page regularly for new listings." },
      { q: "I found incorrect information on a listing. What do I do?", a: "Email us at team.iidevstudio@gmail.com with the tournament name and the incorrect detail. We'll update or remove the listing as quickly as possible." },
      { q: "Is Esportorium available as a mobile app?", a: "Not yet. The web platform is mobile-responsive, but a native app is planned for a later version." },
    ],
  },
  {
    category: 'Trust & Privacy',
    items: [
      { q: "Where do the tournament listings come from?", a: "Every listing is submitted by its organiser through our public form — we don't scrape, auto-aggregate, or copy tournaments from other sites. A human reviews each submission before it goes live." },
      { q: "How do you verify a tournament before listing it?", a: "We check that the registration link works, the dates are valid and not already passed, the tournament is Mobile Legends and relevant to Malaysian players, and that the organiser appears legitimate and contactable. You can read the full methodology on our About page. Note: we can't independently guarantee every detail (such as exact prize amounts), so always confirm specifics with the organiser." },
      { q: "Is my organiser email shown publicly?", a: "No. The email you provide for approval notifications is private and admin-only — it is never displayed on the site, included in our public data, or sold. The contact you provide for players to register (WhatsApp or email) is shown publicly, because that's how participants reach you to sign up." },
      { q: "What data do you collect about me?", a: "From organisers: your submission details, organiser name, public registration contact, a private notification email, and an optional banner image. From visitors: anonymous, cookieless usage analytics. Full details are on our Privacy page." },
      { q: "Can I have my tournament and data removed?", a: "Yes. Email team.iidevstudio@gmail.com with the tournament name and we'll remove it promptly. Rejected submissions are deleted automatically; approved listings are removed on request." },
      { q: "Do you sell my data?", a: "No — never. We use trusted infrastructure providers (hosting, email delivery, image storage, bot protection) solely to run the platform. We don't sell or rent your data to anyone. See our Privacy page for the list of services we rely on." },
    ],
  },
]

const FAQ_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": FAQS.flatMap((group) =>
    group.items.map((item) => ({
      "@type": "Question",
      "name": item.q,
      "acceptedAnswer": { "@type": "Answer", "text": item.a },
    }))
  ),
}

export default function QnA() {
  return (
    <div className="min-h-screen bg-background">
      <JsonLd schema={FAQ_SCHEMA} />
      <Navbar />

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-2 flex items-center gap-2">
          <MessageCircleQuestion className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-primary">Q&amp;A</span>
        </div>
        <h1 className="text-4xl font-extrabold text-foreground">Frequently Asked Questions</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          {"Can't find what you're looking for? "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary font-medium hover:underline">
            Reach out to us directly.
          </a>
        </p>

        <Separator className="my-8" />

        <div className="space-y-10">
          {FAQS.map((group) => (
            <section key={group.category}>
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {group.category}
              </h2>
              <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
                {group.items.map((item) => (
                  <Accordion key={item.q} question={item.q} answer={item.a} />
                ))}
              </div>
            </section>
          ))}
        </div>

        <Separator className="my-10" />

        <section className="rounded-xl bg-muted p-8 text-center">
          <MessageCircleQuestion className="mx-auto mb-3 h-8 w-8 text-primary" />
          <h2 className="mb-1 text-xl font-bold">Still have questions?</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Check the full platform guide, or drop us an email and we'll get back to you within a business day.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/docs">
              <Button variant="outline" className="gap-2">
                <FileText className="h-4 w-4" /> Read the Docs
              </Button>
            </Link>
            <a href={`mailto:${CONTACT_EMAIL}`}>
              <Button className="gap-2">
                <Mail className="h-4 w-4" /> Email Us
              </Button>
            </a>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">{CONTACT_EMAIL}</p>
        </section>
      </main>
    </div>
  )
}

function Accordion({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-card">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
        aria-expanded={open}
      >
        <span>{question}</span>
        <ChevronDown className={cn('ml-4 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="border-t border-border px-5 py-4 text-sm text-muted-foreground leading-relaxed">
          {answer}
        </div>
      )}
    </div>
  )
}
