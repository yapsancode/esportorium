import type { NextConfig } from 'next'

// Content Security Policy — shipped as **Report-Only** for now so it never blocks
// a legitimate resource. Watch the browser console / report endpoint, then once
// it's clean, rename the header to `Content-Security-Policy` to enforce it.
const cspReportOnly = [
  "default-src 'self'",
  // 'unsafe-inline'/'unsafe-eval' are needed by Next.js' runtime + hydration.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.r2.dev",
  "font-src 'self'",
  // Cloudflare Turnstile renders its widget in an iframe.
  "frame-src https://challenges.cloudflare.com",
  // API calls (Cloud Run) + Vercel Analytics / Speed Insights beacons.
  "connect-src 'self' https://*.run.app https://*.vercel-scripts.com https://vitals.vercel-insights.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join('; ')

const securityHeaders = [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  { key: 'Content-Security-Policy-Report-Only', value: cspReportOnly },
]

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.r2.dev',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
