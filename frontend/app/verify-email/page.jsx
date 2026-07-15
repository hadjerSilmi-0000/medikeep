'use client'
import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AuthLayout } from '@/components/auth/AuthLayout'
import api from '@/lib/api'

function VerifyContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''
  const [resent, setResent] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  const handleResend = async () => {
    if (cooldown > 0) return
    try {
      await api.post('/auth/resend-verification', { email })
      setResent(true)
      let c = 60
      setCooldown(c)
      const interval = setInterval(() => {
        c--
        setCooldown(c)
        if (c <= 0) clearInterval(interval)
      }, 1000)
    } catch {}
  }

  return (
    <div className="text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center mx-auto mb-5">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-primary-900 mb-2">Verify your email</h2>
      <p className="text-neutral-400 text-sm mb-6 max-w-xs mx-auto">
        We sent a verification link to{' '}
        {email && <span className="font-medium text-neutral-600">{email}</span>}
        . Click the link to activate your account.
      </p>

      {resent && (
        <div className="mb-4 px-4 py-2 rounded-xl bg-primary-50 border border-primary-200 text-primary-700 text-sm">
          Verification email resent!
        </div>
      )}

      <button
        onClick={handleResend}
        disabled={cooldown > 0}
        className="btn-ghost w-full mb-4 disabled:opacity-50"
      >
        {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend email'}
      </button>
      <Link href="/login" className="text-sm text-primary-600 font-semibold hover:text-primary-700">
        Back to sign in
      </Link>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <AuthLayout>
      <Suspense fallback={<div className="text-neutral-400">Loading…</div>}>
        <VerifyContent />
      </Suspense>
    </AuthLayout>
  )
}
