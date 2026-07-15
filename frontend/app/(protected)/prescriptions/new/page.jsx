'use client'
import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PageHeader } from '@/components/ui/PageHeader'
import { formatDateTime, getApiError } from '@/lib/utils'
import api from '@/lib/api'

export default function NewPrescriptionPage() {
  const router = useRouter()
  const [appointmentId, setAppointmentId] = useState('')
  const [medication, setMedication] = useState('')
  const [dosage, setDosage] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  const { data: appointments } = useQuery({
    queryKey: ['appointments-completed'],
    queryFn: () => api.get('/appointments/doctor-appointments', {
      params: { status: 'completed', page: 1, limit: 100 }
    }).then(r => r.data.data || []),
  })

  const submit = useMutation({
    mutationFn: () => api.post('/prescriptions', {
      appointment_id: Number(appointmentId),
      medication,
      dosage,
      notes: notes || undefined,
    }),
    onSuccess: () => router.push('/prescriptions'),
    onError: (err) => setError(getApiError(err)),
  })

  return (
    <ProtectedRoute roles={['doctor']}>
      <div className="max-w-lg">
        <PageHeader title="New prescription" subtitle="Issue a prescription for a completed appointment" />
        <div className="card space-y-5">
          {error && <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Appointment</label>
            <select value={appointmentId} onChange={e => setAppointmentId(e.target.value)} className="input-base" required>
              <option value="">Select appointment…</option>
              {(appointments || []).map(apt => (
                <option key={apt.id} value={apt.id}>
                  {apt.patient_name} — {formatDateTime(apt.date_time)}
                </option>
              ))}
            </select>
            {(!appointments || appointments.length === 0) && (
              <p className="mt-1.5 text-xs text-neutral-400">No completed appointments found.</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Medication</label>
            <input
              value={medication}
              onChange={e => setMedication(e.target.value)}
              placeholder="e.g. Amoxicillin"
              className="input-base"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Dosage</label>
            <input
              value={dosage}
              onChange={e => setDosage(e.target.value)}
              placeholder="e.g. 500mg — twice daily for 7 days"
              className="input-base"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Notes <span className="text-neutral-300 font-normal">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Additional instructions for the patient…"
              className="input-base resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => router.back()} className="btn-ghost flex-1">Cancel</button>
            <button
              onClick={() => submit.mutate()}
              disabled={!appointmentId || !medication || !dosage || submit.isPending}
              className="btn-primary flex-1"
            >
              {submit.isPending ? 'Saving…' : 'Issue prescription'}
            </button>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
