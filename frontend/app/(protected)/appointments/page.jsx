'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/Badge'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmModal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { formatDateTime, getApiError } from '@/lib/utils'
import Link from 'next/link'
import api from '@/lib/api'

const STATUSES = ['', 'pending', 'confirmed', 'completed', 'cancelled']

export default function AppointmentsPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const isDoctor = user?.role === 'doctor'

  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [confirmModal, setConfirmModal] = useState(null) // { id, action }

  const { data, isLoading } = useQuery({
    queryKey: ['appointments', isDoctor, page, status, search, dateFrom, dateTo],
    queryFn: () => api.get(
      isDoctor ? '/appointments/doctor-appointments' : '/appointments/my-appointments',
      { params: { page, limit: 10, status: status || undefined, search: search || undefined, date_from: dateFrom || undefined, date_to: dateTo || undefined } }
    ).then(r => r.data),
    enabled: !!user,
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, newStatus }) =>
      isDoctor
        ? api.put(`/appointments/status/${id}`, { status: newStatus })
        : api.put(`/appointments/cancel/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['appointments'] }); setConfirmModal(null) },
  })

  const appointments = data?.data || []
  const pagination = data?.pagination || {}

  return (
    <div className="max-w-5xl space-y-5">
      <PageHeader
        title="Appointments"
        subtitle={isDoctor ? 'Manage your patient appointments' : 'Your upcoming and past appointments'}
        action={
          <Link href="/appointments/new" className="btn-primary text-sm px-4 py-2.5">
            {isDoctor ? 'Give appointment' : 'Book appointment'}
          </Link>
        }
      />

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3">
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder={isDoctor ? 'Search patient…' : 'Search doctor…'}
            className="input-base max-w-[220px] py-2.5 text-sm"
          />
          <select
            value={status}
            onChange={e => { setStatus(e.target.value); setPage(1) }}
            className="input-base max-w-[160px] py-2.5 text-sm"
          >
            {STATUSES.map(s => <option key={s} value={s}>{s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All statuses'}</option>)}
          </select>
          <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1) }} className="input-base max-w-[160px] py-2.5 text-sm" />
          <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1) }} className="input-base max-w-[160px] py-2.5 text-sm" />
          {(search || status || dateFrom || dateTo) && (
            <button onClick={() => { setSearch(''); setStatus(''); setDateFrom(''); setDateTo(''); setPage(1) }} className="text-sm text-neutral-400 hover:text-neutral-600 px-3 py-2">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48"><Spinner /></div>
        ) : appointments.length === 0 ? (
          <EmptyState title="No appointments found" description="Try adjusting your filters or book a new appointment." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 bg-primary-50/50">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-neutral-400 uppercase tracking-wide">
                    {isDoctor ? 'Patient' : 'Doctor'}
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-neutral-400 uppercase tracking-wide">Date & Time</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-neutral-400 uppercase tracking-wide">Reason</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-neutral-400 uppercase tracking-wide">Status</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-neutral-400 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {appointments.map(apt => (
                  <tr key={apt.id} className="hover:bg-primary-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-neutral-700">{isDoctor ? (apt.patient_name || '—') : (apt.doctor_name || '—')}</p>
                      {!isDoctor && apt.doctor_specialty && <p className="text-xs text-neutral-400">{apt.doctor_specialty}</p>}
                    </td>
                    <td className="px-6 py-4 text-neutral-500">{formatDateTime(apt.date_time)}</td>
                    <td className="px-6 py-4 text-neutral-500 max-w-[200px] truncate">{apt.reason || '—'}</td>
                    <td className="px-6 py-4"><StatusBadge status={apt.status} /></td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 justify-end">
                        {isDoctor && apt.status === 'pending' && (
                          <button
                            onClick={() => updateStatus.mutate({ id: apt.id, newStatus: 'confirmed' })}
                            className="text-xs px-3 py-1.5 rounded-lg bg-primary-50 text-primary-700 hover:bg-primary-100 font-medium transition-colors"
                          >
                            Confirm
                          </button>
                        )}
                        {isDoctor && apt.status === 'confirmed' && (
                          <button
                            onClick={() => updateStatus.mutate({ id: apt.id, newStatus: 'completed' })}
                            className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium transition-colors"
                          >
                            Complete
                          </button>
                        )}
                        {(apt.status === 'pending' || apt.status === 'confirmed') && (
                          <button
                            onClick={() => setConfirmModal({ id: apt.id, action: 'cancel' })}
                            className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-medium transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!isLoading && appointments.length > 0 && (
          <div className="px-6 py-4 border-t border-neutral-50">
            <Pagination page={page} total={pagination.total || 0} limit={10} onPageChange={setPage} />
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!confirmModal}
        onClose={() => setConfirmModal(null)}
        onConfirm={() => updateStatus.mutate({ id: confirmModal?.id, newStatus: 'cancelled' })}
        loading={updateStatus.isPending}
        title="Cancel appointment"
        message="Are you sure you want to cancel this appointment? This action cannot be undone."
        confirmLabel="Cancel appointment"
      />
    </div>
  )
}
