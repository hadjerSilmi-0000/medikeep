'use client'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import { StatsCard } from '@/components/ui/StatsCard'
import { StatusBadge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { PageHeader } from '@/components/ui/PageHeader'
import { formatDateTime } from '@/lib/utils'
import api from '@/lib/api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts'

const PIE_COLORS = { pending: '#f59e0b', confirmed: '#3b82f6', completed: '#16a34a', cancelled: '#ef4444' }

export default function AnalyticsPage() {
  const { user } = useAuth()
  const isDoctor = user?.role === 'doctor'

  const { data, isLoading } = useQuery({
    queryKey: ['analytics', user?.role],
    queryFn: () => api.get(isDoctor ? '/analytics/doctor' : '/analytics/patient').then(r => r.data.data),
    enabled: !!user,
  })

  if (isLoading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>

  if (isDoctor) return <DoctorAnalytics data={data || {}} />
  return <PatientAnalytics data={data || {}} />
}

function DoctorAnalytics({ data }) {
  const monthly = data.monthlyStats || []

  const statusPie = [
    { name: 'Pending',   value: data.pendingAppointments   || 0 },
    { name: 'Confirmed', value: data.confirmedAppointments || 0 },
    { name: 'Completed', value: data.completedAppointments || 0 },
    { name: 'Cancelled', value: data.cancelledAppointments || 0 },
  ].filter(d => d.value > 0)

  return (
    <div className="max-w-6xl space-y-6">
      <PageHeader title="Analytics" subtitle="Overview of your clinic performance" />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard label="Total patients"     value={data.patientCount}           color="primary" />
        <StatsCard label="Upcoming"           value={data.upcomingAppointments}   color="blue" />
        <StatsCard label="Today"              value={data.todayAppointments}      color="amber" />
        <StatsCard label="Completed"          value={data.completedAppointments}  color="primary" />
        <StatsCard label="Prescriptions"      value={data.prescriptionCount}      color="primary" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly bar */}
        <div className="card lg:col-span-2">
          <h3 className="text-base font-semibold text-neutral-700 mb-5">Monthly appointments</h3>
          {monthly.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthly} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0fdf4" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#a3a3a3' }} />
                <YAxis tick={{ fontSize: 11, fill: '#a3a3a3' }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #dcfce7', fontSize: 12 }} />
                <Bar dataKey="appointments" name="Total" fill="#16a34a" radius={[5, 5, 0, 0]} />
                <Bar dataKey="completed"    name="Completed" fill="#bbf7d0" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-neutral-300 text-sm">No data yet</div>
          )}
        </div>

        {/* Status donut */}
        <div className="card">
          <h3 className="text-base font-semibold text-neutral-700 mb-5">Appointment status</h3>
          {statusPie.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={statusPie} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                  {statusPie.map((entry) => (
                    <Cell key={entry.name} fill={PIE_COLORS[entry.name.toLowerCase()] || '#a3a3a3'} />
                  ))}
                </Pie>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #dcfce7', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-neutral-300 text-sm">No data yet</div>
          )}
        </div>
      </div>

      {/* Line trend */}
      {monthly.length > 0 && (
        <div className="card">
          <h3 className="text-base font-semibold text-neutral-700 mb-5">Completion trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthly} margin={{ top: 0, right: 20, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0fdf4" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#a3a3a3' }} />
              <YAxis tick={{ fontSize: 11, fill: '#a3a3a3' }} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #dcfce7', fontSize: 12 }} />
              <Line type="monotone" dataKey="appointments" stroke="#16a34a" strokeWidth={2} dot={{ fill: '#16a34a', r: 4 }} name="Total" />
              <Line type="monotone" dataKey="completed" stroke="#bbf7d0" strokeWidth={2} dot={{ fill: '#bbf7d0', r: 4 }} name="Completed" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

function PatientAnalytics({ data }) {
  const statusPie = [
    { name: 'Upcoming',  value: data.upcomingAppointments  || 0 },
    { name: 'Completed', value: data.completedAppointments || 0 },
    { name: 'Cancelled', value: data.cancelledAppointments || 0 },
  ].filter(d => d.value > 0)

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title="Analytics" subtitle="Your health activity overview" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard label="Total appointments" value={data.totalAppointments}     color="primary" />
        <StatsCard label="Upcoming"           value={data.upcomingAppointments}  color="blue" />
        <StatsCard label="Prescriptions"      value={data.prescriptionCount}     color="amber" />
        <StatsCard label="Doctors visited"    value={data.doctorsVisited}        color="primary" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status donut */}
        <div className="card">
          <h3 className="text-base font-semibold text-neutral-700 mb-5">Appointment breakdown</h3>
          {statusPie.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={statusPie} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                  {statusPie.map((entry) => (
                    <Cell key={entry.name} fill={PIE_COLORS[entry.name.toLowerCase()] || '#a3a3a3'} />
                  ))}
                </Pie>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #dcfce7', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-neutral-300 text-sm">No data yet</div>
          )}
        </div>

        {/* Last appointment */}
        {data.lastAppointment && (
          <div className="card">
            <h3 className="text-base font-semibold text-neutral-700 mb-5">Last appointment</h3>
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-neutral-700">{data.lastAppointment.doctor_name}</p>
                  <p className="text-xs text-primary-600 mt-0.5">{data.lastAppointment.doctor_specialty}</p>
                </div>
                <StatusBadge status={data.lastAppointment.status} />
              </div>
              <div className="text-sm text-neutral-400">{formatDateTime(data.lastAppointment.date_time)}</div>
              {data.lastAppointment.reason && (
                <p className="text-sm text-neutral-600 bg-primary-50 rounded-xl px-4 py-3">
                  {data.lastAppointment.reason}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
