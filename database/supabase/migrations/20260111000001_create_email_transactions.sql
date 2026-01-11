-- Migration: create_email_transactions
-- Created: 2026-01-11
-- Description: Create email_transactions table for storing parsed email data with match info
-- Task: P1-001

BEGIN;

-- Email transactions table - stores parsed email data with match info
-- This table links synced emails to extracted transaction data and tracks matching status
CREATE TABLE public.email_transactions (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User ownership (for RLS)
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,

  -- Email metadata (from IMAP sync)
  message_id TEXT NOT NULL,
  uid INTEGER NOT NULL,
  folder TEXT NOT NULL DEFAULT 'Transactions',
  subject TEXT,
  from_address TEXT,
  from_name TEXT,
  email_date TIMESTAMPTZ,
  seen BOOLEAN DEFAULT FALSE,
  has_attachments BOOLEAN DEFAULT FALSE,

  -- Extracted transaction data
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  vendor_name_raw TEXT,  -- Original vendor text from email before normalization
  amount DECIMAL(12, 2),
  currency TEXT,  -- 'USD', 'THB', etc.
  transaction_date DATE,
  description TEXT,
  order_id TEXT,  -- Order/transaction ID extracted from email

  -- Match information
  matched_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  match_confidence INTEGER CHECK (match_confidence IS NULL OR (match_confidence >= 0 AND match_confidence <= 100)),
  match_method TEXT CHECK (match_method IS NULL OR match_method IN ('auto', 'manual')),

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN (
    'pending_review',        -- Needs user review
    'matched',               -- Linked to existing transaction
    'waiting_for_statement', -- THB receipt waiting for USD charge
    'ready_to_import',       -- Can create new transaction
    'imported',              -- Transaction created
    'skipped'                -- User marked as non-transaction
  )),

  -- Classification
  classification TEXT CHECK (classification IS NULL OR classification IN (
    'receipt',               -- Payment confirmation
    'order_confirmation',    -- Order placed, payment pending
    'bank_transfer',         -- Direct bank transfer
    'bill_payment',          -- Bill payment notification
    'unknown'                -- Could not classify
  )),

  -- Extraction metadata
  extraction_confidence INTEGER CHECK (extraction_confidence IS NULL OR (extraction_confidence >= 0 AND extraction_confidence <= 100)),
  extraction_notes TEXT,

  -- Timestamps
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  matched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint for deduplication
  UNIQUE(user_id, message_id)
);

-- Indexes for common queries
-- Primary index for listing user's email transactions by status
CREATE INDEX idx_email_trans_user_status ON public.email_transactions(user_id, status);

-- Index for date-based sorting and filtering
CREATE INDEX idx_email_trans_user_date ON public.email_transactions(user_id, email_date DESC);

-- Partial index for finding matched transactions
CREATE INDEX idx_email_trans_matched ON public.email_transactions(matched_transaction_id)
  WHERE matched_transaction_id IS NOT NULL;

-- Index for folder-based filtering
CREATE INDEX idx_email_trans_folder ON public.email_transactions(user_id, folder);

-- Index for sync timestamp queries
CREATE INDEX idx_email_trans_synced ON public.email_transactions(synced_at DESC);

-- Partial index for pending review items (sorted by confidence)
CREATE INDEX idx_email_trans_pending ON public.email_transactions(user_id, match_confidence DESC)
  WHERE status = 'pending_review';

-- Full-text search on subject and description
CREATE INDEX idx_email_trans_search ON public.email_transactions
  USING gin(to_tsvector('english', COALESCE(subject, '') || ' ' || COALESCE(description, '')));

-- Enable Row Level Security
ALTER TABLE public.email_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only view their own email transactions
CREATE POLICY "Users can view own email transactions" ON public.email_transactions
  FOR SELECT USING ((select auth.uid()) = user_id);

-- Users can insert their own email transactions
CREATE POLICY "Users can insert own email transactions" ON public.email_transactions
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- Users can update their own email transactions
CREATE POLICY "Users can update own email transactions" ON public.email_transactions
  FOR UPDATE USING ((select auth.uid()) = user_id);

-- Users can delete their own email transactions
CREATE POLICY "Users can delete own email transactions" ON public.email_transactions
  FOR DELETE USING ((select auth.uid()) = user_id);

-- Trigger for automatic updated_at timestamp
CREATE TRIGGER update_email_transactions_updated_at
  BEFORE UPDATE ON public.email_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;
