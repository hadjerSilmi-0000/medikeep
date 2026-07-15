'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AuthLayout } from '@/components/auth/AuthLayout'
import api from '@/lib/api'
import { getApiError } from '@/lib/utils'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    setLoading(true)
    setError('')
    try {
      await api.post('/auth/reset-password', { token, password })
      router.push('/login?reset=1')
    } catch (err) {
      setError(getApiError(err))
    } finally {
      setLoading(false)
    }
  }

  if (!token) return (
    <div className="text-center">
      <p className="text-red-500 mb-4">Invalid or missing reset token.</p>
      <Link href="/forgot-password" className="text-primary-600 font-semibold">Request a new link</Link>
    </div>
  )

  return (
    <div>
      <h1 className="text-3xl font-bold text-primary-900 mb-1">Set new password</h1>
      <p className="text-neutral-400 text-sm mb-8">Choose a strong password for your account</p>

      {error && (
        <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">New password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" className="input-base" required minLength={8} />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">Confirm password</label>
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat password" className="input-base" required />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Updating…' : 'Reset Password'}
        </button>
      </form>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <AuthLayout>
      <Suspense fallback={<div className="text-neutral-400">Loading…</div>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthLayout>
  )
}
