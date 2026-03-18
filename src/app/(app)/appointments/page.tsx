import type { Metadata } from 'next'
import { getAppointments } from '@/actions/appointments'
import { AppointmentsList } from '@/components/appointments/appointments-list'

export const metadata: Metadata = { title: 'Appointments' }

interface AppointmentsPageProps {
  searchParams: Promise<{ filter?: string }>
}

export default async function AppointmentsPage({ searchParams }: AppointmentsPageProps) {
  const { filter } = await searchParams
  const activeFilter = (['today', 'upcoming', 'completed'] as const).includes(
    filter as 'today' | 'upcoming' | 'completed'
  )
    ? (filter as 'today' | 'upcoming' | 'completed')
    : 'today'

  const { data: appointmentData, error: fetchError } = await getAppointments(activeFilter)

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-semibold">Appointments</h1>
        {!fetchError && (
          <p className="text-sm text-muted-foreground mt-0.5">
            {appointmentData.length} appointment{appointmentData.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>
      <AppointmentsList appointments={appointmentData} activeFilter={activeFilter} fetchError={fetchError} />
    </div>
  )
}
