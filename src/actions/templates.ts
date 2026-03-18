'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Json, Tables } from '@/types/database'
import type { DocumentBlock } from '@/types/app'

const TEMPLATES_TABLE_MISSING_HINT =
  'Templates setup is incomplete. Please apply migration supabase/migrations/00002_document_templates.sql.'

type SaveTemplateInput = {
  name: string
  blocks: DocumentBlock[]
}

function sanitizeTemplateBlocks(blocks: DocumentBlock[]): DocumentBlock[] {
  return blocks
    .filter((b) => b.type !== 'title' && b.type !== 'patient_snapshot')
    .map((b, index) => ({
      id: b.id,
      type: b.type,
      label: b.label,
      content: b.content,
      order: index,
    }))
}

function validateTemplateInput(input: SaveTemplateInput): string | null {
  const name = input.name.trim()
  if (!name) return 'Template name is required'
  if (name.length > 120) return 'Template name must be 120 characters or less'

  const blocks = sanitizeTemplateBlocks(input.blocks)
  if (blocks.length === 0) return 'Template must have at least one content block'

  return null
}

function isMissingTemplatesTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  return (
    error.code === 'PGRST205' ||
    error.message?.includes("Could not find the table 'public.document_templates'") === true
  )
}

export async function getDocumentTemplates(): Promise<Tables<'document_templates'>[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  const { data, error } = await supabase
    .from('document_templates')
    .select('*')
    .eq('dietitian_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    if (isMissingTemplatesTable(error)) {
      return []
    }
    console.error('[Templates] getDocumentTemplates error:', error.message)
    return []
  }

  return (data as Tables<'document_templates'>[] | null) ?? []
}

export async function getDocumentTemplate(
  templateId: string
): Promise<Tables<'document_templates'> | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data, error } = await supabase
    .from('document_templates')
    .select('*')
    .eq('id', templateId)
    .eq('dietitian_id', user.id)
    .maybeSingle()

  if (error) {
    if (isMissingTemplatesTable(error)) {
      return null
    }
    console.error('[Templates] getDocumentTemplate error:', error.message)
    return null
  }

  return (data as Tables<'document_templates'> | null) ?? null
}

export async function createDocumentTemplate(
  input: SaveTemplateInput
): Promise<{ templateId?: string; error?: string }> {
  const validationError = validateTemplateInput(input)
  if (validationError) return { error: validationError }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const name = input.name.trim()
  const blocks = sanitizeTemplateBlocks(input.blocks)

  // Upsert behavior by name: overwrite existing template with same name.
  const { data: existing, error: existingError } = await supabase
    .from('document_templates')
    .select('id')
    .eq('dietitian_id', user.id)
    .eq('name', name)
    .maybeSingle()

  if (isMissingTemplatesTable(existingError)) {
    return { error: TEMPLATES_TABLE_MISSING_HINT }
  }
  if (existingError) {
    return { error: existingError.message }
  }

  if (existing?.id) {
    const { error: updateError } = await supabase
      .from('document_templates')
      .update({ blocks: blocks as unknown as Json })
      .eq('id', existing.id)
      .eq('dietitian_id', user.id)

    if (updateError) {
      if (isMissingTemplatesTable(updateError)) {
        return { error: TEMPLATES_TABLE_MISSING_HINT }
      }
      return { error: updateError.message }
    }

    revalidatePath('/templates')
    return { templateId: existing.id }
  }

  const { data, error } = await supabase
    .from('document_templates')
    .insert({
      dietitian_id: user.id,
      name,
      blocks: blocks as unknown as Json,
    })
    .select('id')
    .single()

  if (error || !data) {
    if (isMissingTemplatesTable(error)) {
      return { error: TEMPLATES_TABLE_MISSING_HINT }
    }
    return { error: error?.message ?? 'Failed to create template' }
  }

  revalidatePath('/templates')
  return { templateId: (data as { id: string }).id }
}

export async function updateDocumentTemplate(
  templateId: string,
  input: SaveTemplateInput
): Promise<{ error?: string }> {
  const validationError = validateTemplateInput(input)
  if (validationError) return { error: validationError }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const name = input.name.trim()
  const blocks = sanitizeTemplateBlocks(input.blocks)

  const { error } = await supabase
    .from('document_templates')
    .update({
      name,
      blocks: blocks as unknown as Json,
    })
    .eq('id', templateId)
    .eq('dietitian_id', user.id)

  if (error) {
    if (isMissingTemplatesTable(error)) {
      return { error: TEMPLATES_TABLE_MISSING_HINT }
    }
    return { error: error.message }
  }

  revalidatePath('/templates')
  revalidatePath(`/templates/${templateId}`)
  return {}
}

export async function deleteDocumentTemplate(
  templateId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('document_templates')
    .delete()
    .eq('id', templateId)
    .eq('dietitian_id', user.id)

  if (error) {
    if (isMissingTemplatesTable(error)) {
      return { error: TEMPLATES_TABLE_MISSING_HINT }
    }
    return { error: error.message }
  }

  revalidatePath('/templates')
  return {}
}
