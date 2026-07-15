import { clsx } from 'clsx'
import { formatDistanceToNow, format } from 'date-fns'

export function cn(...args) {
  return clsx(...args)
}

export function formatRelativeTime(date) {
  if (!date) return ''
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function formatDate(date, pattern = 'MMM d, yyyy') {
  if (!date) return ''
  return format(new Date(date), pattern)
}

export function formatDateTime(date) {
  if (!date) return ''
  return format(new Date(date), 'MMM d, yyyy · HH:mm')
}

export function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

export function getApiError(error) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    'Something went wrong'
  )
}

export function calculateAge(birthdate) {
  if (!birthdate) return null
  const today = new Date()
  const birth = new Date(birthdate)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}
