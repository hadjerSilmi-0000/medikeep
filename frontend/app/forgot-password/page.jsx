'use client'
import { useState } from 'react'
import Link from 'next/link'
import { AuthLayout } from '@/components/auth/AuthLayout'
import api from '@/lib/api'
import { getApiError } from '@/lib/utils'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    setError('')
    try {
      await api.post('/auth/forgot-password', { email })
      setSent(true)
    } catch (err) {
      setError(getApiError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      {sent ? (
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center mx-auto mb-5">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-primary-900 mb-2">Check your inbox</h2>
          <p className="text-neutral-400 text-sm mb-6">
            We sent a reset link to <span className="font-medium text-neutral-600">{email}</span>
          </p>
          <Link href="/login" className="text-sm text-primary-600 font-semibold hover:text-primary-700">
            Back to sign in
          </Link>
        </div>
      ) : (
        <div>
          <h1 className="text-3xl font-bold text-primary-900 mb-1">Reset password</h1>
          <p className="text-neutral-400 text-sm mb-8">Enter your email to receive a reset link</p>

          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input-base"
                required
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-neutral-400">
            <Link href="/login" className="text-primary-600 font-semibold hover:text-primary-700">Back to sign in</Link>
          </p>
        </div>
      )}
    </AuthLayout>
  )
}
