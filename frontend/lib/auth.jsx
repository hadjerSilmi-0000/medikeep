'use client'
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/profile')
      setUser(data.data || data.user || data)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchProfile() }, [fetchProfile])

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    await fetchProfile()
    return data
  }

  const logout = async () => {
    try { await api.post('/auth/logout') } catch {}
    setUser(null)
    window.location.href = '/login'
  }

  const register = async (payload) => {
    const { data } = await api.post('/auth/register', payload)
    return data
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, refetch: fetchProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
