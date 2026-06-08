'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { FileText, CheckCircle, Clock, Link as LinkIcon, Image, AlertCircle, ArrowRight, MessageCircleQuestion } from 'lucide-react'
import { cn } from '@/lib/utils'

const CONTACT_EMAIL = 'team.iidevstudio@gmail.com'

const sections = [
  { id: 'overview',     label: 'Overview' },
  { id: 'eligibility', label: 'Eligibility' },
  { id: 'submission',  label: 'How to Submit' },
  { id: 'after',       label: 'After Submission' },
  { id: 'images',      label: 'Image Guidelines' },
  { id: 'fields',      label: 'Field Reference' },
]

export default function Documentation() {
  const [activeSection, setActiveSection] = useState('overview')

  useEffect(() => {
    const observers = sections.map(({ id }) => {
      const el = document.getElementById(id)
      if (!el) return null
      const observer = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(id) },
        { rootMargin: '-15% 0px -65% 0px', threshold: 0 }
      )
      observer.observe(el)
      return observer
    })
    return () => observers.forEach((obs) => obs?.disconnect())
  }, [])

  return (
    <>
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex gap-12">

          <aside className="hidden w-52 shrink-0 lg:block">
            <div className="sticky top-24">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                On this page
              </p>
              <nav className="flex flex-col gap-0.5">
                {sections.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className={cn(
                      'rounded-md px-3 py-1.5 text-sm transition-colors',
                      activeSection === s.id
                        ? 'bg-muted font-medium text-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {s.label}
                  </a>
                ))}
              </nav>

              <Separator className="my-5" />

              <div className="space-y-1">
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  More
                </p>
                <Link href="/qna" className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                  <MessageCircleQuestion className="h-3.5 w-3.5" /> Q&amp;A
                </Link>
                <Link href="/submit" className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                  <ArrowRight className="h-3.5 w-3.5" /> Submit Tournament
                </Link>
              </div>
            </div>
          </aside>

          <main className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-primary">Documentation</span>
            </div>
            <h1 className="text-4xl font-extrabold text-foreground">Platform Guide</h1>
            <p className="mt-3 text-lg text-muted-foreground">
              Everything you need to know about listing and discovering esports tournaments on Esportorium.
            </p>

            <Separator className="my-8" />

            <section id="overview" className="scroll-mt-24">
              <h2 className="mb-4 text-2xl font-bold">Overview</h2>
              <p className="leading-relaxed text-muted-foreground">
                Esportorium is Malaysia's curated esports tournament discovery platform. Players can
                browse upcoming, ongoing, and past tournaments. Tournament organisers can submit
                their events for listing — all submissions go through an admin review before
                going live.
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {[
                  { icon: <CheckCircle className="h-5 w-5 text-green-600" />, title: 'Curated', desc: 'Every tournament is reviewed before it appears publicly.' },
                  { icon: <Clock className="h-5 w-5 text-blue-600" />, title: 'Up to date', desc: 'Status is derived from dates — always accurate.' },
                  { icon: <LinkIcon className="h-5 w-5 text-primary" />, title: 'Link out', desc: 'Registration stays on your own platform — we just list it.' },
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

            <section id="eligibility" className="scroll-mt-24">
              <h2 className="mb-4 text-2xl font-bold">Eligibility</h2>
              <p className="mb-5 text-muted-foreground">
                To be listed on Esportorium, your tournament must meet all of the following criteria:
              </p>
              <ul className="space-y-3">
                {[
                  'Tournament must be open to Malaysian participants.',
                  'Game must be Mobile Legends: Bang Bang (other titles coming in V2).',
                  'Tournament must have a defined start date, end date, and registration deadline.',
                  'A valid external registration link is required (Google Form, Battlefy, etc.).',
                  'Organisers must provide a contact method (WhatsApp number or email).',
                  'Registration deadline must fall on or before the tournament start date.',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-5 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
                <strong>Note:</strong> Submissions that do not meet these criteria will be rejected.
                You will receive an email notification with the reason.
              </div>
            </section>

            <Separator className="my-10" />

            <section id="submission" className="scroll-mt-24">
              <h2 className="mb-4 text-2xl font-bold">How to Submit</h2>
              <p className="mb-6 text-muted-foreground">
                No account is needed. The submission form is fully public.
              </p>
              <ol className="space-y-6">
                {[
                  { step: '1', title: 'Go to Submit Tournament', desc: 'Click the "Submit Tournament" button in the navigation bar, or visit /submit directly.' },
                  { step: '2', title: 'Fill in tournament details', desc: 'Complete all required fields — name, format, dates, prize pool, max teams, and registration link. See the Field Reference below for notes on each field.' },
                  { step: '3', title: 'Add organiser info', desc: 'Provide your organiser name, a contact method (WhatsApp or email), and the email address where you want to receive the approval notification.' },
                  { step: '4', title: '(Optional) Upload a banner', desc: 'Upload a landscape banner image. Recommended: 1280×720 px (16:9), JPG or PNG, max 5 MB.' },
                  { step: '5', title: 'Submit for review', desc: "Your submission enters the pending queue. An admin will review it within 1–2 business days and you'll receive an email once a decision is made." },
                ].map((item) => (
                  <li key={item.step} className="flex gap-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                      {item.step}
                    </div>
                    <div>
                      <p className="font-semibold">{item.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <Separator className="my-10" />

            <section id="after" className="scroll-mt-24">
              <h2 className="mb-4 text-2xl font-bold">After Submission</h2>
              <p className="mb-5 text-muted-foreground">
                Once submitted, your tournament enters the pending queue. Here's what happens next:
              </p>
              <div className="space-y-4">
                {[
                  { status: 'Pending',  color: 'pending', desc: 'Your submission is in the review queue. Typically reviewed within 1–2 business days.' },
                  { status: 'Approved', color: 'current', desc: "Your tournament is now live and publicly visible. You'll receive a notification at the organiser email you provided." },
                  { status: 'Rejected', color: 'past',    desc: "Your submission didn't meet the listing criteria. The notification email will include the reason. You may resubmit after addressing the issue." },
                ].map((item) => (
                  <div key={item.status} className="flex items-start gap-4 rounded-lg border border-border p-4">
                    <Badge variant={item.color as any} className="mt-0.5 shrink-0">{item.status}</Badge>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            <Separator className="my-10" />

            <section id="images" className="scroll-mt-24">
              <h2 className="mb-4 text-2xl font-bold">Image Guidelines</h2>
              <p className="mb-5 text-muted-foreground">
                Banner images are optional but strongly recommended — they make your listing stand out.
              </p>
              <div className="rounded-lg border border-border p-5 space-y-3">
                {[
                  { icon: <Image className="h-4 w-4 text-muted-foreground" />, label: 'Accepted formats', value: 'JPG, JPEG, PNG' },
                  { icon: <CheckCircle className="h-4 w-4 text-green-600" />, label: 'Aspect ratio', value: '16:9 (landscape only)' },
                  { icon: <CheckCircle className="h-4 w-4 text-green-600" />, label: 'Recommended resolution', value: '1280 × 720 px' },
                  { icon: <AlertCircle className="h-4 w-4 text-yellow-600" />, label: 'Maximum file size', value: '5 MB' },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">{row.icon} {row.label}</div>
                    <span className="font-medium">{row.value}</span>
                  </div>
                ))}
              </div>
            </section>

            <Separator className="my-10" />

            <section id="fields" className="scroll-mt-24">
              <h2 className="mb-4 text-2xl font-bold">Field Reference</h2>
              <p className="mb-5 text-muted-foreground">
                A complete list of all submission form fields, whether they are required, and what to enter.
              </p>
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Field</th>
                      <th className="px-4 py-3 text-left font-semibold">Required</th>
                      <th className="px-4 py-3 text-left font-semibold">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {[
                      ['Tournament Name',        'Yes',        'Keep it concise and descriptive. Include the season or year if applicable.'],
                      ['Format',                 'Yes',        'Online or Offline.'],
                      ['State',                  'If offline', 'The Malaysian state where the event is held.'],
                      ['Venue',                  'If offline', 'Full venue name and address.'],
                      ['Start Date',             'Yes',        'The first day of the tournament.'],
                      ['End Date',               'Yes',        'The last day of the tournament.'],
                      ['Registration Deadline',  'Yes',        'Must be on or before the start date.'],
                      ['Prize Pool (RM)',         'Yes',        'Cash prize in Ringgit Malaysia. Enter 0 if there is no cash prize.'],
                      ['Additional Prizes',      'No',         'e.g. Trophy, Jersey, Vouchers — comma-separated. Leave blank if none.'],
                      ['Max Teams',              'Yes',        'Total team slots available for this tournament.'],
                      ['Registration Link',      'Yes',        'External URL players click to register (Google Form, Battlefy, Challonge, etc.).'],
                      ['Banner Image',           'No',         '16:9 landscape image, JPG or PNG, max 5 MB.'],
                      ['Organiser Name',         'Yes',        'Your team, club, or company name.'],
                      ['Organiser Contact',      'Yes',        'WhatsApp number (with country code) or email address.'],
                      ['Organiser Email',        'Yes',        'Used to send the approval or rejection notification. Not shown publicly.'],
                    ].map(([field, required, notes]) => (
                      <tr key={field} className="hover:bg-muted/40">
                        <td className="px-4 py-3 font-medium">{field}</td>
                        <td className="px-4 py-3">
                          <Badge variant={required === 'Yes' ? 'default' : required === 'No' ? 'secondary' : 'outline'} className="text-xs">
                            {required}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <Separator className="my-10" />

            <section className="rounded-xl bg-muted p-8">
              <h2 className="mb-1 text-xl font-bold">Need more help?</h2>
              <p className="mb-6 text-muted-foreground text-sm">
                Browse common questions, or reach out to us directly at{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline font-medium">
                  {CONTACT_EMAIL}
                </a>.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/qna">
                  <Button variant="outline" className="gap-2">
                    <MessageCircleQuestion className="h-4 w-4" /> View Q&amp;A
                  </Button>
                </Link>
                <Link href="/submit">
                  <Button className="gap-2">
                    Submit a Tournament <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
    <Footer />
    </>
  )
}
