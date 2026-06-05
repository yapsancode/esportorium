import { useState } from 'react'
import Navbar from '@/components/Navbar'
import { Separator } from '@/components/ui/separator'
import { ChevronDown, MessageCircleQuestion } from 'lucide-react'
import { cn } from '@/lib/utils'

const FAQS = [
  {
    category: 'Submissions',
    items: [
      {
        q: "How do I submit my tournament?",
        a: "Click \"Submit Tournament\" in the navigation bar and fill in the form. Your submission will enter a pending queue and be reviewed by our admin team before going live.",
      },
      {
        q: "Do I need an account to submit?",
        a: "No. The submission form is fully public — no login or account is required. Just fill in the form and submit.",
      },
      {
        q: "How long does the review take?",
        a: "Typically 1–2 business days. You'll receive an email at the organiser email address you provided once a decision is made.",
      },
      {
        q: "Can I edit my submission after sending it?",
        a: "Not directly. If your submission is pending, contact us with the tournament name and the correction you need. Once approved, only admins can edit it.",
      },
      {
        q: "Why was my submission rejected?",
        a: "Common reasons include missing a valid registration link, dates that have already passed, or the tournament not being open to Malaysian participants. You'll receive a reason in the notification email.",
      },
    ],
  },
  {
    category: 'Listings & Visibility',
    items: [
      {
        q: "Why doesn't my approved tournament show up?",
        a: "Only approved tournaments are shown publicly. If yours was approved but isn't visible, try refreshing. If the issue persists, contact us.",
      },
      {
        q: "How is tournament status (Upcoming / Current / Past) determined?",
        a: "Status is computed from the start and end dates in real time — it's never stored manually. Upcoming means the start date is in the future; Current means today falls between start and end dates; Past means the end date has passed.",
      },
      {
        q: "My tournament is online. Will it appear when players filter by state?",
        a: "Yes. Online tournaments always appear regardless of which state filter is selected, since they're accessible from anywhere.",
      },
      {
        q: "Can I list a tournament that is not Mobile Legends?",
        a: "Not yet — the current MVP scope is Mobile Legends: Bang Bang only. Support for additional titles is planned for V2.",
      },
    ],
  },
  {
    category: 'Platform',
    items: [
      {
        q: "Is Esportorium free to use?",
        a: "Yes — completely free for both players browsing tournaments and organisers listing them. There are no fees at MVP stage.",
      },
      {
        q: "Does Esportorium handle registration?",
        a: "No. We link out to your own registration platform (Google Forms, Battlefy, etc.). Native registration is not part of the current scope.",
      },
      {
        q: "Can I get notified about new tournaments?",
        a: "Not yet. Notifications are not part of the MVP. For now, check back on the home page for new listings.",
      },
      {
        q: "I found incorrect information on a tournament listing. What do I do?",
        a: "Contact us with the tournament name and the incorrect detail. Our admin team will update or remove the listing.",
      },
    ],
  },
]

export default function QnA() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-2 flex items-center gap-2">
          <MessageCircleQuestion className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-primary">Q&amp;A</span>
        </div>
        <h1 className="text-4xl font-extrabold text-foreground">Frequently Asked Questions</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          {"Can't find what you're looking for? Reach out to us directly."}
        </p>

        <Separator className="my-8" />

        <div className="space-y-10">
          {FAQS.map((group) => (
            <section key={group.category}>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
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
      </main>
    </div>
  )
}

function Accordion({ question, answer }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-card">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
      >
        {question}
        <ChevronDown
          className={cn(
            'ml-4 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
            open && 'rotate-180'
          )}
        />
      </button>
      {open && (
        <div className="border-t border-border px-5 py-4 text-sm text-muted-foreground leading-relaxed">
          {answer}
        </div>
      )}
    </div>
  )
}
