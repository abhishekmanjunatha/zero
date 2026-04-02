import type { Metadata } from 'next'
import { getAppointments } from '@/actions/appointments'
import { AppointmentsList } from '@/components/appointments/appointments-list'
import { AppointmentsPageToolbar } from '@/components/appointments/appointments-page-toolbar'

type FilterKey = 'today' | 'upcoming' | 'completed'
type ModeKey = 'all' | 'scheduled' | 'walk_in'

export const metadata: Metadata = { title: 'Appointments' }

interface AppointmentsPageProps {
  searchParams: Promise<{ filter?: string; q?: string; from?: string; to?: string; mode?: string }>
}

export default async function AppointmentsPage({ searchParams }: AppointmentsPageProps) {
  const { filter, q, from, to, mode } = await searchParams
  const activeFilter: FilterKey = (['today', 'upcoming', 'completed'] as const).includes(
    filter as FilterKey
  )
    ? (filter as FilterKey)
    : 'today'

  const activeMode: ModeKey = (['all', 'scheduled', 'walk_in'] as const).includes(
    mode as ModeKey
  )
    ? (mode as ModeKey)
    : 'all'

  const dateFrom = /^\d{4}-\d{2}-\d{2}$/.test(from ?? '') ? (from as string) : ''
  const dateTo = /^\d{4}-\d{2}-\d{2}$/.test(to ?? '') ? (to as string) : ''

  const { data: appointmentData, error: fetchError } = await getAppointments({
    filter: activeFilter,
    search: q ?? '',
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    mode: activeMode,
  })

  return (
    <div className="space-y-6 lg:space-y-8">
      <AppointmentsPageToolbar
        key={`${activeFilter}:${q ?? ''}:${dateFrom}:${dateTo}:${activeMode}`}
        activeFilter={activeFilter}
        initialQuery={q ?? ''}
        initialDateFrom={dateFrom}
        initialDateTo={dateTo}
        initialMode={activeMode}
        appointmentsForExport={appointmentData}
      />
      <AppointmentsList appointments={appointmentData} fetchError={fetchError} />
    </div>
  )
}
