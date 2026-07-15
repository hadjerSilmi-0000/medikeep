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

const step1Schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

function PasswordStrength({ password = '' }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ]
  const score = checks.filter(Boolean).length
  const colors = ['bg-red-400', 'bg-amber-400', 'bg-amber-400', 'bg-primary-400', 'bg-primary-600']
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong']
  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[0,1,2,3].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < score ? colors[score] : 'bg-neutral-100'}`} />
        ))}
      </div>
      {password && <p className="text-xs text-neutral-400">{labels[score]}</p>}
    </div>
  )
}

export default function RegisterPage() {
  const { register: authRegister } = useAuth()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({})
  const [role, setRole] = useState('')
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(step1Schema),
  })
  const password = watch('password', '')

  const onStep1 = (data) => {
    setFormData(data)
    setStep(2)
  }

  const onSubmit = async () => {
    if (!role) return
    setLoading(true)
    setServerError('')
    try {
      await authRegister({ ...formData, role })
      router.push('/login?registered=1')
    } catch (err) {
      const msg = getApiError(err)
      if (err?.response?.status === 409) {
        setServerError('An account with this email already exists.')
        setStep(1)
      } else {
        setServerError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div>
        <h1 className="text-3xl font-bold text-primary-900 mb-1">Create account</h1>
        <p className="text-neutral-400 text-sm mb-6">Join MediKeep today</p>

        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-8">
          {[1, 2].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                s < step ? 'bg-primary-600 text-white' : s === step ? 'bg-primary-600 text-white' : 'bg-neutral-100 text-neutral-400'
              }`}>
                {s < step ? '✓' : s}
              </div>
              <span className={`text-xs font-medium ${s === step ? 'text-primary-700' : 'text-neutral-400'}`}>
                {s === 1 ? 'Account' : 'Role'}
              </span>
              {s < 2 && <div className={`flex-1 h-px w-8 ${step > 1 ? 'bg-primary-300' : 'bg-neutral-100'}`} />}
            </div>
          ))}
        </div>

        {serverError && (
          <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {serverError}
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleSubmit(onStep1)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">Full name</label>
              <input {...register('name')} placeholder="Dr. John Smith" className="input-base" />
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">Email</label>
              <input {...register('email')} type="email" placeholder="you@example.com" className="input-base" />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">Password</label>
              <div className="relative">
                <input {...register('password')} type={showPassword ? 'text' : 'password'} placeholder="Min. 8 characters" className="input-base pr-12" />
                <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 px-1">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                </button>
              </div>
              <PasswordStrength password={password} />
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">Confirm password</label>
              <input {...register('confirmPassword')} type="password" placeholder="Repeat password" className="input-base" />
              {errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>}
            </div>
            <button type="submit" className="btn-primary w-full mt-2">Continue</button>
          </form>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm font-medium text-neutral-700 mb-4">I am joining as…</p>
            {[
              { value: 'doctor',  title: 'Doctor',  desc: 'Manage patients, appointments & prescriptions' },
              { value: 'patient', title: 'Patient', desc: 'Book appointments and track your health' },
            ].map(({ value, title, desc }) => (
              <button
                key={value}
                onClick={() => setRole(value)}
                className={`w-full text-left px-5 py-4 rounded-2xl border-2 transition-all ${
                  role === value
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-neutral-200 bg-white hover:border-primary-200 hover:bg-primary-50/50'
                }`}
              >
                <p className={`font-semibold text-sm ${role === value ? 'text-primary-700' : 'text-neutral-700'}`}>{title}</p>
                <p className="text-xs text-neutral-400 mt-0.5">{desc}</p>
              </button>
            ))}

            <div className="flex gap-3 mt-6">
              <button onClick={() => setStep(1)} className="btn-ghost flex-1">Back</button>
              <button
                onClick={onSubmit}
                disabled={!role || loading}
                className="btn-primary flex-1"
              >
                {loading ? 'Creating account…' : 'Create Account'}
              </button>
            </div>
          </div>
        )}

        <p className="mt-6 text-center text-sm text-neutral-400">
          Already have an account?{' '}
          <Link href="/login" className="text-primary-600 font-semibold hover:text-primary-700">Sign in</Link>
        </p>
      </div>
    </AuthLayout>
  )
}
