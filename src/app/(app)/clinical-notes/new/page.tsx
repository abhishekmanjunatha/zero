import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { DocumentComposer } from '@/components/clinical-notes/document-composer'

export const metadata: Metadata = { title: 'Create Clinical Document' }

export default async function NewClinicalNotePage(props: {
  searchParams: Promise<{ patient?: string }>
}) {
  const searchParams = await props.searchParams
  const patientId = searchParams.patient

  if (!patientId) {
    redirect('/patients')
  }

  return (
    <div className="app-page">
      <DocumentComposer />
    </div>
  )
}
