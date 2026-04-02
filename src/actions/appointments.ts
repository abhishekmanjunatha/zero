'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Tables, Json } from '@/types/database'
import type { CreateAppointmentInput } from '@/lib/validations/appointment'
import type { DayAvailability, SlotDuration, BufferTime } from '@/types/app'
import { generateSlots } from '@/lib/utils/slots'
import { emitNotification } from '@/lib/notifications/server'
import {
  getCurrentDateInTimeZone,
  getCurrentTimeInTimeZone,
  getWeekdayFromISODate,
  isPastOrCurrentSlotForTimeZone,
  toMinutes,
} from '@/lib/utils/timezone'

// ── Type for appointment rows with patient join ─────────────────────────────

export interface AppointmentWithPatient {
  id: string
  dietitian_id: string
  patient_id: string
  purpose: Tables<'appointments'>['purpose']
  custom_purpose: string | null
  mode: Tables<'appointments'>['mode']
  appointment_date: string
  appointment_time: string
  status: Tables<'appointments'>['status']
  notes: string | null
  created_at: string
  updated_at: string
  patient: {
    id: string
    full_name: string
    patient_code: string
    phone: string
  }
}

type AppointmentStatus = Tables<'appointments'>['status']
export type AppointmentsModeFilter = 'all' | Tables<'appointments'>['mode']

interface GetAppointmentsOptions {
  filter?: 'today' | 'upcoming' | 'completed'
  search?: string
  dateFrom?: string
  dateTo?: string
  mode?: AppointmentsModeFilter
}

const STATUS_EVENT_MAP: Partial<Record<AppointmentStatus, Tables<'timeline_events'>['event_type']>> = {
  checked_in: 'appointment_checked_in',
  in_progress: 'appointment_in_progress',
  completed: 'appointment_completed',
  cancelled: 'appointment_cancelled',
  no_show: 'appointment_no_show',
}

function canTransitionAppointment(
  mode: Tables<'appointments'>['mode'],
  from: AppointmentStatus,
  to: AppointmentStatus
): boolean {
  if (from === to) return false
  if (from === 'completed' || from === 'cancelled' || from === 'no_show') return false

  const commonTransitions: Record<AppointmentStatus, AppointmentStatus[]> = {
    upcoming: ['checked_in', 'in_progress', 'cancelled', 'no_show'],
    checked_in: ['in_progress', 'cancelled', 'no_show'],
    in_progress: ['completed', 'cancelled'],
    completed: [],
    cancelled: [],
    no_show: [],
  }

  // Walk-ins should typically start directly as in_progress.
  // We keep a permissive path for legacy rows that may still be upcoming.
  if (mode === 'walk_in' && from === 'upcoming') {
    return ['in_progress', 'cancelled'].includes(to)
  }

  return commonTransitions[from].includes(to)
}

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

// ── Get filtered appointments ──────────────────────────────────────────────

export async function getAppointments(
  options: 'today' | 'upcoming' | 'completed' | GetAppointmentsOptions = 'today'
): Promise<{ data: AppointmentWithPatient[]; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { data: [] }

  const filter =
    typeof options === 'string' ? options : (options.filter ?? 'today')
  const search = typeof options === 'string' ? '' : (options.search ?? '').trim().toLowerCase()
  const dateFrom = typeof options === 'string' ? '' : (options.dateFrom ?? '')
  const dateTo = typeof options === 'string' ? '' : (options.dateTo ?? '')
  const mode = typeof options === 'string' ? 'all' : (options.mode ?? 'all')

  const today = getCurrentDateInTimeZone()

  let query = supabase
    .from('appointments')
    .select('*, patients(id, full_name, patient_code, phone)')
    .eq('dietitian_id', user.id)

  if (filter === 'today') {
    query = query
      .neq('status', 'cancelled')
      .neq('status', 'no_show')
      .or(`appointment_date.eq.${today},status.in.(checked_in,in_progress)`)
  } else if (filter === 'upcoming') {
    query = query
      .gte('appointment_date', today)
      .in('status', ['upcoming', 'checked_in', 'in_progress'])
  } else if (filter === 'completed') {
    query = query.in('status', ['completed', 'cancelled', 'no_show'])
  }

  if (mode !== 'all') {
    query = query.eq('mode', mode)
  }

  if (dateFrom) {
    query = query.gte('appointment_date', dateFrom)
  }

  if (dateTo) {
    query = query.lte('appointment_date', dateTo)
  }

  const { data, error } = await query.order('appointment_date', { ascending: filter !== 'completed' })
    .order('appointment_time', { ascending: true })

  if (error) {
    console.error('[Appointments] getAppointments error:', error.message)
    return { data: [], error: 'Failed to load appointments. Please try again.' }
  }

  let rows = (data as unknown as Array<
    Omit<AppointmentWithPatient, 'patient'> & {
      patients: AppointmentWithPatient['patient']
    }
  >).map((row) => ({
    ...row,
    patient: row.patients,
  }))

  if (search) {
    rows = rows.filter((row) => {
      const purposeLabel =
        row.purpose === 'custom' && row.custom_purpose
          ? row.custom_purpose
          : row.purpose.replaceAll('_', ' ')

      const haystack = [
        row.patient.full_name,
        row.patient.patient_code,
        row.patient.phone,
        purposeLabel,
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(search)
    })
  }

  return { data: rows }
}

// ── Get available slots for a given date ───────────────────────────────────

export async function getAvailableSlots(
  date: string
): Promise<{ slots: string[]; slotDuration: number }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { slots: [], slotDuration: 30 }

  // Determine day of week in clinic timezone so slot generation is timezone-safe.
  const dayOfWeek = getWeekdayFromISODate(date) as Tables<'dietitian_availability'>['day_of_week']

  // Fetch dietitian's availability for that day
  const { data: avail } = await supabase
    .from('dietitian_availability')
    .select('*')
    .eq('dietitian_id', user.id)
    .eq('day_of_week', dayOfWeek)
    .single()

  const availability = avail as Tables<'dietitian_availability'> | null

  if (!availability || !availability.is_available) {
    return { slots: [], slotDuration: availability?.slot_duration ?? 30 }
  }

  const timeSlots = (availability.time_slots ?? []) as Array<{ start: string; end: string }>
  const slotDuration = availability.slot_duration as SlotDuration
  const bufferTime = availability.buffer_time as BufferTime

  const dayAvailability: DayAvailability = {
    day: dayOfWeek,
    available: true,
    slots: timeSlots,
  }

  const allSlots = generateSlots(dayAvailability, slotDuration, bufferTime)

  // Fetch existing appointments for that date to exclude booked slots
  const { data: existing } = await supabase
    .from('appointments')
    .select('appointment_time')
    .eq('dietitian_id', user.id)
    .eq('appointment_date', date)
    .neq('status', 'cancelled')

  const bookedTimes = new Set(
    ((existing ?? []) as Array<{ appointment_time: string }>).map((a) => a.appointment_time)
  )

  const todayInClinicTz = getCurrentDateInTimeZone()
  const nowInClinicMinutes = toMinutes(getCurrentTimeInTimeZone())

  const available = allSlots.filter((slot) => {
    if (bookedTimes.has(slot)) return false
    if (date < todayInClinicTz) return false
    if (date > todayInClinicTz) return true
    return toMinutes(slot) > nowInClinicMinutes
  })

  return { slots: available, slotDuration }
}

// ── Create appointment ─────────────────────────────────────────────────────

export async function createAppointment(
  input: CreateAppointmentInput
): Promise<{ error?: string; appointmentId?: string }> {
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

  if (
    input.mode === 'scheduled' &&
    isPastOrCurrentSlotForTimeZone(input.appointment_date, input.appointment_time)
  ) {
    return { error: 'Cannot create an appointment in the past. Please choose a future time.' }
  }

  // Double-booking prevention: check if this slot is already taken
  const { data: clash } = await supabase
    .from('appointments')
    .select('id')
    .eq('dietitian_id', user.id)
    .eq('appointment_date', input.appointment_date)
    .eq('appointment_time', input.appointment_time)
    .neq('status', 'cancelled')
    .maybeSingle()

  if (clash) {
    return { error: 'This time slot is already booked. Please choose another.' }
  }

  const initialStatus: AppointmentStatus = input.mode === 'walk_in' ? 'in_progress' : 'upcoming'

  const { data, error } = await supabase
    .from('appointments')
    .insert({
      dietitian_id: user.id,
      patient_id: input.patient_id,
      purpose: input.purpose,
      custom_purpose: input.purpose === 'custom' ? (input.custom_purpose ?? null) : null,
      mode: input.mode,
      appointment_date: input.appointment_date,
      appointment_time: input.appointment_time,
      status: initialStatus,
      notes: input.notes || null,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  const newId = (data as { id: string }).id

  // NOTE: last_visit_at is updated only when appointment is marked completed,
  // not on creation, to accurately reflect when the patient was actually seen.

  // Create timeline event
  await supabase.from('timeline_events').insert({
    dietitian_id: user.id,
    patient_id: input.patient_id,
    event_type: 'appointment_created',
    event_data: {
      purpose: input.purpose,
      date: input.appointment_date,
      time: input.appointment_time,
      mode: input.mode,
      status: initialStatus,
    } as unknown as Json,
    reference_id: newId,
  })

  if (initialStatus === 'in_progress') {
    await supabase.from('timeline_events').insert({
      dietitian_id: user.id,
      patient_id: input.patient_id,
      event_type: 'appointment_in_progress',
      event_data: {
        purpose: input.purpose,
        date: input.appointment_date,
        time: input.appointment_time,
        mode: input.mode,
        source: 'walk_in_auto_start',
      } as unknown as Json,
      reference_id: newId,
    })
  }

  await emitNotification(supabase, {
    dietitianId: user.id,
    patientId: input.patient_id,
    type: 'appointment_created',
    title: 'Appointment created',
    message: `${input.appointment_date} at ${input.appointment_time} (${input.mode === 'walk_in' ? 'Walk-in' : 'Scheduled'})`,
    actionUrl: `/patients/${input.patient_id}?tab=appointments`,
    metadata: {
      appointment_id: newId,
      purpose: input.purpose,
      status: initialStatus,
      mode: input.mode,
    } as Json,
  })

  revalidatePath('/appointments')
  revalidatePath('/dashboard')
  revalidatePath(`/patients/${input.patient_id}`)

  return { appointmentId: newId }
}

// ── Update appointment status ──────────────────────────────────────────────

export async function updateAppointmentStatus(
  id: string,
  status: 'checked_in' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Get the appointment first (for timeline)
  const { data: appt } = await supabase
    .from('appointments')
    .select('id, patient_id, purpose, appointment_date, appointment_time, mode, status')
    .eq('id', id)
    .eq('dietitian_id', user.id)
    .single()

  if (!appt) return { error: 'Appointment not found' }

  const appointment = appt as Pick<
    Tables<'appointments'>,
    'id' | 'patient_id' | 'purpose' | 'appointment_date' | 'appointment_time' | 'mode' | 'status'
  >

  if (!canTransitionAppointment(appointment.mode, appointment.status, status)) {
    return { error: `Invalid status transition from ${appointment.status.replace('_', ' ')} to ${status.replace('_', ' ')}` }
  }

  const ownsPatient = await ensurePatientOwnedByDietitian(
    supabase,
    user.id,
    appointment.patient_id
  )
  if (!ownsPatient) return { error: 'Invalid patient reference for this account.' }

  const { error } = await supabase
    .from('appointments')
    .update({ status })
    .eq('id', id)
    .eq('dietitian_id', user.id)

  if (error) return { error: error.message }

  const timelineEventType = STATUS_EVENT_MAP[status]
  if (timelineEventType) {
    await supabase.from('timeline_events').insert({
      dietitian_id: user.id,
      patient_id: appointment.patient_id,
      event_type: timelineEventType,
      event_data: {
        purpose: appointment.purpose,
        date: appointment.appointment_date,
        time: appointment.appointment_time,
        mode: appointment.mode,
        previous_status: appointment.status,
        next_status: status,
      } as unknown as Json,
      reference_id: id,
    })
  }

  const statusNotification: Record<typeof status, { type: Tables<'notifications'>['type']; title: string }> = {
    checked_in: {
      type: 'appointment_checked_in',
      title: 'Patient checked in',
    },
    in_progress: {
      type: 'appointment_in_progress',
      title: 'Consultation started',
    },
    completed: {
      type: 'appointment_completed',
      title: 'Appointment completed',
    },
    cancelled: {
      type: 'appointment_cancelled',
      title: 'Appointment cancelled',
    },
    no_show: {
      type: 'appointment_no_show',
      title: 'Patient marked no-show',
    },
  }

  await emitNotification(supabase, {
    dietitianId: user.id,
    patientId: appointment.patient_id,
    type: statusNotification[status].type,
    title: statusNotification[status].title,
    message: `${appointment.appointment_date} at ${appointment.appointment_time}`,
    actionUrl: `/patients/${appointment.patient_id}?tab=appointments`,
    metadata: {
      appointment_id: id,
      previous_status: appointment.status,
      next_status: status,
      mode: appointment.mode,
    } as Json,
  })

  if (status === 'completed') {
    // Update patient last_visit_at to the appointment date
    await supabase
      .from('patients')
      .update({ last_visit_at: appointment.appointment_date })
      .eq('id', appointment.patient_id)
  }

  revalidatePath('/appointments')
  revalidatePath('/dashboard')
  revalidatePath(`/patients/${appointment.patient_id}`)

  return {}
}
