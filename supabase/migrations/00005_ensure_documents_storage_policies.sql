-- ============================================================
-- Ensure documents storage bucket and RLS policies exist
-- Migration: 00005_ensure_documents_storage_policies.sql
-- ============================================================

-- Create or update documents bucket in case older environments missed it.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('documents', 'documents', false, 20971520, ARRAY['application/pdf','image/jpeg','image/png'])
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Upload/read/delete policies scoped to each authenticated user's top-level folder.
DROP POLICY IF EXISTS "documents_storage_select_own" ON storage.objects;
CREATE POLICY "documents_storage_select_own"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "documents_storage_insert_own" ON storage.objects;
CREATE POLICY "documents_storage_insert_own"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "documents_storage_update_own" ON storage.objects;
CREATE POLICY "documents_storage_update_own"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "documents_storage_delete_own" ON storage.objects;
CREATE POLICY "documents_storage_delete_own"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
