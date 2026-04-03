import type {
  AppointmentPurpose,
  AppointmentMode,
  AppointmentStatus,
  DocumentType,
  ReportType,
  Gender,
  ActivityLevel,
  DietaryType,
  WorkType,
  PrimaryGoal,
  TimelineEventType,
} from '@/types/app'

// ── Appointment ───────────────────────────────────────────────────────────────

export const PURPOSE_LABELS: Record<AppointmentPurpose, string> = {
  new_consultation: 'New Consultation',
  follow_up: 'Follow-up',
  review_with_report: 'Review with Report',
  custom: 'Custom',
}

export const MODE_LABELS: Record<AppointmentMode, string> = {
  walk_in: 'Walk-in',
  scheduled: 'Scheduled',
}

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  upcoming: 'Upcoming',
  checked_in: 'Checked In',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No Show',
}

// ── Clinical Notes ────────────────────────────────────────────────────────────

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  quick_note: 'Quick Note',
  meal_plan: 'Meal Plan',
  follow_up_recommendation: 'Follow-up Recommendation',
  custom: 'Custom',
}

// ── Lab Reports ───────────────────────────────────────────────────────────────

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  blood_test: 'Blood Test',
  thyroid_panel: 'Thyroid Panel',
  vitamin_panel: 'Vitamin Panel',
  lipid_profile: 'Lipid Profile',
  other: 'Other',
}

// ── Patient Profile ───────────────────────────────────────────────────────────

export const GENDER_LABELS: Record<Gender, string> = {
  male: 'Male',
  female: 'Female',
  prefer_not_to_say: 'Prefer not to say',
  other: 'Other',
}

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Sedentary',
  lightly_active: 'Lightly Active',
  highly_active: 'Highly Active',
}

export const DIETARY_LABELS: Record<DietaryType, string> = {
  vegetarian: 'Vegetarian',
  non_vegetarian: 'Non-Vegetarian',
  vegan: 'Vegan',
  eggitarian: 'Eggitarian',
}

export const WORK_LABELS: Record<WorkType, string> = {
  desk_job: 'Desk Job',
  field_work: 'Field Work',
  other: 'Other',
}

export const GOAL_LABELS: Record<PrimaryGoal, string> = {
  weight_loss: 'Weight Loss',
  muscle_gain: 'Muscle Gain',
  maintenance: 'Maintenance',
  condition_management: 'Condition Management',
}

// ── Timeline ──────────────────────────────────────────────────────────────────

export const TIMELINE_EVENT_LABELS: Record<TimelineEventType, string> = {
  appointment_created: 'Appointment Created',
  appointment_checked_in: 'Checked In',
  appointment_in_progress: 'Appointment In Progress',
  appointment_completed: 'Appointment Completed',
  appointment_cancelled: 'Appointment Cancelled',
  appointment_no_show: 'No Show',
  clinical_document_created: 'Clinical Document Created',
  lab_report_uploaded: 'Lab Report Uploaded',
  weight_updated: 'Weight Updated',
  note_added: 'Note Added',
  patient_invited: 'Patient Invited',
}
