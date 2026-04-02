import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getDocumentTemplate } from '@/actions/templates'
import { TemplateEditor } from '@/components/clinical-notes/template-editor'
import type { DocumentBlock } from '@/types/app'

export const metadata: Metadata = { title: 'Edit Template' }

function normalizeBlocks(raw: unknown): DocumentBlock[] {
  if (!Array.isArray(raw)) return []

  return raw
    .map((value, index) => {
      const block = value as Partial<DocumentBlock>
      return {
        id: typeof block.id === 'string' ? block.id : `legacy-${index}`,
        type: block.type === 'instructions' || block.type === 'meal_section' || block.type === 'custom'
          ? block.type
          : 'custom',
        label: typeof block.label === 'string' && block.label.trim() ? block.label : `Section ${index + 1}`,
        content: typeof block.content === 'string' ? block.content : '',
        order: index,
      } satisfies DocumentBlock
    })
}

export default async function EditTemplatePage(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params
  const template = await getDocumentTemplate(id)

  if (!template) {
    notFound()
  }

  const blocks = normalizeBlocks(template.blocks)

  return (
    <div className="app-page">
      <TemplateEditor
        templateId={template.id}
        initialName={template.name}
        initialBlocks={blocks}
      />
    </div>
  )
}
