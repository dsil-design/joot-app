-- Add AI extraction fields to email_messages table
-- Migration: 20251107000000_add_email_extraction_fields.sql

-- Add extraction columns
ALTER TABLE email_messages
ADD COLUMN IF NOT EXISTS extracted_vendor TEXT,
ADD COLUMN IF NOT EXISTS extracted_amount DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS extracted_currency VARCHAR(3),
ADD COLUMN IF NOT EXISTS extracted_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS extraction_confidence JSONB,
ADD COLUMN IF NOT EXISTS extraction_status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS extraction_error TEXT,
ADD COLUMN IF NOT EXISTS extracted_at TIMESTAMPTZ;

-- Add index for extraction status
CREATE INDEX IF NOT EXISTS idx_email_messages_extraction_status ON email_messages(extraction_status);

-- Add index for extracted date
CREATE INDEX IF NOT EXISTS idx_email_messages_extracted_date ON email_messages(extracted_date);

-- Add check constraint for extraction_status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_extraction_status'
  ) THEN
    ALTER TABLE email_messages
    ADD CONSTRAINT check_extraction_status
    CHECK (extraction_status IN ('pending', 'processing', 'completed', 'failed', 'skipped'));
  END IF;
END $$;

-- Add comments
COMMENT ON COLUMN email_messages.extracted_vendor IS 'Vendor name extracted by AI from email content';
COMMENT ON COLUMN email_messages.extracted_amount IS 'Transaction amount extracted by AI';
COMMENT ON COLUMN email_messages.extracted_currency IS 'Currency code (ISO 4217) extracted by AI';
COMMENT ON COLUMN email_messages.extracted_date IS 'Transaction date extracted by AI';
COMMENT ON COLUMN email_messages.extraction_confidence IS 'Confidence scores for each extracted field (vendor, amount, currency, date)';
COMMENT ON COLUMN email_messages.extraction_status IS 'Status of AI extraction: pending, processing, completed, failed, skipped';
COMMENT ON COLUMN email_messages.extraction_error IS 'Error message if extraction failed';
COMMENT ON COLUMN email_messages.extracted_at IS 'Timestamp when extraction was completed';
