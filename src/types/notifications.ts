export const NOTIFICATION_TYPES = [
  'appointment_created',
  'appointment_checked_in',
  'appointment_in_progress',
  'appointment_completed',
  'appointment_cancelled',
  'appointment_no_show',
  'lab_report_uploaded',
  'clinical_document_created',
  'clinical_document_updated',
  'patient_created',
  'patient_updated',
  'template_created',
  'template_updated',
  'template_deleted',
  'profile_updated',
  'professional_profile_updated',
  'practice_updated',
  'availability_updated',
] as const

export type NotificationType = (typeof NOTIFICATION_TYPES)[number]
