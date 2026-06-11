'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getValidAdminToken } from '@/lib/api'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (!getValidAdminToken()) {
      router.replace('/admin/login')
    } else {
      setChecked(true)
    }
  }, [router])

  if (!checked) return null
  return <>{children}</>
}
