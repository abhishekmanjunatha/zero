-- Appointment lifecycle enhancements:
-- - Add checked_in and no_show statuses for appointments
-- - Add richer appointment lifecycle events to timeline_events

ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_status_check;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_status_check
  CHECK (status IN ('upcoming', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show'));

ALTER TABLE public.timeline_events
  DROP CONSTRAINT IF EXISTS timeline_events_event_type_check;

ALTER TABLE public.timeline_events
  ADD CONSTRAINT timeline_events_event_type_check
  CHECK (event_type IN (
    'appointment_created',
    'appointment_checked_in',
    'appointment_in_progress',
    'appointment_completed',
    'appointment_cancelled',
    'appointment_no_show',
    'clinical_document_created',
    'lab_report_uploaded',
    'weight_updated',
    'note_added'
  ));