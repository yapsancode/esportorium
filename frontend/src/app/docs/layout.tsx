import type { Metadata } from 'next'
import JsonLd from '@/components/JsonLd'

export const metadata: Metadata = {
  title: 'Platform Guide',
  description: 'Complete guide to Esportorium: how to submit a tournament, eligibility criteria, image guidelines, and a full field reference for organisers.',
  alternates: { canonical: '/docs' },
  openGraph: {
    url: 'https://esportorium.com/docs',
    title: 'Platform Guide — Esportorium Docs',
    description: 'How to list your ML tournament on Esportorium — eligibility, submission steps, image specs, and field reference.',
  },
}

const howToSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "How to Submit a Tournament on Esportorium",
  "description": "Steps to list your Mobile Legends tournament on Esportorium for free.",
  "totalTime": "PT5M",
  "tool": [{ "@type": "HowToTool", "name": "External registration link (Google Form, Battlefy, Challonge, etc.)" }],
  "step": [
    { "@type": "HowToStep", "position": 1, "name": "Go to Submit Tournament", "text": 'Click the "Submit Tournament" button in the navigation bar, or visit esportorium.com/submit directly.' },
    { "@type": "HowToStep", "position": 2, "name": "Fill in tournament details", "text": "Complete all required fields — name, format, dates, prize pool, max teams, and registration link." },
    { "@type": "HowToStep", "position": 3, "name": "Add organiser info", "text": "Provide your organiser name, a contact method (WhatsApp or email), and the email address for approval notification." },
    { "@type": "HowToStep", "position": 4, "name": "Upload a banner (optional)", "text": "Upload a landscape banner image. Recommended: 1280×720 px (16:9), JPG or PNG, max 5 MB." },
    { "@type": "HowToStep", "position": 5, "name": "Submit for review", "text": "Your submission enters the pending queue. An admin will review it within 1–2 business days and you'll receive an email once a decision is made." },
  ],
}

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd schema={howToSchema} />
      {children}
    </>
  )
}
