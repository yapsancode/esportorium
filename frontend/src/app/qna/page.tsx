'use client'

import { useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import JsonLd from '@/components/JsonLd'
import LocalizedMeta from '@/components/LocalizedMeta'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { ChevronDown, MessageCircleQuestion, FileText, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLang } from '@/lib/i18n'

const CONTACT_EMAIL = 'team.iidevstudio@gmail.com'

export default function QnA() {
  const { t } = useLang()

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": t.qna.groups.flatMap((group) =>
      group.items.map((item) => ({
        "@type": "Question",
        "name": item.q,
        "acceptedAnswer": { "@type": "Answer", "text": item.a },
      }))
    ),
  }

  return (
    <div className="min-h-screen bg-background">
      <JsonLd schema={faqSchema} />
      <LocalizedMeta title={t.meta.qnaTitle} description={t.meta.qnaDescription} />
      <Navbar />

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-2 flex items-center gap-2">
          <MessageCircleQuestion className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-primary">{t.qna.label}</span>
        </div>
        <h1 className="text-4xl font-extrabold text-foreground">{t.qna.title}</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          {t.qna.cantFind}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary font-medium hover:underline">
            {t.qna.reachOut}
          </a>
        </p>

        <Separator className="my-8" />

        <div className="space-y-10">
          {t.qna.groups.map((group) => (
            <section key={group.category}>
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {group.category}
              </h2>
              <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
                {group.items.map((item) => (
                  <Accordion key={item.q} question={item.q} answer={item.a} />
                ))}
              </div>
            </section>
          ))}
        </div>

        <Separator className="my-10" />

        <section className="rounded-xl bg-muted p-8 text-center">
          <MessageCircleQuestion className="mx-auto mb-3 h-8 w-8 text-primary" />
          <h2 className="mb-1 text-xl font-bold">{t.qna.stillHaveTitle}</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            {t.qna.stillHaveBody}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/docs">
              <Button variant="outline" className="gap-2">
                <FileText className="h-4 w-4" /> {t.qna.readTheDocs}
              </Button>
            </Link>
            <a href={`mailto:${CONTACT_EMAIL}`}>
              <Button className="gap-2">
                <Mail className="h-4 w-4" /> {t.qna.emailUs}
              </Button>
            </a>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">{CONTACT_EMAIL}</p>
        </section>
      </main>
    </div>
  )
}

function Accordion({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-card">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
        aria-expanded={open}
      >
        <span>{question}</span>
        <ChevronDown className={cn('ml-4 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="border-t border-border px-5 py-4 text-sm text-muted-foreground leading-relaxed">
          {answer}
        </div>
      )}
    </div>
  )
}
