import type { Metadata } from 'next'
import JsonLd from '@/components/JsonLd'
import AboutClient from '@/components/AboutClient'

export const metadata: Metadata = {
  title: 'About Esportorium — Malaysia Esports Tournament Platform',
  description: "Learn about Esportorium — Malaysia's curated esports tournament discovery platform. Our mission, what we stand for, and the roadmap ahead.",
  alternates: { canonical: '/about' },
  openGraph: {
    url: 'https://esportorium.com/about',
    title: 'About Esportorium',
    description: "Malaysia's curated esports tournament discovery platform — built for players who want to compete, and organisers who want to be found.",
  },
}

const ORG_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Esportorium",
  "url": "https://esportorium.com",
  "logo": {
    "@type": "ImageObject",
    "url": "https://esportorium.com/esportorium-logo.png",
  },
  "description": "Malaysia's curated esports tournament discovery platform for Mobile Legends.",
  "email": "team.iidevstudio@gmail.com",
  "foundingDate": "2025",
  "areaServed": {
    "@type": "Country",
    "name": "Malaysia",
    "sameAs": "https://www.wikidata.org/wiki/Q833",
  },
  "knowsAbout": [
    "Mobile Legends: Bang Bang",
    "Esports",
    "Gaming Tournaments",
    "Malaysia Esports",
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "email": "team.iidevstudio@gmail.com",
    "contactType": "customer support",
    "areaServed": "MY",
    "availableLanguage": ["English", "Malay"],
  },
  "sameAs": [
    "https://discord.gg/XufVXcbS",
    "https://t.me/esportorium",
  ],
}

export default function About() {
  return (
    <>
      <JsonLd schema={ORG_SCHEMA} />
      <AboutClient />
    </>
  )
}
