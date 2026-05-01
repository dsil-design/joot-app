-- Migration: add_email_attachments
-- Created: 2026-04-29
-- Description: Capture PDF attachments from synced emails and store extracted
--              text so the extraction pipeline can use receipt PDFs alongside
--              the email body.

BEGIN;

-- ============================================================================
-- TABLE: email_attachments
-- ============================================================================

CREATE TABLE public.email_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  email_id UUID REFERENCES public.emails(id) ON DELETE CASCADE NOT NULL,

  -- Source data from IMAP
  filename TEXT NOT NULL,
  content_type TEXT,
  size_bytes INTEGER,
  imap_part_id TEXT,                -- MIME part path (e.g. "2", "2.1") for re-fetching

  -- Storage
  storage_path TEXT,                -- Path in email-attachments bucket; NULL if not stored

  -- Extraction results
  extraction_status TEXT NOT NULL DEFAULT 'pending' CHECK (extraction_status IN (
    'pending',                      -- Not yet processed
    'extracted',                    -- PDF text extracted successfully
    'failed',                       -- Extraction attempted, failed
    'skipped'                       -- Not a PDF (or otherwise ignored)
  )),
  extracted_text TEXT,              -- Text extracted from PDF
  page_count INTEGER,
  pdf_metadata JSONB,               -- Title/author/etc. from PDF
  extraction_error TEXT,
  extracted_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Same email can have multiple attachments with the same name; dedupe on
  -- the imap part within an email instead of filename.
  UNIQUE(email_id, imap_part_id)
);

CREATE INDEX idx_email_attachments_email_id ON public.email_attachments(email_id);
CREATE INDEX idx_email_attachments_user_id ON public.email_attachments(user_id);
CREATE INDEX idx_email_attachments_status ON public.email_attachments(extraction_status)
  WHERE extraction_status = 'pending';

ALTER TABLE public.email_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own email attachments" ON public.email_attachments
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own email attachments" ON public.email_attachments
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own email attachments" ON public.email_attachments
  FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own email attachments" ON public.email_attachments
  FOR DELETE USING ((select auth.uid()) = user_id);

-- ============================================================================
-- STORAGE BUCKET: email-attachments (private)
-- ============================================================================
-- Layout: {user_id}/{email_id}/{attachment_id}.pdf

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'email-attachments',
  'email-attachments',
  false,
  10485760,  -- 10MB cap, same as statement-uploads
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can upload own email attachments" ON storage.objects;
CREATE POLICY "Users can upload own email attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'email-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can view own email attachments" ON storage.objects;
CREATE POLICY "Users can view own email attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'email-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can update own email attachments" ON storage.objects;
CREATE POLICY "Users can update own email attachments"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'email-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can delete own email attachments" ON storage.objects;
CREATE POLICY "Users can delete own email attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'email-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

COMMIT;
