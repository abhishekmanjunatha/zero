'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { emitNotification } from '@/lib/notifications/server'
import { isRateLimited } from '@/lib/rate-limit'
import type { CreatePatientInput } from '@/lib/validations/patient'

const INVITE_EXPIRY_HOURS = 48

// ── Patient code generator (same pattern as patients.ts) ────────────────────
function generatePatientCode(): string {
  const ts = Date.now().toString(36).toUpperCase().slice(-5)
  const rand = Math.random().toString(36).substring(2, 5).toUpperCase()
  return `PT-${ts}${rand}`
}

// ── Generate cryptographically secure token ─────────────────────────────────
function generateInviteToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// ── Check if a phone number already exists for this dietitian ───────────────
export async function checkPhoneExists(
  phone: string
): Promise<{ exists: boolean; patient?: { id: string; full_name: string; patient_code: string } }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { exists: false }

  const digits = phone.replace(/\D/g, '')
  if (digits.length < 7) return { exists: false }

  const { data } = await supabase
    .from('patients')
    .select('id, full_name, patient_code, phone')
    .eq('dietitian_id', user.id)

  if (!data) return { exists: false }

  const match = data.find((p) => p.phone.replace(/\D/g, '').endsWith(digits.slice(-10)))
  if (match) {
    return {
      exists: true,
      patient: { id: match.id, full_name: match.full_name, patient_code: match.patient_code },
    }
  }

  return { exists: false }
}

// ── Create a patient invite ─────────────────────────────────────────────────
export async function createPatientInvite(input: {
  phone: string
  countryCode: string
  message?: string
  deliveryChannel: 'whatsapp' | 'text_message' | 'sms'
}): Promise<{ token?: string; inviteUrl?: string; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  if (isRateLimited(`invite-create:${user.id}`, 10, 3_600_000)) {
    return { error: 'You\u2019ve reached the invite limit (10/hour). Please try again later.' }
  }

  const token = generateInviteToken()
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000).toISOString()

  const { error } = await supabase.from('patient_invites').insert({
    dietitian_id: user.id,
    phone: input.phone,
    country_code: input.countryCode,
    invite_token: token,
    invite_message: input.message || null,
    delivery_channel: input.deliveryChannel,
    status: 'pending',
    expires_at: expiresAt,
  })

  if (error) return { error: error.message }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const inviteUrl = `${baseUrl}/invite/${token}`

  revalidatePath('/dashboard')

  return { token, inviteUrl }
}

// ── Validate invite token (public — no auth required) ───────────────────────
export async function getInviteByToken(
  token: string
): Promise<{
  valid: boolean
  status?: 'pending' | 'completed' | 'expired' | 'invalid'
  dietitianName?: string
  phone?: string
  countryCode?: string
} | null> {
  // Use dynamic import to avoid issues with public pages
  const { createServiceClient } = await import('@/lib/supabase/service')

  let supabase
  try {
    supabase = createServiceClient()
  } catch {
    return null
  }

  const { data } = await supabase
    .from('patient_invites')
    .select('id, status, expires_at, phone, country_code, dietitian_id, dietitians!inner(full_name)')
    .eq('invite_token', token)
    .single()

  if (!data) return { valid: false, status: 'invalid' }

  const row = data as {
    id: string
    status: string
    expires_at: string
    phone: string
    country_code: string
    dietitian_id: string
    dietitians: { full_name: string }
  }

  if (row.status === 'completed') return { valid: false, status: 'completed' }
  if (row.status === 'cancelled') return { valid: false, status: 'invalid' }

  if (new Date(row.expires_at) < new Date()) {
    // Mark expired in DB
    await supabase
      .from('patient_invites')
      .update({ status: 'expired' })
      .eq('id', row.id)
    return { valid: false, status: 'expired' }
  }

  if (row.status !== 'pending') return { valid: false, status: 'invalid' }

  return {
    valid: true,
    status: 'pending',
    dietitianName: row.dietitians.full_name,
    phone: row.phone,
    countryCode: row.country_code,
  }
}

// ── Complete invite — create patient from invite form ───────────────────────
export async function completeInvite(
  token: string,
  patientData: CreatePatientInput
): Promise<{ error?: string; patientId?: string }> {
  const { createServiceClient } = await import('@/lib/supabase/service')

  let supabase
  try {
    supabase = createServiceClient()
  } catch {
    return { error: 'Service is not configured. Please contact support.' }
  }

  // Validate token
  const { data: invite } = await supabase
    .from('patient_invites')
    .select('id, dietitian_id, status, expires_at, phone')
    .eq('invite_token', token)
    .single()

  if (!invite) return { error: 'Invalid invite link.' }

  const inv = invite as {
    id: string
    dietitian_id: string
    status: string
    expires_at: string
    phone: string
  }

  if (inv.status !== 'pending') return { error: 'This invite link has already been used.' }

  if (new Date(inv.expires_at) < new Date()) {
    await supabase
      .from('patient_invites')
      .update({ status: 'expired' })
      .eq('id', inv.id)
    return { error: 'This invite link has expired.' }
  }

  // Generate unique patient code
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

  // Create the patient under the inviting dietitian
  const { data: newPatient, error: patientError } = await supabase
    .from('patients')
    .insert({
      dietitian_id: inv.dietitian_id,
      patient_code,
      full_name: patientData.full_name,
      phone: patientData.phone,
      gender: patientData.gender ?? null,
      date_of_birth: patientData.date_of_birth || null,
      height_cm: patientData.height_cm ?? null,
      weight_kg: patientData.weight_kg ?? null,
      activity_level: patientData.activity_level ?? null,
      sleep_hours: patientData.sleep_hours ?? null,
      work_type: patientData.work_type ?? null,
      dietary_type: patientData.dietary_type ?? null,
      medical_conditions: patientData.medical_conditions ?? [],
      food_allergies: patientData.food_allergies ?? [],
      primary_goal: patientData.primary_goal ?? null,
    })
    .select('id')
    .single()

  if (patientError || !newPatient) {
    return { error: patientError?.message ?? 'Failed to create patient record.' }
  }

  const newId = (newPatient as { id: string }).id

  // Mark invite as completed
  await supabase
    .from('patient_invites')
    .update({
      status: 'completed',
      patient_id: newId,
      completed_at: new Date().toISOString(),
    })
    .eq('id', inv.id)

  // Create timeline event
  await supabase.from('timeline_events').insert({
    dietitian_id: inv.dietitian_id,
    patient_id: newId,
    event_type: 'patient_invited',
    event_data: { note: `${patientData.full_name} joined via invite link` },
  })

  // Emit notification
  await emitNotification(supabase, {
    dietitianId: inv.dietitian_id,
    patientId: newId,
    type: 'patient_invited',
    title: 'New patient via invite',
    message: `${patientData.full_name} has joined your patient directory`,
    actionUrl: `/patients/${newId}`,
    metadata: { patient_code },
  })

  return { patientId: newId }
}

// ── List invites for the current dietitian ──────────────────────────────────

export type InviteStatusFilter = 'all' | 'pending' | 'completed' | 'expired' | 'cancelled'

interface GetPatientInvitesOptions {
  search?: string
  status?: InviteStatusFilter
  dateFrom?: string
  dateTo?: string
}

export async function getPatientInvites(
  options?: GetPatientInvitesOptions
): Promise<{ data: PatientInviteRow[]; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { data: [], error: 'Not authenticated' }

  // Auto-expire stale pending invites
  await supabase
    .from('patient_invites')
    .update({ status: 'expired' as const })
    .eq('dietitian_id', user.id)
    .eq('status', 'pending')
    .lt('expires_at', new Date().toISOString())

  let query = supabase
    .from('patient_invites')
    .select('*')
    .eq('dietitian_id', user.id)
    .order('created_at', { ascending: false })

  if (options?.status && options.status !== 'all') {
    query = query.eq('status', options.status)
  }

  if (options?.search) {
    const digits = options.search.replace(/\D/g, '')
    if (digits.length >= 3) {
      query = query.like('phone', `%${digits}%`)
    }
  }

  if (options?.dateFrom) {
    query = query.gte('created_at', `${options.dateFrom}T00:00:00`)
  }
  if (options?.dateTo) {
    query = query.lte('created_at', `${options.dateTo}T23:59:59`)
  }

  const { data, error } = await query

  if (error) return { data: [], error: error.message }

  return { data: (data ?? []) as PatientInviteRow[] }
}

/** Typed row shape for the invites list view */
export interface PatientInviteRow {
  id: string
  phone: string
  country_code: string
  invite_token: string
  delivery_channel: 'whatsapp' | 'text_message' | 'sms' | null
  status: 'pending' | 'completed' | 'expired' | 'cancelled'
  patient_id: string | null
  expires_at: string
  created_at: string
}

// ── Cancel a pending invite ──────────────────────────────────────────────────

export async function cancelInvite(
  inviteId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: invite } = await supabase
    .from('patient_invites')
    .select('id, status, dietitian_id')
    .eq('id', inviteId)
    .eq('dietitian_id', user.id)
    .single()

  if (!invite) return { error: 'Invite not found.' }

  const row = invite as { id: string; status: string; dietitian_id: string }

  if (row.status !== 'pending') {
    return { error: 'Only pending invites can be cancelled.' }
  }

  const { error } = await supabase
    .from('patient_invites')
    .update({ status: 'cancelled' as const })
    .eq('id', row.id)

  if (error) return { error: error.message }

  revalidatePath('/patients')
  revalidatePath('/dashboard')

  return {}
}

// ── Get dietitian name + clinic name for invite message context ─────────────

export async function getInviteMessageContext(): Promise<{
  dietitianName: string
  clinicName: string
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { dietitianName: '', clinicName: '' }

  const [{ data: dietitian }, { data: practice }] = await Promise.all([
    supabase
      .from('dietitians')
      .select('full_name')
      .eq('id', user.id)
      .single(),
    supabase
      .from('dietitian_practice')
      .select('clinic_name')
      .eq('dietitian_id', user.id)
      .single(),
  ])

  return {
    dietitianName: (dietitian as { full_name: string } | null)?.full_name ?? '',
    clinicName: (practice as { clinic_name: string | null } | null)?.clinic_name ?? '',
  }
}

// ── Resend an expired / cancelled invite ────────────────────────────────────

export async function resendInvite(
  inviteId: string
): Promise<{ token?: string; inviteUrl?: string; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  if (isRateLimited(`invite-create:${user.id}`, 10, 3_600_000)) {
    return { error: 'You\u2019ve reached the invite limit (10/hour). Please try again later.' }
  }

  // Fetch the existing invite (owned by this dietitian)
  const { data: invite } = await supabase
    .from('patient_invites')
    .select('id, status, dietitian_id')
    .eq('id', inviteId)
    .eq('dietitian_id', user.id)
    .single()

  if (!invite) return { error: 'Invite not found.' }

  const row = invite as { id: string; status: string; dietitian_id: string }

  if (row.status !== 'expired' && row.status !== 'cancelled') {
    return { error: 'Only expired or cancelled invites can be resent.' }
  }

  const newToken = generateInviteToken()
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000).toISOString()

  const { error } = await supabase
    .from('patient_invites')
    .update({
      invite_token: newToken,
      status: 'pending' as const,
      expires_at: expiresAt,
    })
    .eq('id', row.id)

  if (error) return { error: error.message }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const inviteUrl = `${baseUrl}/invite/${newToken}`

  revalidatePath('/patients')
  revalidatePath('/dashboard')

  return { token: newToken, inviteUrl }
}
