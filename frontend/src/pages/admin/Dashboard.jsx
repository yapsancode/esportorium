import { Helmet } from 'react-helmet-async'
import Navbar from '@/components/Navbar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Check, X } from 'lucide-react'

const PLACEHOLDER_SUBMISSIONS = [
  { id: '1', title: 'ML Warriors Open 2025', organiser: 'KL Esports Club', submitted: '2025-01-01', format: 'Online' },
  { id: '2', title: 'Sabah Regional Cup', organiser: 'Borneo Gaming', submitted: '2025-01-03', format: 'Offline · Sabah' },
  { id: '3', title: 'SEA Pro Series Q1', organiser: 'Pro League MY', submitted: '2025-01-05', format: 'Online' },
]

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Pending Submissions — Esportorium Admin</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-foreground">Pending Submissions</h1>
            <p className="mt-1 text-muted-foreground">Review and approve or reject tournament submissions.</p>
          </div>
          <Badge variant="pending" className="text-sm px-3 py-1">
            {PLACEHOLDER_SUBMISSIONS.length} pending
          </Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Awaiting Review</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tournament</TableHead>
                  <TableHead>Organiser</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {PLACEHOLDER_SUBMISSIONS.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">{sub.title}</TableCell>
                    <TableCell className="text-muted-foreground">{sub.organiser}</TableCell>
                    <TableCell>{sub.format}</TableCell>
                    <TableCell className="text-muted-foreground">{sub.submitted}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" className="h-8 gap-1.5">
                          <Check className="h-3.5 w-3.5" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 gap-1.5">
                          <X className="h-3.5 w-3.5" /> Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
