import type { MetadataRoute } from 'next'

export const revalidate = 3600

async function getTournaments() {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'
  try {
    const res = await fetch(`${base}/api/tournaments`)
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const tournaments = await getTournaments()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: 'https://esportorium.com',         lastModified: new Date(), changeFrequency: 'hourly',  priority: 1.0 },
    { url: 'https://esportorium.com/submit',  lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: 'https://esportorium.com/docs',    lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: 'https://esportorium.com/qna',     lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: 'https://esportorium.com/about',   lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ]

  const tournamentRoutes: MetadataRoute.Sitemap = tournaments.map((t: { id: string; updated_at?: string; created_at?: string }) => ({
    url: `https://esportorium.com/tournament/${t.id}`,
    lastModified: t.updated_at
      ? new Date(t.updated_at)
      : t.created_at
        ? new Date(t.created_at)
        : new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.9,
  }))

  return [...staticRoutes, ...tournamentRoutes]
}
