-- Notification system foundation
-- - Adds in-app notifications table
-- - Enables RLS and tenant-safe policies
-- - Adds realtime publication for live bell updates

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dietitian_id UUID NOT NULL REFERENCES public.dietitians(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (
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
      'template_created',
      'template_updated',
      'template_deleted',
      'profile_updated',
      'professional_profile_updated',
      'practice_updated',
      'availability_updated'
    )
  ),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS notifications_updated_at ON public.notifications;
CREATE TRIGGER notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_notifications_dietitian_created
  ON public.notifications(dietitian_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_dietitian_unread
  ON public.notifications(dietitian_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_patient
  ON public.notifications(patient_id, created_at DESC)
  WHERE patient_id IS NOT NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT
  USING (dietitian_id = auth.uid());

DROP POLICY IF EXISTS "notifications_insert_own" ON public.notifications;
CREATE POLICY "notifications_insert_own"
  ON public.notifications FOR INSERT
  WITH CHECK (dietitian_id = auth.uid());

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE
  USING (dietitian_id = auth.uid())
  WITH CHECK (dietitian_id = auth.uid());

DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
CREATE POLICY "notifications_delete_own"
  ON public.notifications FOR DELETE
  USING (dietitian_id = auth.uid());

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication
    WHERE pubname = 'supabase_realtime'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;
