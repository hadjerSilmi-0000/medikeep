export function Spinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' }
  return (
    <div className={`inline-block rounded-full border-2 border-primary-200 border-t-primary-600 animate-spin ${sizes[size]} ${className}`} />
  )
}

export function PageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-primary-50">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="lg" />
        <p className="text-sm text-neutral-400 font-medium">Loading…</p>
      </div>
    </div>
  )
}
