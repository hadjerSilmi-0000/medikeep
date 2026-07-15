'use client'
import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(() => {})

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration)
  }, [])

  const remove = (id) => setToasts(prev => prev.filter(t => t.id !== id))

  const typeStyles = {
    success: 'bg-primary-600 text-white',
    error:   'bg-red-500 text-white',
    info:    'bg-neutral-800 text-white',
    warning: 'bg-amber-500 text-white',
  }

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none max-w-sm w-full">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`flex items-center gap-3 px-5 py-4 rounded-2xl shadow-lg text-sm font-medium pointer-events-auto ${typeStyles[t.type] || typeStyles.info}`}
          >
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => remove(t.id)}
              className="opacity-70 hover:opacity-100 text-xl leading-none flex-shrink-0"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// Keep Toaster as alias so existing imports still work
export const Toaster = ToastProvider

export function useToast() {
  return useContext(ToastContext)
}
