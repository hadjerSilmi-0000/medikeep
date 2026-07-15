export function StatsCard({ label, value, sub, color = 'primary' }) {
  const colors = {
    primary: 'bg-primary-50 border-primary-100',
    blue: 'bg-blue-50 border-blue-100',
    amber: 'bg-amber-50 border-amber-100',
    red: 'bg-red-50 border-red-100',
  }
  const valueColors = {
    primary: 'text-primary-700',
    blue: 'text-blue-700',
    amber: 'text-amber-700',
    red: 'text-red-600',
  }
  return (
    <div className={`rounded-2xl border p-5 ${colors[color]}`}>
      <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">{label}</p>
      <p className={`text-3xl font-bold ${valueColors[color]}`}>{value ?? '—'}</p>
      {sub && <p className="text-xs text-neutral-400 mt-1">{sub}</p>}
    </div>
  )
}
