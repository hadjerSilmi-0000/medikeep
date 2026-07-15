export function EmptyState({ title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary-50 border border-primary-100 flex items-center justify-center mb-4">
        <div className="w-8 h-8 rounded-full bg-primary-100" />
      </div>
      <h3 className="text-base font-semibold text-neutral-700 mb-1">{title}</h3>
      {description && <p className="text-sm text-neutral-400 max-w-xs mb-6">{description}</p>}
      {action}
    </div>
  )
}
