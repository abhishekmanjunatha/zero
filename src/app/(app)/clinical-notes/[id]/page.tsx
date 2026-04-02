import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getClinicalNote } from '@/actions/clinical-notes'
import { DocumentComposer } from '@/components/clinical-notes/document-composer'

export const metadata: Metadata = { title: 'View Clinical Document' }

export default async function ClinicalNoteDetailPage(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params
  const note = await getClinicalNote(id)

  if (!note) {
    notFound()
  }

  return (
    <div className="app-page">
      <DocumentComposer existingNote={note} />
    </div>
  )
}
