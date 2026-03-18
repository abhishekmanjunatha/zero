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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create Clinical Document</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Build a structured clinical document with AI assistance.
        </p>
      </div>
      <DocumentComposer />
    </div>
  )
}
