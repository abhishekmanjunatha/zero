/**
 * De-identification layer for patient data before AI processing.
 *
 * Strips all PII (name, phone, DOB, patient_code) at the prompt boundary.
 * Clinical data is preserved in full for summary quality.
 *
 * Server-only — do NOT import on the client side.
 */

import type { Tables } from '@/types/database'
import type { Json } from '@/types/database'
import type {
  DeidentifiedPatientContext,
  DeidentifiedAppointment,
  DeidentifiedClinicalNote,
  DeidentifiedLabReport,
  DeidentifiedTimelineEvent,
} from '@/types/ai'

// ── Age from DOB ────────────────────────────────────────────────────────────

function computeAge(dob: string | null): number | null {
  if (!dob) return null
  const birth = new Date(dob)
  if (isNaN(birth.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--
  return age
}

// ── BMI calculation ─────────────────────────────────────────────────────────

function computeBMI(heightCm: number | null, weightKg: number | null): number | null {
  if (!heightCm || !weightKg || heightCm <= 0) return null
  const heightM = heightCm / 100
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10
}

// ── Summarize clinical note content blocks ──────────────────────────────────

function summarizeNoteContent(content: Json, maxLength = 500): string {
  if (!content || !Array.isArray(content)) return ''

  const blocks = content as Array<{ label?: string; content?: string }>
  const parts: string[] = []

  for (const block of blocks) {
    if (block.content?.trim()) {
      const label = block.label?.trim()
      const text = block.content.trim()
      parts.push(label ? `${label}: ${text}` : text)
    }
  }

  const combined = parts.join(' | ')
  return combined.length > maxLength
    ? combined.slice(0, maxLength) + '…'
    : combined
}

// ── Parse AI observations from lab report ───────────────────────────────────

function parseLabMetrics(
  aiObservations: Json | null
): {
  metrics: Array<{ name: string; value: string; status: string }>
  observations: Array<{ type: string; text: string }>
} {
  if (!aiObservations || typeof aiObservations !== 'object' || Array.isArray(aiObservations)) {
    return { metrics: [], observations: [] }
  }

  const obs = aiObservations as Record<string, unknown>

  const metrics = Array.isArray(obs.metrics)
    ? (obs.metrics as Array<Record<string, unknown>>)
        .filter((m) => m.name && m.value && m.status)
        .map((m) => ({
          name: String(m.name),
          value: String(m.value),
          status: String(m.status),
        }))
    : []

  const observations = Array.isArray(obs.observations)
    ? (obs.observations as Array<Record<string, unknown>>)
        .filter((o) => o.type && o.text)
        .map((o) => ({
          type: String(o.type),
          text: String(o.text),
        }))
    : []

  return { metrics, observations }
}

// ── Main de-identification function ─────────────────────────────────────────

export function deidentifyPatientContext(
  patient: Tables<'patients'>,
  appointments: Tables<'appointments'>[],
  clinicalNotes: Tables<'clinical_notes'>[],
  labReports: Tables<'lab_reports'>[],
  timeline: Tables<'timeline_events'>[]
): DeidentifiedPatientContext {
  const age = computeAge(patient.date_of_birth)
  const bmi = computeBMI(patient.height_cm, patient.weight_kg)

  const deidentifiedAppointments: DeidentifiedAppointment[] = appointments.map((appt) => ({
    date: appt.appointment_date,
    time: appt.appointment_time,
    purpose: appt.purpose,
    custom_purpose: appt.custom_purpose,
    status: appt.status,
    mode: appt.mode,
    notes: appt.notes,
  }))

  const deidentifiedNotes: DeidentifiedClinicalNote[] = clinicalNotes.map((note) => ({
    date: note.created_at,
    document_type: note.document_type,
    title: note.title,
    content_summary: summarizeNoteContent(note.content),
    version: note.version,
  }))

  const deidentifiedLabs: DeidentifiedLabReport[] = labReports.map((report) => {
    const { metrics, observations } = parseLabMetrics(report.ai_observations)
    return {
      date: report.created_at,
      report_type: report.report_type,
      title: report.title,
      ai_summary: report.ai_summary,
      metrics,
      observations,
    }
  })

  const deidentifiedTimeline: DeidentifiedTimelineEvent[] = timeline.map((event) => ({
    date: event.created_at,
    event_type: event.event_type,
    event_data: (event.event_data ?? {}) as Record<string, unknown>,
  }))

  const completedAppointments = appointments.filter((a) => a.status === 'completed').length

  return {
    demographics: {
      age,
      gender: patient.gender,
      height_cm: patient.height_cm,
      weight_kg: patient.weight_kg,
      bmi,
    },
    lifestyle: {
      activity_level: patient.activity_level,
      sleep_hours: patient.sleep_hours,
      work_type: patient.work_type,
      dietary_type: patient.dietary_type,
      primary_goal: patient.primary_goal,
    },
    medical: {
      conditions: patient.medical_conditions ?? [],
      allergies: patient.food_allergies ?? [],
    },
    appointments: deidentifiedAppointments,
    clinicalNotes: deidentifiedNotes,
    labReports: deidentifiedLabs,
    timeline: deidentifiedTimeline,
    patientSince: patient.created_at,
    lastVisitAt: patient.last_visit_at,
    totalAppointments: appointments.length,
    completedAppointments,
  }
}
