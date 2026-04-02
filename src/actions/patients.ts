'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/types/database'
import type { CreatePatientInput, UpdatePatientInput } from '@/lib/validations/patient'
import { emitNotification } from '@/lib/notifications/server'

export type PatientsFilterMode = 'all' | 'appointments' | 'labs' | 'notes'

interface GetPatientsOptions {
  search?: string
  mode?: PatientsFilterMode
  dateFrom?: string
  dateTo?: string
}

// ── Patient code generator ──────────────────────────────────────────────────
function generatePatientCode(): string {
  const ts = Date.now().toString(36).toUpperCase().slice(-5)
  const rand = Math.random().toString(36).substring(2, 5).toUpperCase()
  return `PT-${ts}${rand}`
}

// ── Get all patients for the logged-in dietitian ────────────────────────────
export async function getPatients(
  options?: string | GetPatientsOptions
): Promise<{ data: Tables<'patients'>[]; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { data: [] }

  const search = typeof options === 'string' ? options : options?.search
  const mode: PatientsFilterMode =
    typeof options === 'string' ? 'all' : options?.mode ?? 'all'
  const dateFrom = typeof options === 'string' ? undefined : options?.dateFrom
  const dateTo = typeof options === 'string' ? undefined : options?.dateTo

  let query = supabase
    .from('patients')
    .select('*')
    .eq('dietitian_id', user.id)

  if (mode !== 'all') {
    if (mode === 'appointments') {
      const { data: relations, error: relationError } = await supabase
        .from('appointments')
        .select('patient_id')
        .eq('dietitian_id', user.id)

      if (relationError) {
        console.error('[Patients] getPatients appointments filter error:', relationError.message)
        return { data: [], error: 'Failed to filter patients. Please try again.' }
      }

      const patientIds = Array.from(
        new Set(
          ((relations as Array<{ patient_id: string | null }> | null) ?? [])
            .map((row) => row.patient_id)
            .filter((id): id is string => Boolean(id))
        )
      )

      if (patientIds.length === 0) return { data: [] }
      query = query.in('id', patientIds)
    }

    if (mode === 'labs') {
      const { data: relations, error: relationError } = await supabase
        .from('lab_reports')
        .select('patient_id')
        .eq('dietitian_id', user.id)

      if (relationError) {
        console.error('[Patients] getPatients labs filter error:', relationError.message)
        return { data: [], error: 'Failed to filter patients. Please try again.' }
      }

      const patientIds = Array.from(
        new Set(
          ((relations as Array<{ patient_id: string | null }> | null) ?? [])
            .map((row) => row.patient_id)
            .filter((id): id is string => Boolean(id))
        )
      )

      if (patientIds.length === 0) return { data: [] }
      query = query.in('id', patientIds)
    }

    if (mode === 'notes') {
      const { data: relations, error: relationError } = await supabase
        .from('clinical_notes')
        .select('patient_id')
        .eq('dietitian_id', user.id)

      if (relationError) {
        console.error('[Patients] getPatients notes filter error:', relationError.message)
        return { data: [], error: 'Failed to filter patients. Please try again.' }
      }

      const patientIds = Array.from(
        new Set(
          ((relations as Array<{ patient_id: string | null }> | null) ?? [])
            .map((row) => row.patient_id)
            .filter((id): id is string => Boolean(id))
        )
      )

      if (patientIds.length === 0) return { data: [] }
      query = query.in('id', patientIds)
    }
  }

  if (search?.trim()) {
    const term = search.trim()
    query = query.or(
      `full_name.ilike.%${term}%,patient_code.ilike.%${term}%,phone.ilike.%${term}%`
    )
  }

  if (dateFrom) {
    query = query.gte('last_visit_at', `${dateFrom}T00:00:00.000Z`)
  }

  if (dateTo) {
    query = query.lte('last_visit_at', `${dateTo}T23:59:59.999Z`)
  }

  const { data, error } = await query.order('last_visit_at', {
    ascending: false,
    nullsFirst: false,
  })

  if (error) {
    console.error('[Patients] getPatients error:', error.message)
    return { data: [], error: 'Failed to load patients. Please try again.' }
  }

  return { data: (data as Tables<'patients'>[] | null) ?? [] }
}

// ── Get a single patient (verifies ownership) ───────────────────────────────
export async function getPatient(
  id: string
): Promise<Tables<'patients'> | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('id', id)
    .eq('dietitian_id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('[Patients] getPatient error:', error.message)
  }

  return (data as Tables<'patients'> | null)
}

// Alias for backward compat
export const getPatientById = getPatient

// ── Create patient ──────────────────────────────────────────────────────────
export async function createPatient(
  input: CreatePatientInput
): Promise<{ error?: string; patientId?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Ensure unique patient_code (retry up to 3 times)
  let patient_code = generatePatientCode()
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: existing } = await supabase
      .from('patients')
      .select('id')
      .eq('patient_code', patient_code)
      .maybeSingle()
    if (!existing) break
    patient_code = generatePatientCode()
  }

  const { data, error } = await supabase
    .from('patients')
    .insert({
      dietitian_id: user.id,
      patient_code,
      full_name: input.full_name,
      phone: input.phone,
      gender: input.gender ?? null,
      date_of_birth: input.date_of_birth || null,
      height_cm: input.height_cm ?? null,
      weight_kg: input.weight_kg ?? null,
      activity_level: input.activity_level ?? null,
      sleep_hours: input.sleep_hours ?? null,
      work_type: input.work_type ?? null,
      dietary_type: input.dietary_type ?? null,
      medical_conditions: input.medical_conditions ?? [],
      food_allergies: input.food_allergies ?? [],
      primary_goal: input.primary_goal ?? null,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  const newId = (data as { id: string }).id

  // Create timeline event
  await supabase.from('timeline_events').insert({
    dietitian_id: user.id,
    patient_id: newId,
    event_type: 'note_added',
    event_data: { note: 'Patient record created' },
  })

  await emitNotification(supabase, {
    dietitianId: user.id,
    patientId: newId,
    type: 'patient_created',
    title: 'Patient added',
    message: input.full_name,
    actionUrl: `/patients/${newId}`,
    metadata: {
      patient_code,
    },
  })

  revalidatePath('/patients')
  return { patientId: newId }
}

// ── Update patient ──────────────────────────────────────────────────────────
export async function updatePatient(
  id: string,
  input: UpdatePatientInput
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('patients')
    .update({
      ...input,
      date_of_birth: input.date_of_birth || null,
    })
    .eq('id', id)
    .eq('dietitian_id', user.id)

  if (error) return { error: error.message }

  await emitNotification(supabase, {
    dietitianId: user.id,
    patientId: id,
    type: 'patient_updated',
    title: 'Patient profile updated',
    message: input.full_name?.trim() || 'Patient details were updated',
    actionUrl: `/patients/${id}`,
    metadata: {
      updated_fields: Object.keys(input),
    },
  })

  revalidatePath('/patients')
  revalidatePath(`/patients/${id}`)
  return {}
}

// ── Get patient appointments ────────────────────────────────────────────────
export async function getPatientAppointments(patientId: string): Promise<Tables<'appointments'>[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('appointments')
    .select('*')
    .eq('patient_id', patientId)
    .eq('dietitian_id', user.id)
    .order('appointment_date', { ascending: false })

  return (data as Tables<'appointments'>[] | null) ?? []
}

// ── Get patient clinical notes ──────────────────────────────────────────────
export async function getPatientClinicalNotes(patientId: string): Promise<Tables<'clinical_notes'>[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('clinical_notes')
    .select('*')
    .eq('patient_id', patientId)
    .eq('dietitian_id', user.id)
    .order('created_at', { ascending: false })

  return (data as Tables<'clinical_notes'>[] | null) ?? []
}

// ── Get patient lab reports ─────────────────────────────────────────────────
export async function getPatientLabReports(patientId: string): Promise<Tables<'lab_reports'>[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('lab_reports')
    .select('*')
    .eq('patient_id', patientId)
    .eq('dietitian_id', user.id)
    .order('created_at', { ascending: false })

  return (data as Tables<'lab_reports'>[] | null) ?? []
}

// ── Get patient timeline ────────────────────────────────────────────────────
export async function getPatientTimeline(patientId: string): Promise<Tables<'timeline_events'>[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('timeline_events')
    .select('*')
    .eq('patient_id', patientId)
    .eq('dietitian_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return (data as Tables<'timeline_events'>[] | null) ?? []
}

// ── Delete patient ──────────────────────────────────────────────────────────
export async function deletePatient(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('patients')
    .delete()
    .eq('id', id)
    .eq('dietitian_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/patients')
  redirect('/patients')
}
