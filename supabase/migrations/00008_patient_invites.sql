-- 00008 Patient Invites (idempotent — safe to re-run)
-- - Adds patient_invites table for dietitian-to-patient invite links
-- - Secure token-based self-registration flow

CREATE TABLE IF NOT EXISTS public.patient_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dietitian_id UUID NOT NULL REFERENCES public.dietitians(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  country_code TEXT NOT NULL DEFAULT '+91',
  invite_token TEXT UNIQUE NOT NULL,
  invite_message TEXT,
  delivery_channel TEXT CHECK (delivery_channel IN ('whatsapp', 'text_message', 'sms')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired', 'cancelled')),
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS patient_invites_updated_at ON public.patient_invites;
CREATE TRIGGER patient_invites_updated_at
  BEFORE UPDATE ON public.patient_invites
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_patient_invites_token
  ON public.patient_invites(invite_token)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_patient_invites_dietitian
  ON public.patient_invites(dietitian_id, created_at DESC);

-- RLS: dietitian-scoped access
ALTER TABLE public.patient_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "patient_invites_select_own" ON public.patient_invites;
CREATE POLICY "patient_invites_select_own"
  ON public.patient_invites FOR SELECT
  USING (dietitian_id = auth.uid());

DROP POLICY IF EXISTS "patient_invites_insert_own" ON public.patient_invites;
CREATE POLICY "patient_invites_insert_own"
  ON public.patient_invites FOR INSERT
  WITH CHECK (dietitian_id = auth.uid());

DROP POLICY IF EXISTS "patient_invites_update_own" ON public.patient_invites;
CREATE POLICY "patient_invites_update_own"
  ON public.patient_invites FOR UPDATE
  USING (dietitian_id = auth.uid())
  WITH CHECK (dietitian_id = auth.uid());

-- Extend notifications type CHECK to include 'patient_invited'
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (
  type IN (
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
    'patient_invited',
    'template_created',
    'template_updated',
    'template_deleted',
    'profile_updated',
    'professional_profile_updated',
    'practice_updated',
    'availability_updated'
  )
);

-- Extend timeline_events event_type CHECK to include 'patient_invited'
ALTER TABLE public.timeline_events DROP CONSTRAINT IF EXISTS timeline_events_event_type_check;
ALTER TABLE public.timeline_events ADD CONSTRAINT timeline_events_event_type_check CHECK (
  event_type IN (
    'appointment_created',
    'appointment_checked_in',
    'appointment_in_progress',
    'appointment_completed',
    'appointment_cancelled',
    'appointment_no_show',
    'clinical_document_created',
    'lab_report_uploaded',
    'weight_updated',
    'note_added',
    'patient_invited'
  )
);
