'use client'

export function Pagination({ page, total, limit, onPageChange }) {
  const totalPages = Math.ceil(total / limit)
  if (totalPages <= 1) return null

  const pages = []
  const delta = 2
  for (let i = Math.max(1, page - delta); i <= Math.min(totalPages, page + delta); i++) {
    pages.push(i)
  }

  return (
    <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
      <p className="text-sm text-neutral-400">
        Page {page} of {totalPages} &mdash; {total} total
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="px-3 py-2 rounded-xl text-sm font-medium text-neutral-600 hover:bg-primary-50 hover:text-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Prev
        </button>
        {pages[0] > 1 && (
          <>
            <button onClick={() => onPageChange(1)} className="px-3 py-2 rounded-xl text-sm font-medium text-neutral-600 hover:bg-primary-50">1</button>
            {pages[0] > 2 && <span className="px-2 text-neutral-300">…</span>}
          </>
        )}
        {pages.map(p => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
              p === page
                ? 'bg-primary-600 text-white'
                : 'text-neutral-600 hover:bg-primary-50 hover:text-primary-700'
            }`}
          >
            {p}
          </button>
        ))}
        {pages[pages.length - 1] < totalPages && (
          <>
            {pages[pages.length - 1] < totalPages - 1 && <span className="px-2 text-neutral-300">…</span>}
            <button onClick={() => onPageChange(totalPages)} className="px-3 py-2 rounded-xl text-sm font-medium text-neutral-600 hover:bg-primary-50">{totalPages}</button>
          </>
        )}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="px-3 py-2 rounded-xl text-sm font-medium text-neutral-600 hover:bg-primary-50 hover:text-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  )
}
