import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getLabReport } from '@/actions/lab-reports'
import { LabReportDetail } from '@/components/lab-reports/lab-report-detail'

export const metadata: Metadata = { title: 'Lab Report' }

export default async function PatientLabReportDetailPage(props: {
  params: Promise<{ id: string; reportId: string }>
}) {
  const { id, reportId } = await props.params
  const report = await getLabReport(reportId)

  if (!report || report.patient_id !== id) {
    notFound()
  }

  return <LabReportDetail report={report} />
}
