-- ============================================================
-- Increase documents bucket size limit to support multi-page PDFs
-- Migration: 00006_increase_documents_bucket_limit.sql
-- ============================================================

UPDATE storage.buckets
SET
  file_size_limit = 52428800, -- 50 MB
  allowed_mime_types = ARRAY['application/pdf','image/jpeg','image/png']
WHERE id = 'documents';
