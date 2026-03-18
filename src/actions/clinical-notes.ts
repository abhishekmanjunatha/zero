'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Tables, Json } from '@/types/database'
import type { CreateClinicalNoteInput } from '@/lib/validations/clinical-note'
import { createClinicalNoteSchema } from '@/lib/validations/clinical-note'

async function ensurePatientOwnedByDietitian(
  supabase: Awaited<ReturnType<typeof createClient>>,
  dietitianId: string,
  patientId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('patients')
    .select('id')
    .eq('id', patientId)
    .eq('dietitian_id', dietitianId)
    .maybeSingle()

  return !!data
}

// ── Get clinical notes (for a patient, or all) ──────────────────────────────

export async function getClinicalNotes(
  patientId?: string
): Promise<Tables<'clinical_notes'>[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  let query = supabase
    .from('clinical_notes')
    .select('*')
    .eq('dietitian_id', user.id)
    .order('created_at', { ascending: false })

  if (patientId) {
    query = query.eq('patient_id', patientId)
  }

  const { data, error } = await query
  if (error) {
    console.error('[ClinicalNotes] getClinicalNotes error:', error.message)
  }
  return (data as Tables<'clinical_notes'>[] | null) ?? []
}

// ── Get a single clinical note ──────────────────────────────────────────────

export async function getClinicalNote(
  noteId: string
): Promise<Tables<'clinical_notes'> | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('clinical_notes')
    .select('*')
    .eq('id', noteId)
    .eq('dietitian_id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('[ClinicalNotes] getClinicalNote error:', error.message)
  }

  return (data as Tables<'clinical_notes'> | null) ?? null
}

// ── Create clinical note ────────────────────────────────────────────────────

export async function createClinicalNote(
  input: CreateClinicalNoteInput
): Promise<{ noteId?: string; error?: string }> {
  const parsed = createClinicalNoteSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const ownsPatient = await ensurePatientOwnedByDietitian(
    supabase,
    user.id,
    parsed.data.patient_id
  )
  if (!ownsPatient) {
    return { error: 'Invalid patient reference for this account.' }
  }

  const { data, error } = await supabase
    .from('clinical_notes')
    .insert({
      dietitian_id: user.id,
      patient_id: parsed.data.patient_id,
      document_type: parsed.data.document_type,
      title: parsed.data.title,
      content: parsed.data.blocks as unknown as Json,
      version: 1,
    })
    .select('id')
    .single()

  if (error || !data) {
    return { error: error?.message ?? 'Failed to create clinical note' }
  }

  const noteId = (data as { id: string }).id

  // Add timeline event
  await supabase.from('timeline_events').insert({
    dietitian_id: user.id,
    patient_id: parsed.data.patient_id,
    event_type: 'clinical_document_created',
    event_data: {
      title: parsed.data.title,
      document_type: parsed.data.document_type,
    } as unknown as Json,
    reference_id: noteId,
  })

  revalidatePath('/clinical-notes')
  revalidatePath('/dashboard')
  revalidatePath(`/patients/${parsed.data.patient_id}`)

  return { noteId }
}

// ── Update clinical note ────────────────────────────────────────────────────

export async function updateClinicalNote(
  noteId: string,
  input: CreateClinicalNoteInput
): Promise<{ error?: string }> {
  const parsed = createClinicalNoteSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const ownsPatient = await ensurePatientOwnedByDietitian(
    supabase,
    user.id,
    parsed.data.patient_id
  )
  if (!ownsPatient) {
    return { error: 'Invalid patient reference for this account.' }
  }

  const { data: noteRow } = await supabase
    .from('clinical_notes')
    .select('patient_id')
    .eq('id', noteId)
    .eq('dietitian_id', user.id)
    .single()

  if (!noteRow) return { error: 'Clinical note not found' }
  if ((noteRow as { patient_id: string }).patient_id !== parsed.data.patient_id) {
    return { error: 'Patient mismatch for this clinical note.' }
  }

  // Get current version
  const { data: current } = await supabase
    .from('clinical_notes')
    .select('version')
    .eq('id', noteId)
    .eq('dietitian_id', user.id)
    .single()

  const currentVersion = (current as { version: number } | null)?.version ?? 0

  const { error } = await supabase
    .from('clinical_notes')
    .update({
      document_type: parsed.data.document_type,
      title: parsed.data.title,
      content: parsed.data.blocks as unknown as Json,
      version: currentVersion + 1,
    })
    .eq('id', noteId)
    .eq('dietitian_id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/clinical-notes')
  revalidatePath('/dashboard')
  revalidatePath(`/patients/${parsed.data.patient_id}`)

  return {}
}

// ── Delete clinical note ────────────────────────────────────────────────────

export async function deleteClinicalNote(
  noteId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: noteRow } = await supabase
    .from('clinical_notes')
    .select('patient_id')
    .eq('id', noteId)
    .eq('dietitian_id', user.id)
    .maybeSingle()

  if (!noteRow) return { error: 'Clinical note not found' }

  const { error } = await supabase
    .from('clinical_notes')
    .delete()
    .eq('id', noteId)
    .eq('dietitian_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/clinical-notes')
  revalidatePath('/dashboard')
  revalidatePath(`/patients/${(noteRow as { patient_id: string }).patient_id}`)

  return {}
}
