import type { Metadata } from 'next'
import { CreateAppointmentForm } from '@/components/appointments/create-appointment-form'

export const metadata: Metadata = { title: 'Create Appointment' }

export default function NewAppointmentPage() {
  return (
    <div className="app-page">
      <CreateAppointmentForm />
    </div>
  )
}
