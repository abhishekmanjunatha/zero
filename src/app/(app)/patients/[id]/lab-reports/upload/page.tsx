import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPatient } from '@/actions/patients'
import { UploadReportForm } from '@/components/lab-reports/upload-report-form'

export const metadata: Metadata = { title: 'Upload Lab Report' }

export default async function UploadPatientLabReportPage(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params
  const patient = await getPatient(id)

  if (!patient) {
    notFound()
  }

  return (
    <div className="app-page">
      <UploadReportForm initialPatientId={id} lockPatient />
    </div>
  )
}
