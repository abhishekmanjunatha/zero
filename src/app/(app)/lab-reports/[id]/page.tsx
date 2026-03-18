import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getLabReport } from '@/actions/lab-reports'

export const metadata: Metadata = { title: 'Lab Report' }

export default async function LabReportDetailPage(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params
  const report = await getLabReport(id)

  if (!report) {
    notFound()
  }

  redirect(`/patients/${report.patient_id}/lab-reports/${report.id}`)
}
