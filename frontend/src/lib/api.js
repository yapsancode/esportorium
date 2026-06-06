const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

export async function adminFetch(path, options = {}) {
  const token = localStorage.getItem('admin_token')
  return apiFetch(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })
}
