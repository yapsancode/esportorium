import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// ─────────────────────────────────────────────────────────────────────────────
// Prerendering note
// ─────────────────────────────────────────────────────────────────────────────
// vite-plugin-prerender / @prerenderer/renderer-puppeteer relies on ajv-keywords
// v3 which requires ajv v8's internal /dist/compile/codegen path.  That path no
// longer exists in the ajv shipped with Node 22 + Vite 8, so the plugin breaks
// the build.
//
// Recommended paths when you're ready to add prerendering:
//
//   A. Migrate to Next.js (app or pages router) — full SSR/SSG, same React code.
//
//   B. vite-plugin-react-ssg (maintained fork designed for Vite 5+):
//      npm install -D vite-plugin-react-ssg
//      https://github.com/Daydreamer-riri/vite-plugin-react-ssg
//
//   C. Minimal post-build script using Playwright:
//      npm install -D @playwright/test
//      Write a script that starts `vite preview`, visits each route, and saves
//      the HTML to dist/<route>/index.html.  No plugin conflicts.
//
// For MVP: the meta tags, robots.txt, sitemap.xml, and JSON-LD added in this
// session already give Google's JavaScript renderer everything it needs.
// ─────────────────────────────────────────────────────────────────────────────

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
