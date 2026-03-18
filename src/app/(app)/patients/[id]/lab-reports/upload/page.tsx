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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Upload Lab Report</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload a lab report for {patient.full_name} and optionally run AI analysis.
        </p>
      </div>
      <UploadReportForm initialPatientId={id} lockPatient />
    </div>
  )
}
