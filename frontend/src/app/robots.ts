import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/admin/login', '/admin/dashboard', '/admin/tournaments'],
      },
    ],
    sitemap: 'https://esportorium.com/sitemap.xml',
  }
}
