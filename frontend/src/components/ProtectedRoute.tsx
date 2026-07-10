'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getValidAdminToken, getValidOrganiserToken } from '@/lib/api'

// Guards a client route behind a valid JWT. `role` picks which token to check
// and where to redirect when it's missing or expired.
export default function ProtectedRoute({
  children,
  role = 'admin',
}: {
  children: React.ReactNode
  role?: 'admin' | 'organiser'
}) {
  const router = useRouter()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const valid = role === 'organiser' ? getValidOrganiserToken() : getValidAdminToken()
    if (!valid) {
      router.replace(role === 'organiser' ? '/organiser/login' : '/admin/login')
    } else {
      setChecked(true)
    }
  }, [router, role])

  if (!checked) return null
  return <>{children}</>
}
