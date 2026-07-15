'use client'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import { StatsCard } from '@/components/ui/StatsCard'
import { StatusBadge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { formatDateTime } from '@/lib/utils'
import Link from 'next/link'
import api from '@/lib/api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

export default function DashboardPage() {
  const { user } = useAuth()
  const isDoctor = user?.role === 'doctor'

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-analytics', user?.role],
    queryFn: () => api.get(isDoctor ? '/analytics/doctor' : '/analytics/patient').then(r => r.data.data),
    enabled: !!user,
  })

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Spinner size="lg" />
    </div>
  )

  if (isDoctor) return <DoctorDashboard data={data} user={user} />
  return <PatientDashboard data={data} user={user} />
}

function DoctorDashboard({ data = {}, user }) {
  const monthly = data.monthlyStats || []

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-primary-900">Good morning, {user?.name?.split(' ')[0]}</h1>
        <p className="text-neutral-400 text-sm mt-0.5">Here&apos;s your clinic overview</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard label="Total Patients"      value={data.patientCount}           color="primary" />
        <StatsCard label="Upcoming"            value={data.upcomingAppointments}    color="blue" />
        <StatsCard label="Today"               value={data.todayAppointments}       color="amber" />
        <StatsCard label="Prescriptions"       value={data.prescriptionCount}       color="primary" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly chart */}
        <div className="card lg:col-span-2">
          <h3 className="text-base font-semibold text-neutral-700 mb-4">Appointments — last 6 months</h3>
          {monthly.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthly} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0fdf4" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#a3a3a3' }} />
                <YAxis tick={{ fontSize: 12, fill: '#a3a3a3' }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #dcfce7', fontSize: 12 }} />
                <Bar dataKey="appointments" fill="#16a34a" radius={[6, 6, 0, 0]} name="Total" />
                <Bar dataKey="completed" fill="#bbf7d0" radius={[6, 6, 0, 0]} name="Completed" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-neutral-300 text-sm">No data yet</div>
          )}
        </div>

        {/* Today's schedule */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-neutral-700">Today</h3>
            <Link href="/appointments" className="text-xs text-primary-600 font-medium">View all</Link>
          </div>
          {data.todayAppointmentsList?.length ? (
            <div className="space-y-3">
              {data.todayAppointmentsList.slice(0, 5).map(apt => (
                <div key={apt.id} className="flex items-center justify-between py-2 border-b border-neutral-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-neutral-700">{apt.patient_name || 'Patient'}</p>
                    <p className="text-xs text-neutral-400">{formatDateTime(apt.date_time)}</p>
                  </div>
                  <StatusBadge status={apt.status} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-300 text-center py-8">No appointments today</p>
          )}
        </div>
      </div>
    </div>
  )
}

function PatientDashboard({ data = {}, user }) {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-primary-900">Hello, {user?.name?.split(' ')[0]}</h1>
        <p className="text-neutral-400 text-sm mt-0.5">Your health at a glance</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard label="Total Appointments"  value={data.totalAppointments}      color="primary" />
        <StatsCard label="Upcoming"            value={data.upcomingAppointments}   color="blue" />
        <StatsCard label="Prescriptions"       value={data.prescriptionCount}      color="amber" />
        <StatsCard label="Doctors Visited"     value={data.doctorsVisited}         color="primary" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Last appointment */}
        {data.lastAppointment && (
          <div className="card">
            <h3 className="text-base font-semibold text-neutral-700 mb-4">Last appointment</h3>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-neutral-700">{data.lastAppointment.doctor_name}</p>
                <p className="text-xs text-neutral-400 mt-0.5">{formatDateTime(data.lastAppointment.date_time)}</p>
                {data.lastAppointment.reason && (
                  <p className="text-sm text-neutral-500 mt-2">{data.lastAppointment.reason}</p>
                )}
              </div>
              <StatusBadge status={data.lastAppointment.status} />
            </div>
          </div>
        )}

        {/* Quick actions */}
        <div className="card">
          <h3 className="text-base font-semibold text-neutral-700 mb-4">Quick actions</h3>
          <div className="space-y-3">
            <Link href="/appointments/new" className="btn-primary w-full block text-center">
              Book appointment
            </Link>
            <Link href="/prescriptions" className="btn-ghost w-full block text-center">
              View prescriptions
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
