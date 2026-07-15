'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PageHeader } from '@/components/ui/PageHeader'
import { Avatar } from '@/components/ui/Avatar'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal, ConfirmModal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { calculateAge, getApiError } from '@/lib/utils'
import Link from 'next/link'
import api from '@/lib/api'

function PatientForm({ initial, onSubmit, loading, error }) {
  const [form, setForm] = useState(initial || { name: '', email: '', birthdate: '', gender: '', phone: '', address: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="space-y-4">
      {error && <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">Full name</label>
          <input value={form.name} onChange={e => set('name', e.target.value)} className="input-base" placeholder="Patient name" />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">Email</label>
          <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className="input-base" placeholder="patient@example.com" />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">Date of birth</label>
          <input type="date" value={form.birthdate} onChange={e => set('birthdate', e.target.value)} className="input-base" />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">Gender</label>
          <select value={form.gender} onChange={e => set('gender', e.target.value)} className="input-base">
            <option value="">Select…</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">Phone</label>
          <input value={form.phone} onChange={e => set('phone', e.target.value)} className="input-base" placeholder="+213…" />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">Address</label>
          <input value={form.address} onChange={e => set('address', e.target.value)} className="input-base" placeholder="City, country" />
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button onClick={() => onSubmit(form)} disabled={loading} className="btn-primary flex-1">
          {loading ? 'Saving…' : 'Save patient'}
        </button>
      </div>
    </div>
  )
}

export default function PatientsPage() {
  const qc = useQueryClient()
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [gender, setGender] = useState('')
  const [addModal, setAddModal] = useState(false)
  const [editModal, setEditModal] = useState(null)
  const [deleteModal, setDeleteModal] = useState(null)
  const [formError, setFormError] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['patients', page, search, gender],
    queryFn: () => api.get('/doctor/patients', { params: { page, limit: 10, search: search || undefined, gender: gender || undefined } }).then(r => r.data),
  })

  const addPatient = useMutation({
    mutationFn: (body) => api.post('/doctor/patients', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['patients'] }); setAddModal(false); setFormError('') },
    onError: (err) => setFormError(getApiError(err)),
  })

  const editPatient = useMutation({
    mutationFn: ({ id, ...body }) => api.put(`/doctor/patients/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['patients'] }); setEditModal(null); setFormError('') },
    onError: (err) => setFormError(getApiError(err)),
  })

  const deletePatient = useMutation({
    mutationFn: (id) => api.delete(`/doctor/patients/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['patients'] }); setDeleteModal(null) },
  })

  const patients = data?.data || []
  const pagination = data?.pagination || {}

  return (
    <ProtectedRoute roles={['doctor']}>
      <div className="max-w-5xl space-y-5">
        <PageHeader
          title="My Patients"
          subtitle="Manage your linked patients"
          action={
            <button onClick={() => { setFormError(''); setAddModal(true) }} className="btn-primary text-sm px-4 py-2.5">
              Add patient
            </button>
          }
        />

        <div className="card p-4">
          <div className="flex flex-wrap gap-3">
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search name or email…" className="input-base max-w-[240px] py-2.5 text-sm" />
            <select value={gender} onChange={e => { setGender(e.target.value); setPage(1) }} className="input-base max-w-[150px] py-2.5 text-sm">
              <option value="">All genders</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div className="card p-0 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-48"><Spinner /></div>
          ) : patients.length === 0 ? (
            <EmptyState title="No patients yet" description="Add your first patient to get started." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-100 bg-primary-50/50">
                    <th className="text-left px-6 py-4 text-xs font-semibold text-neutral-400 uppercase tracking-wide">Patient</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-neutral-400 uppercase tracking-wide">Gender</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-neutral-400 uppercase tracking-wide">Age</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-neutral-400 uppercase tracking-wide">Phone</th>
                    <th className="text-right px-6 py-4 text-xs font-semibold text-neutral-400 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {patients.map(p => (
                    <tr key={p.id || p.patient_user_id} className="hover:bg-primary-50/30 transition-colors">
                      <td className="px-6 py-4">
                        <Link href={`/patients/${p.id || p.patient_user_id}`} className="flex items-center gap-3 group">
                          <Avatar name={p.name} size="sm" />
                          <div>
                            <p className="font-medium text-neutral-700 group-hover:text-primary-600 transition-colors">{p.name}</p>
                            <p className="text-xs text-neutral-400">{p.email}</p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-neutral-500 capitalize">{p.gender || '—'}</td>
                      <td className="px-6 py-4 text-neutral-500">{p.birthdate ? calculateAge(p.birthdate) + ' yrs' : '—'}</td>
                      <td className="px-6 py-4 text-neutral-500">{p.phone || '—'}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 justify-end">
                          <button onClick={() => { setFormError(''); setEditModal(p) }} className="text-xs px-3 py-1.5 rounded-lg bg-primary-50 text-primary-700 hover:bg-primary-100 font-medium transition-colors">Edit</button>
                          <button onClick={() => setDeleteModal(p)} className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-medium transition-colors">Unlink</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!isLoading && patients.length > 0 && (
            <div className="px-6 py-4 border-t border-neutral-50">
              <Pagination page={page} total={pagination.total || 0} limit={10} onPageChange={setPage} />
            </div>
          )}
        </div>
      </div>

      <Modal open={addModal} onClose={() => setAddModal(false)} title="Add patient">
        <PatientForm onSubmit={(form) => addPatient.mutate(form)} loading={addPatient.isPending} error={formError} />
      </Modal>

      <Modal open={!!editModal} onClose={() => setEditModal(null)} title="Edit patient">
        {editModal && (
          <PatientForm
            initial={editModal}
            onSubmit={(form) => editPatient.mutate({ id: editModal.id || editModal.patient_user_id, ...form })}
            loading={editPatient.isPending}
            error={formError}
          />
        )}
      </Modal>

      <ConfirmModal
        open={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        onConfirm={() => deletePatient.mutate(deleteModal?.id || deleteModal?.patient_user_id)}
        loading={deletePatient.isPending}
        title="Unlink patient"
        message={`Remove ${deleteModal?.name} from your patient list? Their records will remain intact.`}
        confirmLabel="Unlink"
      />
    </ProtectedRoute>
  )
}
