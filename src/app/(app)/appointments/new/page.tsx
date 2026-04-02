import type { Metadata } from 'next'
import { CreateAppointmentForm } from '@/components/appointments/create-appointment-form'
import { getRecentPatients } from '@/actions/dashboard'

export const metadata: Metadata = { title: 'Create Appointment' }

export default async function NewAppointmentPage() {
  const recentPatients = await getRecentPatients()

  return (
    <div className="app-page">
      <CreateAppointmentForm recentPatients={recentPatients} />
    </div>
  )
}
