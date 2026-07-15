import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

// Copy mirrors the homepage's openGraph metadata in src/app/page.tsx — keep in sync.
const TITLE = 'Esportorium — Malaysia Esports Tournaments'
const DESCRIPTION =
  "Malaysia's curated home for Mobile Legends tournaments. Find one near you, or list yours for free."

// Palette resolved from the tokens in src/app/globals.css.
const BACKGROUND = '#FAFAF8'
const FOREGROUND = '#1A1A1A'
const PRIMARY = '#B5522A'
const MUTED_FOREGROUND = '#6B6B6B'

export const alt = TITLE
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  // Fonts are committed as TTF rather than reused from the next/font/google
  // setup in layout.tsx: ImageResponse only accepts ttf/otf/woff, and
  // next/font caches woff2 only.
  const [bold, regular, logo] = await Promise.all([
    readFile(join(process.cwd(), 'assets/PlusJakartaSans-Bold.ttf')),
    readFile(join(process.cwd(), 'assets/PlusJakartaSans-Regular.ttf')),
    readFile(join(process.cwd(), 'src/assets/esportorium-logo.png'), 'base64'),
  ])

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: BACKGROUND,
          padding: '64px 80px',
          fontFamily: 'Plus Jakarta Sans',
        }}
      >
        <div style={{ display: 'flex' }}>
          <img
            src={`data:image/png;base64,${logo}`}
            width={88}
            height={88}
            style={{ borderRadius: 18 }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              fontSize: 74,
              fontWeight: 700,
              color: FOREGROUND,
              lineHeight: 1.12,
              letterSpacing: -1.5,
              maxWidth: 960,
            }}
          >
            {TITLE}
          </div>

          <div style={{ display: 'flex', marginTop: 34 }}>
            <div
              style={{
                display: 'flex',
                width: 6,
                borderRadius: 3,
                marginRight: 24,
                backgroundColor: PRIMARY,
              }}
            />
            <div
              style={{
                display: 'flex',
                fontSize: 29,
                fontWeight: 400,
                color: MUTED_FOREGROUND,
                lineHeight: 1.45,
                maxWidth: 830,
              }}
            >
              {DESCRIPTION}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex' }}>
          <div
            style={{
              fontSize: 25,
              fontWeight: 700,
              color: PRIMARY,
              letterSpacing: 0.3,
            }}
          >
            esportorium.com
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Plus Jakarta Sans', data: bold, style: 'normal', weight: 700 },
        { name: 'Plus Jakarta Sans', data: regular, style: 'normal', weight: 400 },
      ],
    }
  )
}
