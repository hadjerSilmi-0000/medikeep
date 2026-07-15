'use client'
import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import { PageHeader } from '@/components/ui/PageHeader'
import { Avatar } from '@/components/ui/Avatar'
import { RoleBadge, VerifiedBadge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { getApiError } from '@/lib/utils'
import api from '@/lib/api'

export default function ProfilePage() {
  const { user, refetch, loading } = useAuth()
  const isDoctor = user?.role === 'doctor'

  const [form, setForm] = useState({})
  const [pwForm, setPwForm] = useState({ current: '', password: '', confirm: '' })
  const [profileSuccess, setProfileSuccess] = useState(false)
  const [pwSuccess, setPwSuccess] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [pwError, setPwError] = useState('')

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || user.doctor_phone || '',
        specialty: user.specialty || '',
        bio: user.bio || '',
        birthdate: user.birthdate || '',
        gender: user.gender || '',
        address: user.address || '',
      })
    }
  }, [user])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const updateProfile = useMutation({
    mutationFn: () => {
      const endpoint = isDoctor ? '/doctor/profile' : '/patients/profile'
      return api.put(endpoint, form)
    },
    onSuccess: () => { setProfileSuccess(true); setProfileError(''); refetch(); setTimeout(() => setProfileSuccess(false), 3000) },
    onError: (err) => { setProfileError(getApiError(err)); setProfileSuccess(false) },
  })

  const changePassword = useMutation({
    mutationFn: () => {
      if (pwForm.password !== pwForm.confirm) throw new Error('Passwords do not match')
      return api.post('/auth/change-password', { current_password: pwForm.current, password: pwForm.password })
    },
    onSuccess: () => { setPwSuccess(true); setPwError(''); setPwForm({ current: '', password: '', confirm: '' }); setTimeout(() => setPwSuccess(false), 3000) },
    onError: (err) => { setPwError(err.message || getApiError(err)); setPwSuccess(false) },
  })

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Profile" subtitle="Manage your account information" />

      {/* Account summary */}
      <div className="card flex items-center gap-5">
        <Avatar name={user?.name} size="xl" />
        <div>
          <h2 className="text-lg font-bold text-neutral-800">{user?.name}</h2>
          <p className="text-sm text-neutral-400 mb-2">{user?.email}</p>
          <div className="flex items-center gap-2">
            <RoleBadge role={user?.role} />
            {user?.email_verified && <VerifiedBadge />}
          </div>
        </div>
      </div>

      {/* Edit form */}
      <div className="card space-y-5">
        <h3 className="text-base font-semibold text-neutral-700 border-b border-neutral-100 pb-3">Account details</h3>

        {profileError && <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{profileError}</div>}
        {profileSuccess && <div className="px-4 py-3 rounded-xl bg-primary-50 border border-primary-200 text-primary-700 text-sm">Profile updated successfully.</div>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Full name</label>
            <input value={form.name || ''} onChange={e => set('name', e.target.value)} className="input-base" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Email</label>
            <input type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} className="input-base" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Phone</label>
            <input value={form.phone || ''} onChange={e => set('phone', e.target.value)} className="input-base" placeholder="+213…" />
          </div>

          {isDoctor ? (
            <>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Specialty</label>
                <input value={form.specialty || ''} onChange={e => set('specialty', e.target.value)} className="input-base" placeholder="e.g. Orthopedics" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Bio</label>
                <textarea value={form.bio || ''} onChange={e => set('bio', e.target.value)} rows={3} className="input-base resize-none" placeholder="Brief professional bio…" />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Date of birth</label>
                <input type="date" value={form.birthdate || ''} onChange={e => set('birthdate', e.target.value)} className="input-base" />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Gender</label>
                <select value={form.gender || ''} onChange={e => set('gender', e.target.value)} className="input-base">
                  <option value="">Select…</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Address</label>
                <input value={form.address || ''} onChange={e => set('address', e.target.value)} className="input-base" placeholder="City, country" />
              </div>
            </>
          )}
        </div>

        <button
          onClick={() => updateProfile.mutate()}
          disabled={updateProfile.isPending}
          className="btn-primary w-full"
        >
          {updateProfile.isPending ? 'Saving…' : 'Save changes'}
        </button>
      </div>

      {/* Password change */}
      <div className="card space-y-5">
        <h3 className="text-base font-semibold text-neutral-700 border-b border-neutral-100 pb-3">Change password</h3>

        {pwError && <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{pwError}</div>}
        {pwSuccess && <div className="px-4 py-3 rounded-xl bg-primary-50 border border-primary-200 text-primary-700 text-sm">Password updated successfully.</div>}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Current password</label>
            <input type="password" value={pwForm.current} onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))} className="input-base" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">New password</label>
            <input type="password" value={pwForm.password} onChange={e => setPwForm(f => ({ ...f, password: e.target.value }))} className="input-base" minLength={8} />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Confirm new password</label>
            <input type="password" value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} className="input-base" />
          </div>
        </div>

        <button
          onClick={() => changePassword.mutate()}
          disabled={!pwForm.current || !pwForm.password || changePassword.isPending}
          className="btn-primary w-full"
        >
          {changePassword.isPending ? 'Updating…' : 'Change password'}
        </button>
      </div>
    </div>
  )
}
