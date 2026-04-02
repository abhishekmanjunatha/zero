import type { Metadata } from 'next'
import { PatientForm } from '@/components/patients/patient-form'

export const metadata: Metadata = { title: 'Add Patient' }

export default function NewPatientPage() {
  return <PatientForm mode="create" />
}
