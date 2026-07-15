'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal, ConfirmModal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { formatDateTime, getApiError } from '@/lib/utils'
import Link from 'next/link'
import api from '@/lib/api'

function EditRxModal({ rx, onClose }) {
  const qc = useQueryClient()
  const [medication, setMedication] = useState(rx.medication || '')
  const [dosage, setDosage] = useState(rx.dosage || '')
  const [notes, setNotes] = useState(rx.notes || '')
  const [error, setError] = useState('')

  const update = useMutation({
    mutationFn: () => api.put(`/prescriptions/${rx.id}`, { medication, dosage, notes }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['prescriptions'] }); onClose() },
    onError: (err) => setError(getApiError(err)),
  })

  return (
    <div className="space-y-4">
      {error && <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1.5">Medication</label>
        <input value={medication} onChange={e => setMedication(e.target.value)} className="input-base" />
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1.5">Dosage</label>
        <input value={dosage} onChange={e => setDosage(e.target.value)} className="input-base" placeholder="e.g. 500mg twice daily" />
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1.5">Notes</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="input-base resize-none" />
      </div>
      <button onClick={() => update.mutate()} disabled={update.isPending} className="btn-primary w-full">
        {update.isPending ? 'Saving…' : 'Save changes'}
      </button>
    </div>
  )
}

export default function PrescriptionsPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const isDoctor = user?.role === 'doctor'
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [editModal, setEditModal] = useState(null)
  const [deleteModal, setDeleteModal] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['prescriptions', isDoctor, page, search],
    queryFn: () => api.get(
      isDoctor ? '/prescriptions' : '/prescriptions/my-prescriptions',
      { params: { page, limit: 10, search: search || undefined, sortBy: 'created_at', order: 'DESC' } }
    ).then(r => r.data),
    enabled: !!user,
  })

  const deleteRx = useMutation({
    mutationFn: (id) => api.delete(`/prescriptions/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['prescriptions'] }); setDeleteModal(null) },
  })

  const downloadPdf = async (id) => {
    try {
      const res = await api.get(`/prescriptions/${id}/pdf`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      window.open(url, '_blank')
    } catch {
      alert('PDF not available')
    }
  }

  const prescriptions = data?.data || []
  const pagination = data?.pagination || {}

  return (
    <div className="max-w-5xl space-y-5">
      <PageHeader
        title="Prescriptions"
        subtitle={isDoctor ? 'Prescriptions you have issued' : 'Your prescriptions from doctors'}
        action={isDoctor && (
          <Link href="/prescriptions/new" className="btn-primary text-sm px-4 py-2.5">New prescription</Link>
        )}
      />

      <div className="card p-4">
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder={isDoctor ? 'Search patient or medication…' : 'Search medication…'}
          className="input-base max-w-[300px] py-2.5 text-sm"
        />
      </div>

      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48"><Spinner /></div>
        ) : prescriptions.length === 0 ? (
          <EmptyState title="No prescriptions" description={isDoctor ? 'Create your first prescription.' : 'No prescriptions have been issued yet.'} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 bg-primary-50/50">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-neutral-400 uppercase tracking-wide">
                    {isDoctor ? 'Patient' : 'Doctor'}
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-neutral-400 uppercase tracking-wide">Medication</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-neutral-400 uppercase tracking-wide">Dosage</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-neutral-400 uppercase tracking-wide">Date</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-neutral-400 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {prescriptions.map(rx => (
                  <tr key={rx.id} className="hover:bg-primary-50/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-neutral-700">
                      {isDoctor ? (rx.patient_name || '—') : (rx.doctor_name || '—')}
                    </td>
                    <td className="px-6 py-4 text-neutral-700 font-medium">{rx.medication}</td>
                    <td className="px-6 py-4 text-neutral-500">{rx.dosage}</td>
                    <td className="px-6 py-4 text-neutral-400 text-xs">{formatDateTime(rx.created_at)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => downloadPdf(rx.id)} className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium transition-colors">
                          PDF
                        </button>
                        {isDoctor && (
                          <>
                            <button onClick={() => setEditModal(rx)} className="text-xs px-3 py-1.5 rounded-lg bg-primary-50 text-primary-700 hover:bg-primary-100 font-medium transition-colors">Edit</button>
                            <button onClick={() => setDeleteModal(rx)} className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-medium transition-colors">Delete</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!isLoading && prescriptions.length > 0 && (
          <div className="px-6 py-4 border-t border-neutral-50">
            <Pagination page={page} total={pagination.total || 0} limit={10} onPageChange={setPage} />
          </div>
        )}
      </div>

      <Modal open={!!editModal} onClose={() => setEditModal(null)} title="Edit prescription">
        {editModal && <EditRxModal rx={editModal} onClose={() => setEditModal(null)} />}
      </Modal>

      <ConfirmModal
        open={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        onConfirm={() => deleteRx.mutate(deleteModal?.id)}
        loading={deleteRx.isPending}
        title="Delete prescription"
        message={`Delete prescription for ${deleteModal?.medication}? This cannot be undone.`}
        confirmLabel="Delete"
      />
    </div>
  )
}
