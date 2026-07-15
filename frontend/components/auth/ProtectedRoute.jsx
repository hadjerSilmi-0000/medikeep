'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { PageSpinner } from '@/components/ui/Spinner'

export function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
    if (!loading && user && roles && !roles.includes(user.role)) router.replace('/dashboard')
  }, [user, loading, roles, router])

  if (loading) return <PageSpinner />
  if (!user) return null
  if (roles && !roles.includes(user.role)) return null

  return children
}
