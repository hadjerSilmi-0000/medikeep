export function StatusBadge({ status }) {
  const map = {
    pending:   { label: 'Pending',   cls: 'badge-pending' },
    confirmed: { label: 'Confirmed', cls: 'badge-confirmed' },
    completed: { label: 'Completed', cls: 'badge-completed' },
    cancelled: { label: 'Cancelled', cls: 'badge-cancelled' },
  }
  const { label, cls } = map[status] || { label: status, cls: 'badge-pending' }
  return <span className={cls}>{label}</span>
}

export function RoleBadge({ role }) {
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
      role === 'doctor'
        ? 'bg-primary-100 text-primary-700 border border-primary-200'
        : 'bg-blue-50 text-blue-700 border border-blue-200'
    }`}>
      {role === 'doctor' ? 'Doctor' : 'Patient'}
    </span>
  )
}

export function VerifiedBadge() {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
      Verified
    </span>
  )
}
