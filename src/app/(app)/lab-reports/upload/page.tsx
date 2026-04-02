import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Upload Lab Report' }

export default async function UploadLabReportPage(props: {
  searchParams: Promise<{ patient?: string }>
}) {
  const searchParams = await props.searchParams
  const patientId = searchParams.patient

  if (patientId) {
    redirect(`/patients/${patientId}/lab-reports/upload`)
  }

  redirect('/patients?action=upload-lab')
}
