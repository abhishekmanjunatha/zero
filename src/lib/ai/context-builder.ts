/**
 * Context builder for patient AI insights.
 *
 * Aggregates patient data from multiple sources, de-identifies it,
 * and returns a prompt-ready context string with token-aware truncation.
 *
 * Server-only — do NOT import on the client side.
 */

import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/types/database'
import type { DeidentifiedPatientContext } from '@/types/ai'
import { deidentifyPatientContext } from './deidentify'

// ── Fetch & build full patient context ──────────────────────────────────────

export async function buildPatientAIContext(
  patientId: string,
  dietitianId: string
): Promise<{ context: DeidentifiedPatientContext; error?: string }> {
  const supabase = await createClient()

  // Fetch all data in parallel
  const [patientRes, appointmentsRes, notesRes, labsRes, timelineRes] = await Promise.all([
    supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .eq('dietitian_id', dietitianId)
      .single(),
    supabase
      .from('appointments')
      .select('*')
      .eq('patient_id', patientId)
      .eq('dietitian_id', dietitianId)
      .order('appointment_date', { ascending: true }),
    supabase
      .from('clinical_notes')
      .select('*')
      .eq('patient_id', patientId)
      .eq('dietitian_id', dietitianId)
      .order('created_at', { ascending: true }),
    supabase
      .from('lab_reports')
      .select('*')
      .eq('patient_id', patientId)
      .eq('dietitian_id', dietitianId)
      .order('created_at', { ascending: true }),
    supabase
      .from('timeline_events')
      .select('*')
      .eq('patient_id', patientId)
      .eq('dietitian_id', dietitianId)
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  if (patientRes.error || !patientRes.data) {
    return {
      context: null as unknown as DeidentifiedPatientContext,
      error: 'Patient not found or access denied.',
    }
  }

  const patient = patientRes.data as Tables<'patients'>
  const appointments = (appointmentsRes.data as Tables<'appointments'>[] | null) ?? []
  const notes = (notesRes.data as Tables<'clinical_notes'>[] | null) ?? []
  const labs = (labsRes.data as Tables<'lab_reports'>[] | null) ?? []
  const timeline = (timelineRes.data as Tables<'timeline_events'>[] | null) ?? []

  const context = deidentifyPatientContext(patient, appointments, notes, labs, timeline)

  return { context }
}

// ── Build context scoped to last completed visit ────────────────────────────

export async function buildLastVisitContext(
  patientId: string,
  dietitianId: string
): Promise<{ context: DeidentifiedPatientContext | null; error?: string }> {
  const supabase = await createClient()

  // Get patient first
  const { data: patient, error: patientError } = await supabase
    .from('patients')
    .select('*')
    .eq('id', patientId)
    .eq('dietitian_id', dietitianId)
    .single()

  if (patientError || !patient) {
    return { context: null, error: 'Patient not found or access denied.' }
  }

  // Get last completed appointment
  const { data: lastAppointments } = await supabase
    .from('appointments')
    .select('*')
    .eq('patient_id', patientId)
    .eq('dietitian_id', dietitianId)
    .eq('status', 'completed')
    .order('appointment_date', { ascending: false })
    .limit(1)

  const lastAppt = (lastAppointments as Tables<'appointments'>[] | null)?.[0]
  if (!lastAppt) {
    return { context: null, error: 'No completed appointments found for this patient.' }
  }

  // Get notes and labs created around the last visit date (±2 days)
  const visitDate = new Date(lastAppt.appointment_date)
  const dateFrom = new Date(visitDate)
  dateFrom.setDate(dateFrom.getDate() - 2)
  const dateTo = new Date(visitDate)
  dateTo.setDate(dateTo.getDate() + 2)

  const [notesRes, labsRes] = await Promise.all([
    supabase
      .from('clinical_notes')
      .select('*')
      .eq('patient_id', patientId)
      .eq('dietitian_id', dietitianId)
      .gte('created_at', dateFrom.toISOString())
      .lte('created_at', dateTo.toISOString())
      .order('created_at', { ascending: true }),
    supabase
      .from('lab_reports')
      .select('*')
      .eq('patient_id', patientId)
      .eq('dietitian_id', dietitianId)
      .gte('created_at', dateFrom.toISOString())
      .lte('created_at', dateTo.toISOString())
      .order('created_at', { ascending: true }),
  ])

  const notes = (notesRes.data as Tables<'clinical_notes'>[] | null) ?? []
  const labs = (labsRes.data as Tables<'lab_reports'>[] | null) ?? []

  const typedPatient = patient as Tables<'patients'>
  const context = deidentifyPatientContext(typedPatient, [lastAppt], notes, labs, [])

  return { context }
}

// ── Serialize context to prompt string ──────────────────────────────────────

export function serializeContextForPrompt(
  ctx: DeidentifiedPatientContext,
  maxChars = 8000
): string {
  const sections: string[] = []

  // Demographics
  const demo = ctx.demographics
  sections.push(
    `## Patient Demographics\n` +
    `Age: ${demo.age ?? 'Unknown'}, Gender: ${demo.gender ?? 'Unknown'}\n` +
    `Height: ${demo.height_cm ? `${demo.height_cm} cm` : 'Unknown'}, Weight: ${demo.weight_kg ? `${demo.weight_kg} kg` : 'Unknown'}, BMI: ${demo.bmi ?? 'Unknown'}`
  )

  // Lifestyle
  const ls = ctx.lifestyle
  sections.push(
    `## Lifestyle\n` +
    `Goal: ${ls.primary_goal?.replace(/_/g, ' ') ?? 'Not set'}\n` +
    `Activity: ${ls.activity_level?.replace(/_/g, ' ') ?? 'Unknown'}, Sleep: ${ls.sleep_hours ? `${ls.sleep_hours} hrs` : 'Unknown'}\n` +
    `Work: ${ls.work_type?.replace(/_/g, ' ') ?? 'Unknown'}, Diet: ${ls.dietary_type?.replace(/_/g, ' ') ?? 'Unknown'}`
  )

  // Medical
  sections.push(
    `## Medical\n` +
    `Conditions: ${ctx.medical.conditions.length ? ctx.medical.conditions.join(', ') : 'None'}\n` +
    `Allergies: ${ctx.medical.allergies.length ? ctx.medical.allergies.join(', ') : 'None'}`
  )

  // Metadata
  sections.push(
    `## Engagement\n` +
    `Patient since: ${ctx.patientSince.split('T')[0]}\n` +
    `Last visit: ${ctx.lastVisitAt?.split('T')[0] ?? 'Never'}\n` +
    `Total appointments: ${ctx.totalAppointments}, Completed: ${ctx.completedAppointments}`
  )

  // Appointments (newest first, limit to 15)
  if (ctx.appointments.length > 0) {
    const appts = [...ctx.appointments].reverse().slice(0, 15)
    const lines = appts.map(
      (a) =>
        `- ${a.date} ${a.time}: ${a.purpose.replace(/_/g, ' ')}${a.custom_purpose ? ` (${a.custom_purpose})` : ''} [${a.status}]${a.notes ? ` — ${a.notes.slice(0, 100)}` : ''}`
    )
    sections.push(`## Appointment History (${ctx.appointments.length} total)\n${lines.join('\n')}`)
  }

  // Clinical Notes (newest first, limit to 10)
  if (ctx.clinicalNotes.length > 0) {
    const notes = [...ctx.clinicalNotes].reverse().slice(0, 10)
    const lines = notes.map(
      (n) =>
        `- ${n.date.split('T')[0]}: [${n.document_type.replace(/_/g, ' ')}] "${n.title}" (v${n.version})\n  ${n.content_summary.slice(0, 300)}`
    )
    sections.push(`## Clinical Notes (${ctx.clinicalNotes.length} total)\n${lines.join('\n')}`)
  }

  // Lab Reports (newest first, limit to 8)
  if (ctx.labReports.length > 0) {
    const labs = [...ctx.labReports].reverse().slice(0, 8)
    const lines = labs.map((l) => {
      let line = `- ${l.date.split('T')[0]}: [${l.report_type ?? 'other'}] "${l.title}"`
      if (l.ai_summary) line += `\n  Summary: ${l.ai_summary.slice(0, 200)}`
      if (l.metrics.length > 0) {
        const metricsStr = l.metrics
          .map((m) => `${m.name}: ${m.value} (${m.status})`)
          .join(', ')
        line += `\n  Metrics: ${metricsStr.slice(0, 300)}`
      }
      if (l.observations.length > 0) {
        const obsStr = l.observations.map((o) => `[${o.type}] ${o.text}`).join('; ')
        line += `\n  Observations: ${obsStr.slice(0, 200)}`
      }
      return line
    })
    sections.push(`## Lab Reports (${ctx.labReports.length} total)\n${lines.join('\n')}`)
  }

  let result = sections.join('\n\n')

  // Token-aware truncation
  if (result.length > maxChars) {
    result = result.slice(0, maxChars) + '\n\n[Context truncated for length]'
  }

  return result
}
