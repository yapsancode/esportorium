import Navbar from '@/components/Navbar'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { FileText, CheckCircle, Clock, Image, Link, AlertCircle } from 'lucide-react'

const sections = [
  { id: 'overview',     label: 'Overview' },
  { id: 'eligibility', label: 'Eligibility' },
  { id: 'submission',  label: 'How to Submit' },
  { id: 'after',       label: 'After Submission' },
  { id: 'images',      label: 'Image Guidelines' },
  { id: 'fields',      label: 'Field Reference' },
]

export default function Documentation() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex gap-12">

          {/* Sidebar */}
          <aside className="hidden w-52 shrink-0 lg:block">
            <div className="sticky top-24">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                On this page
              </p>
              <nav className="flex flex-col gap-1">
                {sections.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {s.label}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Content */}
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

            {/* Overview */}
            <section id="overview" className="scroll-mt-24">
              <h2 className="mb-4 text-2xl font-bold">Overview</h2>
              <p className="text-muted-foreground leading-relaxed">
                Esportorium is Malaysia's curated esports tournament discovery platform. Players can
                browse upcoming, ongoing, and past tournaments. Tournament organisers can submit
                their events for listing — all submissions go through an admin review before
                going live.
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {[
                  { icon: <CheckCircle className="h-5 w-5 text-green-600" />, title: 'Curated', desc: 'Every tournament is reviewed before it appears publicly.' },
                  { icon: <Clock className="h-5 w-5 text-blue-600" />, title: 'Up to date', desc: 'Status is derived from dates — always accurate.' },
                  { icon: <Link className="h-5 w-5 text-primary" />, title: 'Link out', desc: 'Registration stays on your own platform — we just list it.' },
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

            {/* Eligibility */}
            <section id="eligibility" className="scroll-mt-24">
              <h2 className="mb-4 text-2xl font-bold">Eligibility</h2>
              <ul className="space-y-3">
                {[
                  'Tournament must be open to Malaysian participants.',
                  'Game must be Mobile Legends: Bang Bang (other titles coming in V2).',
                  'Tournament must have a defined start date, end date, and registration deadline.',
                  'A valid external registration link is required.',
                  'Organisers must provide a contact method (WhatsApp number or email).',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <Separator className="my-10" />

            {/* How to Submit */}
            <section id="submission" className="scroll-mt-24">
              <h2 className="mb-4 text-2xl font-bold">How to Submit</h2>
              <ol className="space-y-6">
                {[
                  { step: '1', title: 'Go to Submit Tournament', desc: 'Click the "Submit Tournament" button in the navigation bar, or visit /submit directly.' },
                  { step: '2', title: 'Fill in tournament details', desc: 'Complete all required fields — name, format, dates, prize pool, max teams, and registration link.' },
                  { step: '3', title: 'Add organiser info', desc: 'Provide your organiser name, WhatsApp or email contact, and the email address where you want to receive the approval notification.' },
                  { step: '4', title: '(Optional) Upload a banner', desc: 'Upload a landscape banner image. Recommended size: 1280×720 px (16:9). JPG or PNG, max 5 MB.' },
                  { step: '5', title: 'Submit', desc: 'Your submission enters the pending queue. An admin will review it — you\'ll receive an email once a decision is made.' },
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

            {/* After Submission */}
            <section id="after" className="scroll-mt-24">
              <h2 className="mb-4 text-2xl font-bold">After Submission</h2>
              <p className="mb-4 text-muted-foreground">
                Once submitted, your tournament enters the pending queue. Here's what happens next:
              </p>
              <div className="space-y-4">
                {[
                  { status: 'Pending', color: 'pending', desc: 'Your submission is awaiting admin review. This typically takes 1–2 business days.' },
                  { status: 'Approved', color: 'current', desc: 'Your tournament is now live on Esportorium. You\'ll receive a notification email.' },
                  { status: 'Rejected', color: 'past', desc: 'Your submission did not meet the criteria. You\'ll receive a notification with the reason.' },
                ].map((item) => (
                  <div key={item.status} className="flex items-start gap-4 rounded-lg border border-border p-4">
                    <Badge variant={item.color} className="mt-0.5 shrink-0">{item.status}</Badge>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            <Separator className="my-10" />

            {/* Image Guidelines */}
            <section id="images" className="scroll-mt-24">
              <h2 className="mb-4 text-2xl font-bold">Image Guidelines</h2>
              <div className="rounded-lg border border-border p-5 space-y-3">
                {[
                  { icon: <Image className="h-4 w-4" />, label: 'Format', value: 'JPG or PNG' },
                  { icon: <CheckCircle className="h-4 w-4" />, label: 'Aspect ratio', value: '16:9 (landscape)' },
                  { icon: <CheckCircle className="h-4 w-4" />, label: 'Recommended size', value: '1280 × 720 px' },
                  { icon: <AlertCircle className="h-4 w-4 text-yellow-600" />, label: 'Max file size', value: '5 MB' },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      {row.icon} {row.label}
                    </div>
                    <span className="font-medium">{row.value}</span>
                  </div>
                ))}
              </div>
            </section>

            <Separator className="my-10" />

            {/* Field Reference */}
            <section id="fields" className="scroll-mt-24">
              <h2 className="mb-4 text-2xl font-bold">Field Reference</h2>
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
                      ['Tournament Name', 'Yes', 'Keep it concise and descriptive.'],
                      ['Format', 'Yes', 'Online or Offline.'],
                      ['State', 'If offline', 'The Malaysian state where the event is held.'],
                      ['Venue', 'If offline', 'Full venue name and address.'],
                      ['Start / End Date', 'Yes', 'The actual tournament dates.'],
                      ['Registration Deadline', 'Yes', 'Must be on or before start date.'],
                      ['Prize Pool (RM)', 'Yes', 'Cash prize in Ringgit Malaysia. Enter 0 if none.'],
                      ['Additional Prizes', 'No', 'e.g. Trophy, Jersey — comma-separated.'],
                      ['Max Teams', 'Yes', 'Total team slots available.'],
                      ['Registration Link', 'Yes', 'External URL (Google Form, Battlefy, etc.).'],
                      ['Banner Image', 'No', '16:9 landscape image, max 5 MB.'],
                      ['Organiser Name', 'Yes', 'Your team or club name.'],
                      ['Organiser Contact', 'Yes', 'WhatsApp number or email.'],
                      ['Organiser Email', 'Yes', 'Used to send the approval/rejection notification.'],
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
          </main>
        </div>
      </div>
    </div>
  )
}
