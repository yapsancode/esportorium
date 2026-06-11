// Strip any accidental trailing slash so URLs never get a double-slash
const BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000').replace(/\/$/, '')

// Thrown when the server responds with a non-2xx status. `status` is the HTTP code.
export class ApiError extends Error {
  status: number
  constructor(status: number, message?: string) {
    super(message ?? `API error ${status}`)
    this.name = 'ApiError'
    this.status = status
  }
}

// Thrown when the request never reached the server (DNS, offline, CORS, CSP,
// connection refused). There is no HTTP status because no response came back.
export class NetworkError extends Error {
  constructor(message = 'Could not reach the server') {
    super(message)
    this.name = 'NetworkError'
  }
}

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
  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...((options.headers as Record<string, string>) ?? {}),
      },
    })
  } catch {
    // fetch() rejects (instead of resolving) only when no response was received —
    // network down, connection refused, CORS/CSP block, etc.
    throw new NetworkError()
  }
  if (!res.ok) throw new ApiError(res.status)
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
