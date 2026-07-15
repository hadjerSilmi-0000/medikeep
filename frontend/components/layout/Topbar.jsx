'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { Avatar } from '@/components/ui/Avatar'

export function Topbar({ title, unreadCount = 0, onMenuClick }) {
  const { user, logout } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  return (
    <header className="h-16 bg-white border-b border-neutral-100 flex items-center px-6 gap-4 flex-shrink-0">
      {/* Mobile hamburger */}
      <button
        onClick={onMenuClick}
        className="lg:hidden w-9 h-9 flex flex-col items-center justify-center gap-1.5 rounded-xl hover:bg-primary-50 transition-colors"
      >
        <span className="w-5 h-0.5 bg-neutral-600 rounded" />
        <span className="w-5 h-0.5 bg-neutral-600 rounded" />
        <span className="w-5 h-0.5 bg-neutral-600 rounded" />
      </button>

      {/* Page title */}
      <h2 className="flex-1 text-lg font-semibold text-neutral-800">{title}</h2>

      {/* Notification bell */}
      <Link href="/notifications" className="relative w-10 h-10 flex items-center justify-center rounded-xl hover:bg-primary-50 transition-colors">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#404040" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-primary-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Link>

      {/* Avatar dropdown */}
      <div className="relative">
        <button
          onClick={() => setDropdownOpen(v => !v)}
          className="flex items-center gap-2 rounded-xl p-1 hover:bg-primary-50 transition-colors"
        >
          <Avatar name={user?.name} size="sm" />
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="2" strokeLinecap="round">
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </button>
        {dropdownOpen && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setDropdownOpen(false)} />
            <div className="absolute right-0 top-12 z-30 w-52 bg-white rounded-2xl shadow-modal border border-neutral-100 py-2 overflow-hidden">
              <div className="px-4 py-3 border-b border-neutral-100">
                <p className="text-sm font-semibold text-neutral-700 truncate">{user?.name}</p>
                <p className="text-xs text-neutral-400 capitalize">{user?.role}</p>
              </div>
              <Link href="/profile" onClick={() => setDropdownOpen(false)} className="block px-4 py-2.5 text-sm text-neutral-600 hover:bg-primary-50 hover:text-primary-700 transition-colors">
                Profile
              </Link>
              <button onClick={() => { setDropdownOpen(false); logout() }} className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
