'use client'
import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import { getApiError } from '@/lib/utils'
import api from '@/lib/api'

export default function NewAppointmentPage() {
  const { user } = useAuth()
  const router = useRouter()

  if (!user) return <Spinner />
  if (user.role === 'doctor') return <DoctorForm />
  return <PatientBooking />
}

/* ── Doctor form ── */
function DoctorForm() {
  const router = useRouter()
  const [patientId, setPatientId] = useState('')
  const [dateTime, setDateTime] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  const { data: patientsData } = useQuery({
    queryKey: ['my-patients-select'],
    queryFn: () => api.get('/doctor/patients', { params: { page: 1, limit: 100 } }).then(r => r.data.data || []),
  })

  const submit = useMutation({
    mutationFn: () => api.post('/appointments/give', { patient_id: patientId, date_time: dateTime, reason }),
    onSuccess: () => router.push('/appointments'),
    onError: (err) => setError(getApiError(err)),
  })

  return (
    <div className="max-w-lg">
      <PageHeader title="Schedule appointment" subtitle="Assign an appointment to a patient" />
      <div className="card space-y-5">
        {error && <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">Patient</label>
          <select value={patientId} onChange={e => setPatientId(e.target.value)} className="input-base" required>
            <option value="">Select patient…</option>
            {(patientsData || []).map(p => (
              <option key={p.id || p.patient_user_id} value={p.id || p.patient_user_id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">Date & time</label>
          <input type="datetime-local" value={dateTime} onChange={e => setDateTime(e.target.value)} className="input-base" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">Reason (optional)</label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="Brief description…" className="input-base resize-none" />
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={() => router.back()} className="btn-ghost flex-1">Cancel</button>
          <button onClick={() => submit.mutate()} disabled={!patientId || !dateTime || submit.isPending} className="btn-primary flex-1">
            {submit.isPending ? 'Scheduling…' : 'Schedule appointment'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Patient booking (3 steps) ── */
function PatientBooking() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [selectedDoctor, setSelectedDoctor] = useState(null)
  const [dateTime, setDateTime] = useState('')
  const [reason, setReason] = useState('')
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  const { data: doctors, isLoading } = useQuery({
    queryKey: ['search-doctors', search],
    queryFn: () => api.get('/patients/search-doctors', { params: { name: search, page: 1, limit: 12 } }).then(r => r.data.data || []),
  })

  const book = useMutation({
    mutationFn: () => api.post('/appointments/book', { doctor_id: selectedDoctor.id, date_time: dateTime, reason }),
    onSuccess: () => router.push('/appointments'),
    onError: (err) => setError(getApiError(err)),
  })

  const steps = ['Find a doctor', 'Pick date & time', 'Confirm']

  return (
    <div className="max-w-2xl">
      <PageHeader title="Book an appointment" subtitle="Find a doctor and schedule your visit" />

      {/* Step bar */}
      <div className="flex items-center gap-2 mb-8">
        {steps.map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              i + 1 < step ? 'bg-primary-600 text-white' : i + 1 === step ? 'bg-primary-600 text-white' : 'bg-neutral-100 text-neutral-400'
            }`}>
              {i + 1 < step ? '✓' : i + 1}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${i + 1 === step ? 'text-primary-700' : 'text-neutral-400'}`}>{label}</span>
            {i < 2 && <div className={`w-8 h-px ${step > i + 1 ? 'bg-primary-300' : 'bg-neutral-100'}`} />}
          </div>
        ))}
      </div>

      {error && <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

      {step === 1 && (
        <div className="space-y-4">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or specialty…"
            className="input-base"
          />
          {isLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(doctors || []).map(doc => (
                <button
                  key={doc.id}
                  onClick={() => { setSelectedDoctor(doc); setStep(2) }}
                  className="card text-left hover:border-primary-300 hover:shadow-card-hover transition-all"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center text-sm font-semibold">
                      {doc.name?.split(' ').map(w => w[0]).join('').slice(0,2)}
                    </div>
                    <div>
                      <p className="font-semibold text-neutral-700 text-sm">{doc.name}</p>
                      <p className="text-xs text-primary-600">{doc.specialty}</p>
                    </div>
                  </div>
                  {doc.bio && <p className="text-xs text-neutral-400 line-clamp-2">{doc.bio}</p>}
                </button>
              ))}
              {!isLoading && (!doctors || doctors.length === 0) && (
                <p className="text-neutral-400 text-sm col-span-2 text-center py-8">No doctors found</p>
              )}
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="card space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-neutral-100">
            <div className="w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center text-sm font-semibold">
              {selectedDoctor?.name?.split(' ').map(w => w[0]).join('').slice(0,2)}
            </div>
            <div>
              <p className="font-semibold text-neutral-700">{selectedDoctor?.name}</p>
              <p className="text-xs text-primary-600">{selectedDoctor?.specialty}</p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Date & time</label>
            <input type="datetime-local" value={dateTime} onChange={e => setDateTime(e.target.value)} className="input-base"
              min={new Date().toISOString().slice(0,16)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Reason for visit</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="Briefly describe your symptoms or reason…" className="input-base resize-none" minLength={10} />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="btn-ghost flex-1">Back</button>
            <button onClick={() => dateTime && setStep(3)} disabled={!dateTime} className="btn-primary flex-1">Review</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card space-y-5">
          <h3 className="font-semibold text-neutral-700">Confirm your appointment</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-neutral-50">
              <span className="text-neutral-400">Doctor</span>
              <span className="font-medium text-neutral-700">{selectedDoctor?.name}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-neutral-50">
              <span className="text-neutral-400">Specialty</span>
              <span className="font-medium text-neutral-700">{selectedDoctor?.specialty}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-neutral-50">
              <span className="text-neutral-400">Date & time</span>
              <span className="font-medium text-neutral-700">{new Date(dateTime).toLocaleString()}</span>
            </div>
            {reason && (
              <div className="flex justify-between py-2">
                <span className="text-neutral-400">Reason</span>
                <span className="font-medium text-neutral-700 max-w-[200px] text-right">{reason}</span>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="btn-ghost flex-1">Back</button>
            <button onClick={() => book.mutate()} disabled={book.isPending} className="btn-primary flex-1">
              {book.isPending ? 'Booking…' : 'Confirm booking'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
