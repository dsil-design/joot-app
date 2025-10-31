-- ============================================================================
-- Debug: Create just the documents table to find the issue
-- ============================================================================

-- First, let's check if the table already exists
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'documents'
ORDER BY ordinal_position;

-- Try creating just the documents table
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_url TEXT,
  thumbnail_path TEXT,
  processing_status TEXT NOT NULL DEFAULT 'pending',
  processing_error TEXT,
  ocr_confidence DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

SELECT 'Documents table created or already exists' AS status;
