'use client'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { connectSocket, disconnectSocket, getSocket } from '@/lib/socket'
import { useAuth } from '@/lib/auth'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

const pageTitles = {
  '/dashboard':       'Dashboard',
  '/appointments':    'Appointments',
  '/appointments/new':'New Appointment',
  '/patients':        'Patients',
  '/prescriptions':   'Prescriptions',
  '/prescriptions/new':'New Prescription',
  '/notifications':   'Notifications',
  '/profile':         'Profile',
  '/analytics':       'Analytics',
}

export function AppShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: notifStats } = useQuery({
    queryKey: ['notif-stats'],
    queryFn: () => api.get('/notifications/stats').then(r => r.data.stats),
    refetchInterval: 60000,
  })

  // Socket for real-time notifications
  useEffect(() => {
    if (!user) return
    const socket = connectSocket()
    socket.on('notification', () => {
      queryClient.invalidateQueries({ queryKey: ['notif-stats'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    })
    return () => {
      socket.off('notification')
      disconnectSocket()
    }
  }, [user, queryClient])

  const title = pageTitles[pathname] || pageTitles[Object.keys(pageTitles).find(k => pathname.startsWith(k) && k !== '/') || ''] || 'MediKeep'
  const unread = notifStats?.unread || 0

  return (
    <div className="flex h-screen bg-primary-50 overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <Sidebar unreadCount={unread} />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-neutral-900/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden">
            <Sidebar unreadCount={unread} onClose={() => setSidebarOpen(false)} />
          </div>
        </>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar title={title} unreadCount={unread} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
