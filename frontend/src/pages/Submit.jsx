import { Helmet } from 'react-helmet-async'
import Navbar from '@/components/Navbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

const STATES = [
  'Kuala Lumpur', 'Selangor', 'Johor', 'Penang', 'Sabah', 'Sarawak',
  'Perak', 'Kedah', 'Kelantan', 'Terengganu', 'Pahang', 'Negeri Sembilan',
  'Melaka', 'Perlis', 'Putrajaya', 'Labuan',
]

export default function Submit() {
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

        <Card>
          <CardHeader>
            <CardTitle>Tournament Details</CardTitle>
            <CardDescription>All fields are required unless marked optional.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6">
              <FormField label="Tournament Name" id="title">
                <Input id="title" placeholder="e.g. ML Warriors Open 2025" />
              </FormField>

              <FormField label="Format" id="format">
                <Select>
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
                <Input id="venue" placeholder="e.g. Berjaya Times Square, KL" />
              </FormField>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Start Date" id="start_date">
                  <Input id="start_date" type="date" />
                </FormField>
                <FormField label="End Date" id="end_date">
                  <Input id="end_date" type="date" />
                </FormField>
              </div>

              <FormField label="Registration Deadline" id="reg_deadline">
                <Input id="reg_deadline" type="date" />
              </FormField>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Prize Pool (RM)" id="prize_pool">
                  <Input id="prize_pool" type="number" placeholder="e.g. 500" />
                </FormField>
                <FormField label="Max Teams" id="max_teams">
                  <Input id="max_teams" type="number" placeholder="e.g. 16" />
                </FormField>
              </div>

              <FormField label="Additional Prizes (optional)" id="additional_prizes">
                <Input id="additional_prizes" placeholder="e.g. Trophy, Jersey (comma separated)" />
              </FormField>

              <FormField label="Registration Link" id="reg_link">
                <Input id="reg_link" type="url" placeholder="https://forms.gle/..." />
              </FormField>

              <FormField label="Banner Image (optional)" id="banner">
                <Input id="banner" type="file" accept="image/*" />
              </FormField>

              <div className="border-t border-border pt-6">
                <h3 className="mb-4 font-semibold">Organiser Info</h3>
                <div className="space-y-4">
                  <FormField label="Organiser Name" id="org_name">
                    <Input id="org_name" placeholder="e.g. KL Esports Club" />
                  </FormField>
                  <FormField label="Contact (WhatsApp / email)" id="org_contact">
                    <Input id="org_contact" placeholder="e.g. +6012-3456789" />
                  </FormField>
                  <FormField label="Email (for approval notification)" id="org_email">
                    <Input id="org_email" type="email" placeholder="organiser@example.com" />
                  </FormField>
                </div>
              </div>

              <Button type="submit" className="w-full">Submit for Review</Button>
            </form>
          </CardContent>
        </Card>
      </main>
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
