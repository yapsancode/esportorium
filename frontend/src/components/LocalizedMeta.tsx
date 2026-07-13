'use client'

import { useEffect } from 'react'
import { useLang } from '@/lib/i18n'

// Syncs the document title and description meta tags to the active language.
// The server still emits the canonical en-MY metadata (what crawlers index on
// these single-URL pages); this updates what the user sees in their browser tab
// and share widgets once the client takes over, and re-runs on every toggle.
export default function LocalizedMeta({ title, description }: { title?: string; description?: string }) {
  // `lang` isn't read directly, but keeping it in deps re-applies the tags the
  // instant the user toggles language (title/description already change too).
  const { lang } = useLang()

  useEffect(() => {
    if (title) {
      document.title = title
      setMeta('property', 'og:title', title)
      setMeta('name', 'twitter:title', title)
    }
    if (description) {
      setMeta('name', 'description', description, true)
      setMeta('property', 'og:description', description)
      setMeta('name', 'twitter:description', description)
    }
  }, [lang, title, description])

  return null
}

// Update an existing meta tag; optionally create the standard description tag
// if the page didn't render one server-side.
function setMeta(attr: 'name' | 'property', key: string, content: string, createIfMissing = false) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el && createIfMissing) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  if (el) el.setAttribute('content', content)
}
