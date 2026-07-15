'use client'
import Link from 'next/link'

export function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center auth-bg">

      {/* Logo top-left */}
      <div className="absolute top-8 left-8 z-10">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 3v14M3 10h14" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-xl font-bold text-primary-900">MediKeep</span>
        </Link>
      </div>

      {/* Tagline bottom-left */}
      <div className="absolute bottom-10 left-8 z-10">
        <p className="text-primary-800 text-2xl font-bold leading-snug max-w-sm">
          Your complete healthcare management platform
        </p>
        <p className="text-primary-600 text-sm mt-2">
          Connecting doctors and patients, seamlessly.
        </p>
      </div>

      {/* Centered card */}
      <div className="relative z-10 w-full max-w-[480px] bg-white/90 backdrop-blur-sm rounded-2xl border border-primary-200 shadow-lg px-12 py-12">
        {children}
      </div>

    </div>
  )
}