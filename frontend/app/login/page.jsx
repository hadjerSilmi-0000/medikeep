'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { useAuth } from '@/lib/auth'
import { getApiError } from '@/lib/utils'

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export default function LoginPage() {
  const { login } = useAuth()
  const router = useRouter()
  const [serverError, setServerError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data) => {
    setServerError('')
    try {
      await login(data.email, data.password)
      router.push('/dashboard')
    } catch (err) {
      setServerError(getApiError(err))
    }
  }

  return (
    <AuthLayout>
      {/* Header — small round badge + name, matches "Dr. Boudjeriou" line in reference */}
      <div className="flex items-center justify-center gap-2 mb-7">
        <div className="auth-logo-badge">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
            <path d="M10 3v14M3 10h14" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <span className="text-sm font-medium text-neutral-600">MediKeep</span>
      </div>

      {serverError && (
        <div className="mb-4 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs text-center">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Email — label sits inline as placeholder-style like the image */}
        <div>
          <input
            {...register('email')}
            type="email"
            placeholder="Email..."
            className="input-sketch"
            autoComplete="email"
          />
          {errors.email && <p className="mt-1 text-xs text-red-500 px-1">{errors.email.message}</p>}
        </div>

        <div>
          <input
            {...register('password')}
            type="password"
            placeholder="Mot de passe..."
            className="input-sketch"
            autoComplete="current-password"
          />
          {errors.password && <p className="mt-1 text-xs text-red-500 px-1">{errors.password.message}</p>}
        </div>



        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full mt-2 bg-primary-500 hover:bg-primary-600 text-white rounded-full py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
        >
          {isSubmitting ? 'Connexion…' : 'Connexion'}
        </button>
      </form>

      <p className="mt-5 text-center text-xs text-neutral-400">
        Pas de compte ?{' '}
        <Link href="/register" className="text-primary-600 font-semibold hover:text-primary-700">
          S&apos;inscrire
        </Link>
      </p>
    </AuthLayout>
  )
}
