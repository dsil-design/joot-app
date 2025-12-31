-- Migration: add_email_tables
-- Created: 2025-12-31 12:57:16
-- Description: Add email tables for iCloud email integration

BEGIN;

-- Emails table - stores synced email metadata
CREATE TABLE public.emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  message_id TEXT NOT NULL,           -- IMAP message ID (for deduplication)
  uid INTEGER NOT NULL,               -- IMAP UID (for fetching)
  folder TEXT NOT NULL,               -- Source folder name
  subject TEXT,
  from_address TEXT,
  from_name TEXT,
  date TIMESTAMPTZ,
  seen BOOLEAN DEFAULT FALSE,
  has_attachments BOOLEAN DEFAULT FALSE,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, message_id)
);

-- Email sync state table - tracks sync progress per folder
CREATE TABLE public.email_sync_state (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  folder TEXT NOT NULL,
  last_uid INTEGER DEFAULT 0,         -- Highest UID synced
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, folder)
);

-- Create indexes for efficient queries
CREATE INDEX idx_emails_user_date ON public.emails(user_id, date DESC);
CREATE INDEX idx_emails_user_folder ON public.emails(user_id, folder);
CREATE INDEX idx_emails_message_id ON public.emails(message_id);
CREATE INDEX idx_email_sync_state_user_folder ON public.email_sync_state(user_id, folder);

-- Enable Row Level Security (RLS)
ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_sync_state ENABLE ROW LEVEL SECURITY;

-- RLS Policies for emails table
CREATE POLICY "Users can view own emails" ON public.emails
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own emails" ON public.emails
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own emails" ON public.emails
  FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own emails" ON public.emails
  FOR DELETE USING ((select auth.uid()) = user_id);

-- RLS Policies for email_sync_state table
CREATE POLICY "Users can view own email sync state" ON public.email_sync_state
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own email sync state" ON public.email_sync_state
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own email sync state" ON public.email_sync_state
  FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own email sync state" ON public.email_sync_state
  FOR DELETE USING ((select auth.uid()) = user_id);

-- Trigger for updated_at on email_sync_state
CREATE TRIGGER update_email_sync_state_updated_at BEFORE UPDATE ON public.email_sync_state
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;
