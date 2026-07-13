'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import LocalizedMeta from '@/components/LocalizedMeta'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { FileText, CheckCircle, Clock, Link as LinkIcon, Image, AlertCircle, ArrowRight, MessageCircleQuestion } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLang } from '@/lib/i18n'

const CONTACT_EMAIL = 'team.iidevstudio@gmail.com'

// Section ids stay stable (used by anchor links + the scroll-spy observer);
// only the visible labels are translated.
const SECTION_IDS = ['overview', 'eligibility', 'submission', 'after', 'images', 'fields'] as const

// Colour token per "after submission" state, matched by index to the dict rows.
const AFTER_COLORS = ['pending', 'current', 'past']
const OVERVIEW_ICONS = [
  <CheckCircle key="0" className="h-5 w-5 text-green-600" />,
  <Clock key="1" className="h-5 w-5 text-blue-600" />,
  <LinkIcon key="2" className="h-5 w-5 text-primary" />,
]
const IMAGE_ICONS = [
  <Image key="0" className="h-4 w-4 text-muted-foreground" />,
  <CheckCircle key="1" className="h-4 w-4 text-green-600" />,
  <CheckCircle key="2" className="h-4 w-4 text-green-600" />,
  <AlertCircle key="3" className="h-4 w-4 text-yellow-600" />,
]

export default function Documentation() {
  const { t } = useLang()
  const [activeSection, setActiveSection] = useState('overview')

  const sections = SECTION_IDS.map((id) => ({ id, label: t.docs.sections[id] }))

  useEffect(() => {
    const observers = SECTION_IDS.map((id) => {
      const el = document.getElementById(id)
      if (!el) return null
      const observer = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(id) },
        { rootMargin: '-15% 0px -65% 0px', threshold: 0 }
      )
      observer.observe(el)
      return observer
    })
    return () => observers.forEach((obs) => obs?.disconnect())
  }, [])

  return (
    <>
    <div className="min-h-screen bg-background">
      <LocalizedMeta title={t.meta.docsTitle} description={t.meta.docsDescription} />
      <Navbar />

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex gap-12">

          <aside className="hidden w-52 shrink-0 lg:block">
            <div className="sticky top-24">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {t.docs.onThisPage}
              </p>
              <nav className="flex flex-col gap-0.5">
                {sections.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className={cn(
                      'rounded-md px-3 py-1.5 text-sm transition-colors',
                      activeSection === s.id
                        ? 'bg-muted font-medium text-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {s.label}
                  </a>
                ))}
              </nav>

              <Separator className="my-5" />

              <div className="space-y-1">
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {t.docs.more}
                </p>
                <Link href="/qna" className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                  <MessageCircleQuestion className="h-3.5 w-3.5" /> {t.docs.viewQna}
                </Link>
                <Link href="/submit" className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                  <ArrowRight className="h-3.5 w-3.5" /> {t.docs.submitATournament}
                </Link>
              </div>
            </div>
          </aside>

          <main className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-primary">{t.docs.label}</span>
            </div>
            <h1 className="text-4xl font-extrabold text-foreground">{t.docs.title}</h1>
            <p className="mt-3 text-lg text-muted-foreground">
              {t.docs.subtitle}
            </p>

            <Separator className="my-8" />

            <section id="overview" className="scroll-mt-24">
              <h2 className="mb-4 text-2xl font-bold">{t.docs.sections.overview}</h2>
              <p className="leading-relaxed text-muted-foreground">
                {t.docs.overviewBody}
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {t.docs.overviewCards.map((item, i) => (
                  <Card key={item.title}>
                    <CardContent className="pt-5">
                      <div className="mb-2 flex items-center gap-2">
                        {OVERVIEW_ICONS[i]}
                        <span className="font-semibold">{item.title}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            <Separator className="my-10" />

            <section id="eligibility" className="scroll-mt-24">
              <h2 className="mb-4 text-2xl font-bold">{t.docs.sections.eligibility}</h2>
              <p className="mb-5 text-muted-foreground">
                {t.docs.eligibilityIntro}
              </p>
              <ul className="space-y-3">
                {t.docs.eligibilityItems.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-5 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
                {t.docs.eligibilityNote}
              </div>
            </section>

            <Separator className="my-10" />

            <section id="submission" className="scroll-mt-24">
              <h2 className="mb-4 text-2xl font-bold">{t.docs.sections.submission}</h2>
              <p className="mb-6 text-muted-foreground">
                {t.docs.submissionIntro}
              </p>
              <ol className="space-y-6">
                {t.docs.submissionSteps.map((item, i) => (
                  <li key={item.title} className="flex gap-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-semibold">{item.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <Separator className="my-10" />

            <section id="after" className="scroll-mt-24">
              <h2 className="mb-4 text-2xl font-bold">{t.docs.sections.after}</h2>
              <p className="mb-5 text-muted-foreground">
                {t.docs.afterIntro}
              </p>
              <div className="space-y-4">
                {t.docs.afterStates.map((item, i) => (
                  <div key={item.status} className="flex items-start gap-4 rounded-lg border border-border p-4">
                    <Badge variant={AFTER_COLORS[i] as any} className="mt-0.5 shrink-0">{item.status}</Badge>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            <Separator className="my-10" />

            <section id="images" className="scroll-mt-24">
              <h2 className="mb-4 text-2xl font-bold">{t.docs.sections.images}</h2>
              <p className="mb-5 text-muted-foreground">
                {t.docs.imagesIntro}
              </p>
              <div className="rounded-lg border border-border p-5 space-y-3">
                {t.docs.imageRows.map((row, i) => (
                  <div key={row.label} className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">{IMAGE_ICONS[i]} {row.label}</div>
                    <span className="font-medium">{row.value}</span>
                  </div>
                ))}
              </div>
            </section>

            <Separator className="my-10" />

            <section id="fields" className="scroll-mt-24">
              <h2 className="mb-4 text-2xl font-bold">{t.docs.sections.fields}</h2>
              <p className="mb-5 text-muted-foreground">
                {t.docs.fieldsIntro}
              </p>
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">{t.docs.fieldsHeaderField}</th>
                      <th className="px-4 py-3 text-left font-semibold">{t.docs.fieldsHeaderRequired}</th>
                      <th className="px-4 py-3 text-left font-semibold">{t.docs.fieldsHeaderNotes}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {t.docs.fieldsRows.map(([field, required, notes]) => (
                      <tr key={field} className="hover:bg-muted/40">
                        <td className="px-4 py-3 font-medium">{field}</td>
                        <td className="px-4 py-3">
                          <Badge variant={required === t.docs.reqYes ? 'default' : required === t.docs.reqNo ? 'secondary' : 'outline'} className="text-xs">
                            {required}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <Separator className="my-10" />

            <section className="rounded-xl bg-muted p-8">
              <h2 className="mb-1 text-xl font-bold">{t.docs.needHelpTitle}</h2>
              <p className="mb-6 text-muted-foreground text-sm">
                {t.docs.needHelpBody}{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline font-medium">
                  {CONTACT_EMAIL}
                </a>.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/qna">
                  <Button variant="outline" className="gap-2">
                    <MessageCircleQuestion className="h-4 w-4" /> {t.docs.viewQna}
                  </Button>
                </Link>
                <Link href="/submit">
                  <Button className="gap-2">
                    {t.docs.submitATournament} <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
    <Footer />
    </>
  )
}
