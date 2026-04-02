import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getPatient } from '@/actions/patients'
import { PatientForm } from '@/components/patients/patient-form'

interface EditPatientPageProps {
  params: Promise<{ id: string }>
}

export const metadata: Metadata = { title: 'Edit Patient' }

export default async function EditPatientPage({ params }: EditPatientPageProps) {
  const { id } = await params
  const patient = await getPatient(id)

  if (!patient) notFound()

  return (
    <div className="app-page-narrow">
      <PatientForm mode="edit" patient={patient} />
    </div>
  )
}
