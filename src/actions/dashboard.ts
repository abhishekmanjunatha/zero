'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentDateInTimeZone } from '@/lib/utils/timezone'

export interface TodayAppointment {
  id: string
  appointment_date: string
  appointment_time: string
  status: 'upcoming' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
  mode: 'walk_in' | 'scheduled'
  purpose: 'new_consultation' | 'follow_up' | 'review_with_report' | 'custom'
  custom_purpose: string | null
  patient: {
    id: string
    full_name: string
    patient_code: string
    phone: string | null
  }
}

export interface RecentPatient {
  id: string
  full_name: string
  patient_code: string
  phone: string
  last_visit_at: string | null
}

export interface DashboardStats {
  todayCount: number
  totalPatients: number
  pendingFollowUps: number
  completedThisWeek: number
  upcomingNext7Days: number
}

export interface DietitianGreeting {
  fullName: string
  photoUrl: string | null
}

export interface RecentActivityEvent {
  id: string
  event_type: string
  patient_name: string
  patient_id: string
  reference_id: string | null
  created_at: string
}

// ─── Today's appointments ───────────────────────────────────────────────────

export async function getTodayAppointments(): Promise<TodayAppointment[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const today = getCurrentDateInTimeZone()

  const { data, error } = await supabase
    .from('appointments')
    .select('id, appointment_date, appointment_time, status, mode, purpose, custom_purpose, patients(id, full_name, patient_code, phone)')
    .eq('dietitian_id', user.id)
    .neq('status', 'cancelled')
    .neq('status', 'no_show')
    .or(`appointment_date.eq.${today},status.in.(checked_in,in_progress)`)
    .order('appointment_time', { ascending: true })

  if (error || !data) return []

  return (data as unknown as Array<{
    id: string
    appointment_date: string
    appointment_time: string
    status: TodayAppointment['status']
    mode: TodayAppointment['mode']
    purpose: TodayAppointment['purpose']
    custom_purpose: string | null
    patients: {
      id: string
      full_name: string
      patient_code: string
      phone: string | null
    }
  }>).map((row) => ({
    id: row.id,
    appointment_date: row.appointment_date,
    appointment_time: row.appointment_time,
    status: row.status,
    mode: row.mode,
    purpose: row.purpose,
    custom_purpose: row.custom_purpose,
    patient: row.patients,
  }))
}

// ─── Recent patients ────────────────────────────────────────────────────────

export async function getRecentPatients(): Promise<RecentPatient[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('patients')
    .select('id, full_name, patient_code, phone, last_visit_at')
    .eq('dietitian_id', user.id)
    .order('last_visit_at', { ascending: false, nullsFirst: false })
    .limit(5)

  if (error || !data) return []

  return data as RecentPatient[]
}

// ─── Dashboard stats ────────────────────────────────────────────────────────

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { todayCount: 0, totalPatients: 0, pendingFollowUps: 0, completedThisWeek: 0, upcomingNext7Days: 0 }

  const today = getCurrentDateInTimeZone()

  // start of current ISO week (Monday)
  const todayDate = new Date(today)
  const dayOfWeek = todayDate.getDay() // 0=Sun
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const weekStart = new Date(todayDate)
  weekStart.setDate(todayDate.getDate() + diffToMonday)
  const weekStartStr = weekStart.toISOString().slice(0, 10)

  // +7 days from today
  const plus7 = new Date(todayDate)
  plus7.setDate(todayDate.getDate() + 7)
  const plus7Str = plus7.toISOString().slice(0, 10)

  const tomorrow = new Date(todayDate)
  tomorrow.setDate(todayDate.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().slice(0, 10)

  const [
    todayRes,
    patientsRes,
    followUpsRes,
    completedRes,
    upcomingRes,
  ] = await Promise.all([
    // today's appointments (excluding cancelled/no_show)
    supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('dietitian_id', user.id)
      .eq('appointment_date', today)
      .neq('status', 'cancelled')
      .neq('status', 'no_show'),

    // total patients
    supabase
      .from('patients')
      .select('id', { count: 'exact', head: true })
      .eq('dietitian_id', user.id),

    // pending follow-ups
    supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('dietitian_id', user.id)
      .eq('purpose', 'follow_up')
      .eq('status', 'upcoming'),

    // completed this week
    supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('dietitian_id', user.id)
      .eq('status', 'completed')
      .gte('appointment_date', weekStartStr)
      .lte('appointment_date', today),

    // upcoming next 7 days (tomorrow through +7)
    supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('dietitian_id', user.id)
      .eq('status', 'upcoming')
      .gte('appointment_date', tomorrowStr)
      .lte('appointment_date', plus7Str),
  ])

  return {
    todayCount: todayRes.count ?? 0,
    totalPatients: patientsRes.count ?? 0,
    pendingFollowUps: followUpsRes.count ?? 0,
    completedThisWeek: completedRes.count ?? 0,
    upcomingNext7Days: upcomingRes.count ?? 0,
  }
}

// ─── Dietitian greeting info ────────────────────────────────────────────────

export async function getDietitianGreeting(): Promise<DietitianGreeting> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { fullName: '', photoUrl: null }

  const { data } = await supabase
    .from('dietitians')
    .select('full_name, photo_url')
    .eq('id', user.id)
    .single()

  return {
    fullName: data?.full_name ?? '',
    photoUrl: data?.photo_url ?? null,
  }
}

// ─── Recent activity feed ───────────────────────────────────────────────────

export async function getRecentActivity(): Promise<RecentActivityEvent[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('timeline_events')
    .select('id, event_type, patient_id, reference_id, created_at, patients(full_name)')
    .eq('dietitian_id', user.id)
    .order('created_at', { ascending: false })
    .limit(8)

  if (error || !data) return []

  return (data as unknown as Array<{
    id: string
    event_type: string
    patient_id: string
    reference_id: string | null
    created_at: string
    patients: { full_name: string } | null
  }>).map((row) => ({
    id: row.id,
    event_type: row.event_type,
    patient_name: row.patients?.full_name ?? 'Unknown',
    patient_id: row.patient_id,
    reference_id: row.reference_id,
    created_at: row.created_at,
  }))
}

