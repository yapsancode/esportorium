'use client'

import Link from 'next/link'
import Image from 'next/image'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import LocalizedMeta from '@/components/LocalizedMeta'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Trophy, MapPin, Users, Zap, Info, Code, ExternalLink, ShieldCheck, CheckCircle2 } from 'lucide-react'
import { useLang } from '@/lib/i18n'

const VALUE_ICONS = [
  <Trophy key="0" className="h-5 w-5 text-primary" />,
  <MapPin key="1" className="h-5 w-5 text-primary" />,
  <Users key="2" className="h-5 w-5 text-primary" />,
  <Zap key="3" className="h-5 w-5 text-primary" />,
]

export default function AboutClient() {
  const { t } = useLang()

  return (
    <div className="min-h-screen bg-background">
      <LocalizedMeta title={t.meta.aboutTitle} description={t.meta.aboutDescription} />
      <Navbar />

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">

        <div className="mb-10 flex flex-col items-center text-center">
          <Image src="/esportorium-logo.png" alt="Esportorium" width={80} height={80} className="mb-5 h-20 w-20 rounded-2xl shadow-md" />
          <div className="mb-2 flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">{t.about.label}</span>
          </div>
          <h1 className="text-4xl font-extrabold text-foreground sm:text-5xl">{t.about.heading}</h1>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground">
            {t.about.intro}
          </p>
        </div>

        <Separator className="my-8" />

        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-bold">{t.about.missionTitle}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {t.about.mission1}
          </p>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            {t.about.mission2}
          </p>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 text-2xl font-bold">{t.about.standForTitle}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {t.about.values.map((item, i) => (
              <Card key={item.title}>
                <CardContent className="pt-5">
                  <div className="mb-2 flex items-center gap-2">
                    {VALUE_ICONS[i]}
                    <span className="font-semibold">{item.title}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Separator className="my-10" />

        <section className="mb-12">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold">{t.about.verifyTitle}</h2>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            {t.about.verifyIntro}
          </p>
          <ul className="mt-5 space-y-3">
            {t.about.verifyItems.map(([title, desc]) => (
              <li key={title} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span className="text-sm text-muted-foreground">
                  <strong className="text-foreground">{title}.</strong> {desc}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-muted-foreground leading-relaxed">
            {t.about.verifyStatus}
          </p>
          <p className="mt-4 rounded-lg bg-muted/60 px-5 py-4 text-sm leading-relaxed text-muted-foreground">
            <strong className="text-foreground">{t.about.verifyLimitsLabel}</strong> {t.about.verifyLimits}{' '}
            <a href="mailto:team.iidevstudio@gmail.com" className="text-primary hover:underline">{t.about.verifyTellUs}</a> {t.about.verifyLimitsTail}
          </p>
        </section>

        <Separator className="my-10" />

        <section className="mb-12">
          <h2 className="mb-6 text-2xl font-bold">{t.about.roadmapTitle}</h2>
          <div className="space-y-6">
            {t.about.roadmap.map((group, i) => (
              <div key={group.label} className="flex gap-5">
                <div className="flex flex-col items-center">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${i === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    {i === 0
                      ? <CheckCircle2 className="h-5 w-5" />
                      : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                  </div>
                  {i < t.about.roadmap.length - 1 && <div className="mt-1 flex-1 w-px bg-border" />}
                </div>
                <div className="pb-6">
                  <h3 className="mb-2 font-semibold">{group.label}</h3>
                  <ul className="space-y-1">
                    {group.items.map((item) => (
                      <li key={item} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-border" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>

        <Separator className="my-10" />

        <section className="mb-12">
          <Card className="overflow-hidden border-border/50">
            <CardContent className="flex flex-col items-center gap-4 py-8 text-center sm:flex-row sm:items-start sm:text-left sm:gap-6">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Code className="h-7 w-7 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">{t.about.builtByLabel}</p>
                <h3 className="text-lg font-bold text-foreground">{t.about.builtByName}</h3>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed max-w-lg">
                  {t.about.builtByDesc}
                </p>
                <a href="https://www.iidevstudio.com" target="_blank" rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                  {t.about.visitSite} <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="rounded-xl bg-muted p-8 text-center">
          <h2 className="mb-2 text-xl font-bold">{t.about.haveTournamentTitle}</h2>
          <p className="mb-6 text-muted-foreground">{t.about.haveTournamentBody}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/submit"><Button>{t.about.submitATournament}</Button></Link>
            <Link href="/docs"><Button variant="outline">{t.about.readTheDocs}</Button></Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
