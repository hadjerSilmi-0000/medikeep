'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Avatar } from '@/components/ui/Avatar'
import { StatusBadge, RoleBadge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDateTime, calculateAge } from '@/lib/utils'
import api from '@/lib/api'

const TABS = ['Appointments', 'Prescriptions']

export default function PatientDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [tab, setTab] = useState('Appointments')

  const { data: patientsData, isLoading: loadingPatient } = useQuery({
    queryKey: ['patients-all'],
    queryFn: () => api.get('/doctor/patients', { params: { page: 1, limit: 200 } }).then(r => r.data.data || []),
  })

  const patient = patientsData?.find(p => String(p.id || p.patient_user_id) === String(id))

  const { data: appointments, isLoading: loadingApts } = useQuery({
    queryKey: ['patient-appointments', id],
    queryFn: () => api.get('/appointments/doctor-appointments', { params: { page: 1, limit: 50 } })
      .then(r => (r.data.data || []).filter(a => String(a.patient_id || a.patient_user_id) === String(id))),
    enabled: tab === 'Appointments',
  })

  const { data: prescriptions, isLoading: loadingRx } = useQuery({
    queryKey: ['patient-prescriptions', id],
    queryFn: () => api.get('/prescriptions', { params: { page: 1, limit: 50 } })
      .then(r => (r.data.data || []).filter(rx => String(rx.patient_id || rx.patient_user_id) === String(id))),
    enabled: tab === 'Prescriptions',
  })

  if (loadingPatient) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>
  if (!patient) return (
    <div className="text-center py-16">
      <p className="text-neutral-400 mb-4">Patient not found</p>
      <button onClick={() => router.back()} className="btn-ghost px-5 py-2.5 text-sm">Go back</button>
    </div>
  )

  return (
    <ProtectedRoute roles={['doctor']}>
      <div className="max-w-5xl space-y-6">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-neutral-400 hover:text-primary-600 transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back to patients
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patient info card */}
          <div className="card space-y-5">
            <div className="flex flex-col items-center text-center">
              <Avatar name={patient.name} size="xl" className="mb-3" />
              <h2 className="text-lg font-bold text-neutral-800">{patient.name}</h2>
              <p className="text-sm text-neutral-400">{patient.email}</p>
              <RoleBadge role="patient" />
            </div>
            <div className="space-y-3 pt-3 border-t border-neutral-100 text-sm">
              {[
                { label: 'Gender', value: patient.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1) : '—' },
                { label: 'Age', value: patient.birthdate ? calculateAge(patient.birthdate) + ' years' : '—' },
                { label: 'Phone', value: patient.phone || '—' },
                { label: 'Address', value: patient.address || '—' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <span className="text-neutral-400">{label}</span>
                  <span className="font-medium text-neutral-700 text-right max-w-[150px]">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex gap-1 bg-primary-50 rounded-2xl p-1">
              {TABS.map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    tab === t ? 'bg-white text-primary-700 shadow-card' : 'text-neutral-400 hover:text-neutral-600'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {tab === 'Appointments' && (
              <div className="card p-0 overflow-hidden">
                {loadingApts ? (
                  <div className="flex justify-center py-12"><Spinner /></div>
                ) : !appointments?.length ? (
                  <EmptyState title="No appointments" description="No shared appointments with this patient yet." />
                ) : (
                  <div className="divide-y divide-neutral-50">
                    {appointments.map(apt => (
                      <div key={apt.id} className="flex items-center justify-between px-5 py-4 hover:bg-primary-50/30 transition-colors">
                        <div>
                          <p className="text-sm font-medium text-neutral-700">{formatDateTime(apt.date_time)}</p>
                          {apt.reason && <p className="text-xs text-neutral-400 mt-0.5">{apt.reason}</p>}
                        </div>
                        <StatusBadge status={apt.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'Prescriptions' && (
              <div className="card p-0 overflow-hidden">
                {loadingRx ? (
                  <div className="flex justify-center py-12"><Spinner /></div>
                ) : !prescriptions?.length ? (
                  <EmptyState title="No prescriptions" description="No prescriptions issued to this patient yet." />
                ) : (
                  <div className="divide-y divide-neutral-50">
                    {prescriptions.map(rx => (
                      <div key={rx.id} className="px-5 py-4 hover:bg-primary-50/30 transition-colors">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-semibold text-neutral-700">{rx.medication}</p>
                            <p className="text-xs text-neutral-400 mt-0.5">Dosage: {rx.dosage}</p>
                            {rx.notes && <p className="text-xs text-neutral-400 mt-0.5">{rx.notes}</p>}
                          </div>
                          <span className="text-xs text-neutral-300">{formatDateTime(rx.created_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
