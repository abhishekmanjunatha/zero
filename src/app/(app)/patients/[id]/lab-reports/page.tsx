import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getLabReports } from '@/actions/lab-reports'
import { getPatient } from '@/actions/patients'
import { LabReportsList } from '@/components/lab-reports/lab-reports-list'

export const metadata: Metadata = { title: 'Patient Lab Reports' }

export default async function PatientLabReportsPage(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params
  const patient = await getPatient(id)

  if (!patient) {
    notFound()
  }

  const { data: reports, error: fetchError } = await getLabReports(id)

  return (
    <LabReportsList
      reports={reports}
      patientId={id}
      patientName={patient.full_name}
      fetchError={fetchError}
    />
  )
}
