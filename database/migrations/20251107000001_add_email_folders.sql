-- Add folder selection support to email_accounts table
-- Migration: 20251107000001_add_email_folders.sql

-- Add columns for folder management
ALTER TABLE email_accounts
ADD COLUMN IF NOT EXISTS monitored_folders TEXT[] DEFAULT ARRAY['INBOX']::TEXT[],
ADD COLUMN IF NOT EXISTS folder_config JSONB DEFAULT '{}'::JSONB;

-- Add comment
COMMENT ON COLUMN email_accounts.monitored_folders IS 'Array of folder names to monitor for receipts (e.g., ["INBOX", "Receipts", "Purchases"])';
COMMENT ON COLUMN email_accounts.folder_config IS 'Additional folder configuration (sync frequency, filters, etc.)';

-- Update existing accounts to use INBOX as default
UPDATE email_accounts
SET monitored_folders = ARRAY['INBOX']::TEXT[]
WHERE monitored_folders IS NULL;

-- Verify
SELECT
  id,
  email,
  monitored_folders,
  folder_config
FROM email_accounts
LIMIT 5;
