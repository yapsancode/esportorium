import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { Separator } from '@/components/ui/separator'
import { ShieldCheck, Lock } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Esportorium collects, uses, and protects your data — including organiser emails, what is public, and which third-party services we rely on.',
  alternates: { canonical: '/privacy' },
  openGraph: {
    url: 'https://esportorium.com/privacy',
    title: 'Privacy Policy — Esportorium',
    description: 'What we collect, how we use it, and what is never shown publicly.',
  },
}

const LAST_UPDATED = '18 June 2026'
const CONTACT_EMAIL = 'team.iidevstudio@gmail.com'

// Policy content as data so JSX stays clean and apostrophes are safe.
const SECTIONS: { title: string; paragraphs?: string[]; bullets?: string[] }[] = [
  {
    title: '1. Information we collect',
    paragraphs: ['We collect only what we need to list tournaments and keep the platform working.'],
    bullets: [
      'From organisers (when you submit a tournament): the tournament details (title, dates, format, venue, prize pool, registration link, etc.), your organiser name, a public contact (WhatsApp or email for players to register), a private notification email, and an optional banner image.',
      'From visitors: anonymous, cookieless usage analytics (page views and performance) and standard server logs (such as IP address and request time) used for security and reliability.',
      'Spam prevention: when you submit the form, Cloudflare Turnstile processes a verification token to confirm you are human.',
    ],
  },
  {
    title: '2. How we use your information',
    bullets: [
      'To display approved tournaments to the public.',
      'To email you about your submission (approval or rejection) using our email provider.',
      'To notify our internal admin team of new submissions — only the tournament title and organiser name are sent, never your private email.',
      'To prevent spam and abuse, and to keep the service secure and reliable.',
    ],
  },
  {
    title: '3. What is public and what is private',
    paragraphs: ['We are deliberate about this distinction:'],
    bullets: [
      'Public (shown on the listing): tournament details, your organiser name, your public registration contact, and your banner image.',
      'Private (never shown publicly): your notification email address. It is used only to contact you about your submission and is never displayed, listed, or sold.',
    ],
  },
  {
    title: '4. Third-party services we rely on',
    paragraphs: [
      'We use trusted infrastructure providers to run Esportorium. Your data may be processed by them solely to provide the service. We do not sell your data to anyone.',
    ],
    bullets: [
      'Vercel — website hosting and privacy-friendly analytics.',
      'Google Cloud Run — backend application hosting.',
      'Supabase — database storage.',
      'Cloudflare (R2 and Turnstile) — banner image storage and bot protection.',
      'Resend — delivery of approval and rejection emails.',
      'Discord — internal admin notifications (tournament title and organiser name only).',
    ],
  },
  {
    title: '5. Data retention',
    bullets: [
      'Approved tournaments remain listed until the organiser or we remove them.',
      'Rejected submissions are deleted from our database when rejected — we do not keep them.',
      'You can ask us to remove your tournament and associated data at any time (see "Your rights").',
    ],
  },
  {
    title: '6. Your rights',
    paragraphs: [
      `You can ask us to access, correct, or delete the information you submitted. Email ${CONTACT_EMAIL} with your tournament name and request, and we will action it promptly.`,
    ],
  },
  {
    title: '7. Cookies and local storage',
    bullets: [
      'We do not use tracking cookies for visitors, and our analytics is cookieless.',
      'Local storage is used only for essential functions — keeping an admin logged in, and remembering that the intro animation has played in your session.',
    ],
  },
  {
    title: '8. Contact',
    paragraphs: [
      `Questions about this policy or your data? Email ${CONTACT_EMAIL}.`,
    ],
  },
]

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-2 flex items-center gap-2">
          <Lock className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-primary">Privacy</span>
        </div>
        <h1 className="text-4xl font-extrabold text-foreground">Privacy Policy</h1>
        <p className="mt-3 text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>

        <p className="mt-6 text-muted-foreground leading-relaxed">
          Esportorium is a curated discovery platform for Malaysian esports tournaments. This policy
          explains what information we collect, how we use it, and the choices you have. We aim to
          collect as little as possible and to be transparent about the rest.
        </p>

        <Separator className="my-8" />

        <div className="space-y-8">
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h2 className="mb-3 text-lg font-bold text-foreground">{section.title}</h2>
              {section.paragraphs?.map((p, i) => (
                <p key={i} className="mb-3 text-sm text-muted-foreground leading-relaxed">{p}</p>
              ))}
              {section.bullets && (
                <ul className="space-y-2">
                  {section.bullets.map((b, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground leading-relaxed">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <Separator className="my-8" />

        <p className="rounded-lg bg-muted/60 px-5 py-4 text-xs leading-relaxed text-muted-foreground">
          This policy is provided in good faith to explain our practices in plain language. It is not
          legal advice. For formal compliance with the Malaysian Personal Data Protection Act (PDPA)
          or other regulations, please consult a qualified professional.
        </p>
      </main>

      <Footer />
    </div>
  )
}
