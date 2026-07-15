'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'

const doctorLinks = [
  { href: '/dashboard',       label: 'Dashboard' },
  { href: '/appointments',    label: 'Appointments' },
  { href: '/patients',        label: 'My Patients' },
  { href: '/prescriptions',   label: 'Prescriptions' },
  { href: '/analytics',       label: 'Analytics' },
  { href: '/notifications',   label: 'Notifications' },
  { href: '/profile',         label: 'Profile' },
]

const patientLinks = [
  { href: '/dashboard',       label: 'Dashboard' },
  { href: '/appointments',    label: 'My Appointments' },
  { href: '/prescriptions',   label: 'Prescriptions' },
  { href: '/analytics',       label: 'Analytics' },
  { href: '/notifications',   label: 'Notifications' },
  { href: '/profile',         label: 'Profile' },
]

export function Sidebar({ unreadCount = 0, onClose }) {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const links = user?.role === 'doctor' ? doctorLinks : patientLinks

  return (
    <aside className="flex flex-col h-full w-64 bg-white border-r border-neutral-100">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-neutral-100">
        <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center flex-shrink-0">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 3v14M3 10h14" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </div>
        <span className="text-lg font-bold text-primary-900">MediKeep</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {links.map(({ href, label }) => {
          const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn('sidebar-link', isActive && 'active')}
            >
              <span className="flex-1">{label}</span>
              {label === 'Notifications' && unreadCount > 0 && (
                <span className="ml-auto bg-primary-600 text-white text-xs font-bold rounded-full px-2 py-0.5 min-w-[20px] text-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User + Logout */}
      <div className="px-4 py-4 border-t border-neutral-100">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
            {user?.name?.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-neutral-700 truncate">{user?.name}</p>
            <p className="text-xs text-neutral-400 capitalize">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium text-neutral-500 hover:text-red-600 hover:bg-red-50 transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
