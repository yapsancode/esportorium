'use client'

import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import LocalizedMeta from '@/components/LocalizedMeta'
import { Separator } from '@/components/ui/separator'
import { ShieldCheck, Lock } from 'lucide-react'
import { useLang } from '@/lib/i18n'

export default function PrivacyClient() {
  const { t } = useLang()

  return (
    <div className="min-h-screen bg-background">
      <LocalizedMeta title={t.meta.privacyTitle} description={t.meta.privacyDescription} />
      <Navbar />

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-2 flex items-center gap-2">
          <Lock className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-primary">{t.privacy.label}</span>
        </div>
        <h1 className="text-4xl font-extrabold text-foreground">{t.privacy.title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{t.privacy.lastUpdatedLabel} {t.privacy.lastUpdated}</p>

        <p className="mt-6 text-muted-foreground leading-relaxed">
          {t.privacy.intro}
        </p>

        <Separator className="my-8" />

        <div className="space-y-8">
          {t.privacy.sections.map((section) => (
            <section key={section.title}>
              <h2 className="mb-3 text-lg font-bold text-foreground">{section.title}</h2>
              {section.paragraphs?.map((p, i) => (
                <p key={i} className="mb-3 text-sm text-muted-foreground leading-relaxed">{p}</p>
              ))}
              {section.bullets && (
                <ul className="space-y-2">
                  {section.bullets.map((b, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground leading-relaxed">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <Separator className="my-8" />

        <p className="rounded-lg bg-muted/60 px-5 py-4 text-xs leading-relaxed text-muted-foreground">
          {t.privacy.legalNote}
        </p>
      </main>

      <Footer />
    </div>
  )
}
