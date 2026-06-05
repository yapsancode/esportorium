import { Helmet } from 'react-helmet-async'
import Navbar from '@/components/Navbar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Pencil, Trash2 } from 'lucide-react'

const PLACEHOLDER_TOURNAMENTS = [
  { id: '1', title: 'ML Warriors Open 2025', status: 'upcoming', format: 'Online', prize: 500 },
  { id: '2', title: 'Sabah Regional Cup', status: 'current', format: 'Offline · Sabah', prize: 1000 },
  { id: '3', title: 'SEA Pro Series Q4 2024', status: 'past', format: 'Online', prize: 2000 },
]

export default function AdminTournaments() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Manage Tournaments — Esportorium Admin</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-foreground">Manage Tournaments</h1>
            <p className="mt-1 text-muted-foreground">Add, edit, or remove tournaments from the platform.</p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> Add Tournament
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">All Tournaments</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tournament</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Prize (RM)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {PLACEHOLDER_TOURNAMENTS.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.title}</TableCell>
                    <TableCell>
                      <Badge variant={t.status}>{t.status.charAt(0).toUpperCase() + t.status.slice(1)}</Badge>
                    </TableCell>
                    <TableCell>{t.format}</TableCell>
                    <TableCell>RM {t.prize.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="icon" variant="ghost" className="h-8 w-8">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
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
