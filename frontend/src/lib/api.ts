// Strip any accidental trailing slash so URLs never get a double-slash
const BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000').replace(/\/$/, '')

// ── Auth helpers ──────────────────────────────────────────────────────────────

// Returns the stored admin token only if it exists and its JWT `exp` is still in
// the future. Clears the token and returns null when missing, malformed, or expired.
export function getValidAdminToken(): string | null {
  if (typeof window === 'undefined') return null
  const token = localStorage.getItem('admin_token')
  if (!token) return null

  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    // `exp` is in seconds since epoch; treat a token with no exp as invalid.
    if (typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now()) {
      localStorage.removeItem('admin_token')
      return null
    }
    return token
  } catch {
    localStorage.removeItem('admin_token')
    return null
  }
}

// ── Client-side helpers ───────────────────────────────────────────────────────

export async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) ?? {}),
    },
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

export async function adminFetch(path: string, options: RequestInit = {}) {
  const token = getValidAdminToken()
  return apiFetch(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...((options.headers as Record<string, string>) ?? {}),
    },
  })
}

// ── Server-side helper (Server Components / Route Handlers only) ──────────────
// Accepts Next.js fetch cache options (next: { revalidate, tags }).
// Throws on non-OK responses so callers must handle errors explicitly.

export async function serverFetch<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const base = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000').replace(/\/$/, '')
  const url = `${base}${path}`
  const res = await fetch(url, init)
  if (!res.ok) {
    throw new Error(`[serverFetch] ${res.status} ${res.statusText} — ${url}`)
  }
  return res.json() as Promise<T>
}
