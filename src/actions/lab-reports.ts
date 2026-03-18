'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Tables, Json } from '@/types/database'
import { UPLOAD_TOKEN_EXPIRY_HOURS } from '@/lib/constants/app'

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

// ── Get lab reports (optionally filtered by patient) ────────────────────────

export async function getLabReports(
  patientId?: string
): Promise<{ data: (Tables<'lab_reports'> & { patient?: { id: string; full_name: string; patient_code: string } })[]; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { data: [] }

  let query = supabase
    .from('lab_reports')
    .select('*, patients!inner(id, full_name, patient_code)')
    .eq('dietitian_id', user.id)
    .order('created_at', { ascending: false })

  if (patientId) {
    query = query.eq('patient_id', patientId)
  }

  const { data, error } = await query

  if (error) {
    console.error('[LabReports] getLabReports error:', error.message)
    return { data: [], error: 'Failed to load lab reports. Please try again.' }
  }

  return {
    data: (data as (Tables<'lab_reports'> & {
      patients: { id: string; full_name: string; patient_code: string }
    })[] | null)?.map((r) => ({
      ...r,
      patient: r.patients,
    })) ?? [],
  }
}

// ── Get a single lab report ─────────────────────────────────────────────────

export async function getLabReport(
  reportId: string
): Promise<(Tables<'lab_reports'> & { patient?: { id: string; full_name: string; patient_code: string } }) | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error: fetchError } = await supabase
    .from('lab_reports')
    .select('*, patients!inner(id, full_name, patient_code)')
    .eq('id', reportId)
    .eq('dietitian_id', user.id)
    .single()

  if (fetchError && fetchError.code !== 'PGRST116') {
    console.error('[LabReports] getLabReport error:', fetchError.message)
  }

  if (!data) return null

  const row = data as Tables<'lab_reports'> & {
    patients: { id: string; full_name: string; patient_code: string }
  }

  const rawPaths = Array.isArray(row.file_urls)
    ? row.file_urls.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    : []
  const remoteUrls = rawPaths.filter((value) => /^https?:\/\//i.test(value))
  const privatePaths = rawPaths.filter((value) => !/^https?:\/\//i.test(value))

  let signedUrls: string[] = []
  if (privatePaths.length > 0) {
    const { data: signed, error: signError } = await supabase.storage
      .from('lab-reports')
      .createSignedUrls(privatePaths, 60 * 60)

    if (signError) {
      console.error('[LabReports] getLabReport signed URL error:', signError.message)
    } else {
      signedUrls = (signed ?? [])
        .map((entry) => entry.signedUrl)
        .filter((url): url is string => typeof url === 'string' && url.length > 0)
    }
  }

  return {
    ...row,
    file_urls: [...remoteUrls, ...signedUrls],
    patient: row.patients,
  }
}

// ── Upload lab report (dietitian) ───────────────────────────────────────────

export async function uploadLabReport(input: {
  patient_id: string
  title: string
  report_type?: string
  file_urls: string[]
}): Promise<{ reportId?: string; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const ownsPatient = await ensurePatientOwnedByDietitian(
    supabase,
    user.id,
    input.patient_id
  )
  if (!ownsPatient) {
    return { error: 'Invalid patient reference for this account.' }
  }

  if (!input.title.trim()) return { error: 'Report title is required' }
  if (input.file_urls.length === 0) return { error: 'At least one file is required' }

  const { data, error } = await supabase
    .from('lab_reports')
    .insert({
      dietitian_id: user.id,
      patient_id: input.patient_id,
      title: input.title.trim(),
      report_type: (input.report_type as Tables<'lab_reports'>['report_type']) ?? null,
      file_urls: input.file_urls,
      upload_source: 'dietitian' as const,
    })
    .select('id')
    .single()

  if (error || !data) {
    return { error: error?.message ?? 'Failed to upload report' }
  }

  const reportId = (data as { id: string }).id

  // Timeline event
  const { error: timelineError } = await supabase.from('timeline_events').insert({
    dietitian_id: user.id,
    patient_id: input.patient_id,
    event_type: 'lab_report_uploaded',
    event_data: {
      title: input.title,
      report_type: input.report_type ?? 'other',
      source: 'dietitian',
    } as unknown as Json,
    reference_id: reportId,
  })

  if (timelineError) {
    console.error('[LabReports] uploadLabReport timeline insert error:', timelineError.message)
  }

  revalidatePath('/lab-reports')
  revalidatePath('/dashboard')
  revalidatePath(`/patients/${input.patient_id}`)

  return { reportId }
}

// ── Generate secure upload token (for patient uploads) ──────────────────────

export async function generateSecureUploadToken(
  patientId: string
): Promise<{ token?: string; expiresAt?: string; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const ownsPatient = await ensurePatientOwnedByDietitian(
    supabase,
    user.id,
    patientId
  )
  if (!ownsPatient) {
    return { error: 'Invalid patient reference for this account.' }
  }

  // Generate a secure random token
  const tokenBytes = new Uint8Array(32)
  crypto.getRandomValues(tokenBytes)
  const token = Array.from(tokenBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  const expiresAt = new Date(
    Date.now() + UPLOAD_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000
  ).toISOString()

  // Create a lab_report placeholder row with token
  const { data, error } = await supabase
    .from('lab_reports')
    .insert({
      dietitian_id: user.id,
      patient_id: patientId,
      title: 'Patient Upload (pending)',
      upload_source: 'patient' as const,
      upload_token: token,
      token_expires_at: expiresAt,
      file_urls: [],
    })
    .select('id')
    .single()

  if (error || !data) {
    return { error: error?.message ?? 'Failed to generate token' }
  }

  revalidatePath('/lab-reports')
  revalidatePath('/dashboard')
  revalidatePath(`/patients/${patientId}`)

  return { token, expiresAt }
}

// ── Save AI analysis results ────────────────────────────────────────────────

export async function saveAiAnalysis(
  reportId: string,
  summary: string,
  analysis: { metrics: unknown[]; observations: unknown[] }
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: reportRow } = await supabase
    .from('lab_reports')
    .select('patient_id')
    .eq('id', reportId)
    .eq('dietitian_id', user.id)
    .maybeSingle()

  if (!reportRow) return { error: 'Lab report not found' }

  const { error } = await supabase
    .from('lab_reports')
    .update({
      ai_summary: summary,
      ai_observations: {
        metrics: analysis.metrics,
        observations: analysis.observations,
      } as unknown as Json,
    })
    .eq('id', reportId)
    .eq('dietitian_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/lab-reports')
  revalidatePath('/dashboard')
  revalidatePath(`/patients/${(reportRow as { patient_id: string }).patient_id}`)

  return {}
}

// ── Delete lab report ───────────────────────────────────────────────────────

export async function deleteLabReport(
  reportId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: reportRow } = await supabase
    .from('lab_reports')
    .select('patient_id')
    .eq('id', reportId)
    .eq('dietitian_id', user.id)
    .maybeSingle()

  if (!reportRow) return { error: 'Lab report not found' }

  const { error } = await supabase
    .from('lab_reports')
    .delete()
    .eq('id', reportId)
    .eq('dietitian_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/lab-reports')
  revalidatePath('/dashboard')
  revalidatePath(`/patients/${(reportRow as { patient_id: string }).patient_id}`)

  return {}
}
