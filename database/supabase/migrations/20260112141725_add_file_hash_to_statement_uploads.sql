-- Migration: add_file_hash_to_statement_uploads
-- Created: 2026-01-12 14:17:25
-- Purpose: Add file_hash column for duplicate file detection

BEGIN;

-- Add file_hash column to statement_uploads for duplicate file detection
-- SHA256 hash of file contents, stored as hex string
ALTER TABLE public.statement_uploads
ADD COLUMN IF NOT EXISTS file_hash TEXT;

-- Create index for fast hash lookups
CREATE INDEX IF NOT EXISTS idx_statement_uploads_file_hash
ON public.statement_uploads(file_hash)
WHERE file_hash IS NOT NULL;

-- Create unique constraint per user for file hash (same user can't upload same file twice)
-- Note: Different users CAN upload the same file (e.g., shared household statements)
CREATE UNIQUE INDEX IF NOT EXISTS idx_statement_uploads_user_file_hash_unique
ON public.statement_uploads(user_id, file_hash)
WHERE file_hash IS NOT NULL;

COMMIT;
