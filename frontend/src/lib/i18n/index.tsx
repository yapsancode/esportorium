'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { en, type Dictionary } from './en'
import { ms } from './ms'

export type Lang = 'en' | 'ms'

const DICTIONARIES: Record<Lang, Dictionary> = { en, ms }
const STORAGE_KEY = 'esportorium_lang'
const LOCALE: Record<Lang, string> = { en: 'en-MY', ms: 'ms-MY' }

interface LanguageContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  toggleLang: () => void
  t: Dictionary
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Always start as 'en' so server and first client render match (localStorage
  // is client-only). The stored preference is applied after mount.
  const [lang, setLangState] = useState<Lang>('en')

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'ms' || stored === 'en') {
      setLangState(stored)
      document.documentElement.lang = stored === 'ms' ? 'ms-MY' : 'en-MY'
    }
  }, [])

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    localStorage.setItem(STORAGE_KEY, next)
    document.documentElement.lang = next === 'ms' ? 'ms-MY' : 'en-MY'
  }, [])

  const toggleLang = useCallback(() => {
    setLang(lang === 'en' ? 'ms' : 'en')
  }, [lang, setLang])

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t: DICTIONARIES[lang] }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLang(): LanguageContextValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLang must be used within a LanguageProvider')
  return ctx
}

// ── Locale-aware date helpers ───────────────────────────────────────────────
// Malay month names come for free from Intl with the ms-MY locale.

export function formatDate(
  d: string | null,
  lang: Lang,
  opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' },
): string {
  if (!d) return lang === 'ms' ? 'Belum ditetapkan' : 'TBD'
  return new Date(d + 'T00:00:00').toLocaleDateString(LOCALE[lang], opts)
}

export function formatDateRange(start: string | null, end: string | null, lang: Lang): string {
  if (!start || !end) return lang === 'ms' ? 'Tarikh belum ditetapkan' : 'Date TBA'
  const fmt = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString(LOCALE[lang], { day: 'numeric', month: 'short', year: 'numeric' })
  if (start === end) return fmt(start)
  return `${fmt(start)} – ${fmt(end)}`
}

export function localeFor(lang: Lang): string {
  return LOCALE[lang]
}
