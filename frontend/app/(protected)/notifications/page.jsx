'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatRelativeTime } from '@/lib/utils'
import api from '@/lib/api'

const typeColors = {
  appointment: 'bg-primary-500',
  prescription: 'bg-blue-500',
  system: 'bg-neutral-300',
}

export default function NotificationsPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', page],
    queryFn: () => api.get('/notifications', {
      params: { page, limit: 15, sortBy: 'created_at', order: 'DESC' }
    }).then(r => r.data),
  })

  const { data: stats } = useQuery({
    queryKey: ['notif-stats'],
    queryFn: () => api.get('/notifications/stats').then(r => r.data.stats),
  })

  const markOne = useMutation({
    mutationFn: (id) => api.put(`/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['notif-stats'] })
    },
  })

  const markAll = useMutation({
    mutationFn: () => api.put('/notifications/mark-all-read'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['notif-stats'] })
    },
  })

  const notifications = data?.data || []
  const pagination = data?.pagination || {}
  const totalPages = Math.ceil((pagination.total || 0) / 15)

  return (
    <div className="max-w-2xl space-y-5">
      <PageHeader
        title="Notifications"
        subtitle={stats?.unread ? `${stats.unread} unread` : 'All caught up'}
        action={
          stats?.unread > 0 && (
            <button
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending}
              className="btn-ghost text-sm px-4 py-2.5"
            >
              Mark all read
            </button>
          )
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : notifications.length === 0 ? (
        <EmptyState title="No notifications" description="You're all caught up. New notifications will appear here." />
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div
              key={n.id}
              className={`card relative overflow-hidden transition-all ${
                !n.is_read ? 'bg-primary-50/60 border-primary-200' : 'bg-white'
              }`}
            >
              {/* Color strip by type */}
              <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${typeColors[n.type] || 'bg-neutral-200'}`} />

              <div className="pl-3 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${!n.is_read ? 'font-semibold text-neutral-800' : 'font-medium text-neutral-600'}`}>
                    {n.title}
                  </p>
                  {n.message && (
                    <p className="text-sm text-neutral-400 mt-0.5">{n.message}</p>
                  )}
                  <p className="text-xs text-neutral-300 mt-1.5">{formatRelativeTime(n.created_at)}</p>
                </div>
                {!n.is_read && (
                  <button
                    onClick={() => markOne.mutate(n.id)}
                    className="flex-shrink-0 text-xs text-primary-600 font-medium hover:text-primary-700 transition-colors mt-0.5"
                  >
                    Mark read
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load more */}
      {page < totalPages && (
        <div className="flex justify-center pt-2">
          <button
            onClick={() => setPage(p => p + 1)}
            className="btn-ghost text-sm px-6 py-2.5"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  )
}
