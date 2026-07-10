import type { MetadataRoute } from 'next'
import { serverFetch } from '@/lib/api'

export const revalidate = 3600

async function getTournaments() {
  try {
    return await serverFetch<{ id: string; updated_at?: string; created_at?: string }[]>(
      '/api/tournaments'
    )
  } catch (err) {
    console.error('[sitemap] getTournaments failed:', err)
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const tournaments = await getTournaments()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: 'https://esportorium.com',             lastModified: new Date(), changeFrequency: 'weekly',  priority: 1.0 },
    { url: 'https://esportorium.com/tournaments', lastModified: new Date(), changeFrequency: 'hourly',  priority: 1.0 },
    { url: 'https://esportorium.com/submit',  lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: 'https://esportorium.com/docs',    lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: 'https://esportorium.com/qna',     lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: 'https://esportorium.com/about',   lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ]

  const tournamentRoutes: MetadataRoute.Sitemap = tournaments.map((t) => ({
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
