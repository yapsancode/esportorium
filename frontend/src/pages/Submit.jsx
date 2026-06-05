import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Turnstile } from '@marsidev/react-turnstile'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { AlertCircle, ShieldCheck } from 'lucide-react'

// Cloudflare Turnstile site key
// Test key (always passes) — replace with your real key in production.
// Get keys at: https://dash.cloudflare.com/?to=/:account/turnstile
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'

const STATES = [
  'Kuala Lumpur', 'Selangor', 'Johor', 'Penang', 'Sabah', 'Sarawak',
  'Perak', 'Kedah', 'Kelantan', 'Terengganu', 'Pahang', 'Negeri Sembilan',
  'Melaka', 'Perlis', 'Putrajaya', 'Labuan',
]

export default function Submit() {
  const [turnstileToken, setTurnstileToken] = useState('')
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    if (!turnstileToken) return
    // TODO: POST to /api/tournaments/submit with form data + turnstile_token
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <Helmet>
          <title>Submitted — Esportorium</title>
        </Helmet>
        <Navbar />
        <main className="mx-auto max-w-lg px-4 py-20 text-center sm:px-6">
          <ShieldCheck className="mx-auto mb-4 h-12 w-12 text-green-600" />
          <h1 className="text-2xl font-extrabold">Submission received!</h1>
          <p className="mt-3 text-muted-foreground">
            We'll review your tournament within 1–2 business days and notify you at the email you provided.
          </p>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Submit a Tournament — Esportorium</title>
        <meta name="description" content="List your Mobile Legends tournament on Esportorium. Free, no account needed. Fill in the form and our team will review your submission within 1–2 business days." />
        <link rel="canonical" href="https://esportorium.com/submit" />
        <meta property="og:url" content="https://esportorium.com/submit" />
        <meta property="og:title" content="Submit a Tournament — Esportorium" />
        <meta property="og:description" content="List your ML tournament on Esportorium. Free, no account needed." />
      </Helmet>
      <Navbar />

      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-foreground">Submit a Tournament</h1>
          <p className="mt-2 text-muted-foreground">
            Fill in the details below. Your submission will be reviewed by our team before going live.
          </p>
        </div>

        {/* Disclaimer */}
        <div className="mb-6 flex gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            By submitting, you confirm that all details are accurate and the tournament is a genuine event.
            Esportorium lists tournaments for informational purposes only and is not responsible for any
            disputes arising from listed events.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tournament Details</CardTitle>
            <CardDescription>All fields are required unless marked optional.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <FormField label="Tournament Name" id="title">
                <Input id="title" placeholder="e.g. ML Warriors Open 2025" maxLength={200} required />
              </FormField>

              <FormField label="Format" id="format">
                <Select required>
                  <SelectTrigger id="format">
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="State (offline only)" id="state">
                <Select>
                  <SelectTrigger id="state">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATES.map((s) => (
                      <SelectItem key={s} value={s.toLowerCase().replace(' ', '-')}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="Venue (offline only)" id="venue">
                <Input id="venue" placeholder="e.g. Berjaya Times Square, KL" maxLength={300} />
              </FormField>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Start Date" id="start_date">
                  <Input id="start_date" type="date" required />
                </FormField>
                <FormField label="End Date" id="end_date">
                  <Input id="end_date" type="date" required />
                </FormField>
              </div>

              <FormField label="Registration Deadline" id="reg_deadline">
                <Input id="reg_deadline" type="date" required />
              </FormField>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Prize Pool (RM)" id="prize_pool">
                  <Input id="prize_pool" type="number" min={0} placeholder="e.g. 500" required />
                </FormField>
                <FormField label="Max Teams" id="max_teams">
                  <Input id="max_teams" type="number" min={2} placeholder="e.g. 16" required />
                </FormField>
              </div>

              <FormField label="Additional Prizes (optional)" id="additional_prizes">
                <Input id="additional_prizes" placeholder="e.g. Trophy, Jersey (comma separated)" />
              </FormField>

              <FormField label="Registration Link" id="reg_link">
                <Input id="reg_link" type="url" placeholder="https://forms.gle/..." required />
              </FormField>

              <FormField label="Banner Image (optional)" id="banner">
                <Input id="banner" type="file" accept="image/png,image/jpeg,image/jpg" />
              </FormField>

              <div className="border-t border-border pt-6">
                <h3 className="mb-4 font-semibold">Organiser Info</h3>
                <div className="space-y-4">
                  <FormField label="Organiser Name" id="org_name">
                    <Input id="org_name" placeholder="e.g. KL Esports Club" maxLength={100} required />
                  </FormField>
                  <FormField label="Contact (WhatsApp / email)" id="org_contact">
                    <Input id="org_contact" placeholder="e.g. +6012-3456789" maxLength={100} required />
                  </FormField>
                  <FormField label="Email (for approval notification)" id="org_email">
                    <Input id="org_email" type="email" placeholder="organiser@example.com" required />
                  </FormField>
                </div>
              </div>

              {/* Cloudflare Turnstile — bot protection */}
              <div>
                <Turnstile
                  siteKey={TURNSTILE_SITE_KEY}
                  onSuccess={(token) => setTurnstileToken(token)}
                  onError={() => setTurnstileToken('')}
                  onExpire={() => setTurnstileToken('')}
                />
              </div>

              <Button type="submit" className="w-full" disabled={!turnstileToken}>
                Submit for Review
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  )
}

function FormField({ label, id, children }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  )
}
