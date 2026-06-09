const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

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
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null
  return apiFetch(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...((options.headers as Record<string, string>) ?? {}),
    },
  })
}