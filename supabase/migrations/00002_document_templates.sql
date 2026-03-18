-- ============================================================
-- PEEPAL — Custom Document Templates
-- Migration: 00002_document_templates.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.document_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dietitian_id UUID NOT NULL REFERENCES public.dietitians(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS document_templates_unique_name_per_dietitian
  ON public.document_templates(dietitian_id, name);

DROP TRIGGER IF EXISTS document_templates_updated_at ON public.document_templates;
CREATE TRIGGER document_templates_updated_at
  BEFORE UPDATE ON public.document_templates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "document_templates_select_own" ON public.document_templates;
CREATE POLICY "document_templates_select_own"
  ON public.document_templates FOR SELECT
  USING (dietitian_id = auth.uid());

DROP POLICY IF EXISTS "document_templates_insert_own" ON public.document_templates;
CREATE POLICY "document_templates_insert_own"
  ON public.document_templates FOR INSERT
  WITH CHECK (dietitian_id = auth.uid());

DROP POLICY IF EXISTS "document_templates_update_own" ON public.document_templates;
CREATE POLICY "document_templates_update_own"
  ON public.document_templates FOR UPDATE
  USING (dietitian_id = auth.uid())
  WITH CHECK (dietitian_id = auth.uid());

DROP POLICY IF EXISTS "document_templates_delete_own" ON public.document_templates;
CREATE POLICY "document_templates_delete_own"
  ON public.document_templates FOR DELETE
  USING (dietitian_id = auth.uid());
