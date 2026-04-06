-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types (only if they don't exist)
DO $$ BEGIN
    CREATE TYPE currency_type AS ENUM (
      'USD', 'THB', 'EUR', 'GBP', 'SGD', 'VND', 'MYR',
      'BTC', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD', 'SEK', 'NOK', 'CNY'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE transaction_type AS ENUM ('income', 'expense', 'transfer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE duplicate_status AS ENUM ('pending', 'ignored', 'merged');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions table
CREATE TABLE public.transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  vendor_id UUID,
  payment_method_id UUID,
  description TEXT,
  amount DECIMAL(12, 2) NOT NULL, -- Amount in the original currency
  original_currency currency_type NOT NULL, -- Which currency was originally entered
  transaction_type transaction_type NOT NULL,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source_email_transaction_id UUID REFERENCES public.email_transactions(id) ON DELETE SET NULL,
  source_statement_upload_id UUID REFERENCES public.statement_uploads(id) ON DELETE SET NULL,
  source_statement_suggestion_index INTEGER,
  source_statement_match_confidence INTEGER CHECK (
    source_statement_match_confidence IS NULL
    OR (source_statement_match_confidence >= 0 AND source_statement_match_confidence <= 100)
  ),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Source tracking
  source_payment_slip_id UUID REFERENCES public.payment_slip_uploads(id) ON DELETE SET NULL,

  -- Self-transfer metadata
  transfer_from_account TEXT,
  transfer_to_account TEXT,

  -- Constraints
  CONSTRAINT positive_amount CHECK (amount > 0)
);

-- Payment methods table
CREATE TABLE public.payment_methods (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL DEFAULT 'credit_card' CHECK (type IN ('credit_card', 'bank_account', 'debit_card', 'other')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  preferred_currency TEXT REFERENCES public.currency_configuration(currency_code),
  billing_cycle_start_day INTEGER DEFAULT NULL CHECK (billing_cycle_start_day BETWEEN 1 AND 28),
  card_last_four TEXT DEFAULT NULL CHECK (card_last_four IS NULL OR card_last_four ~ '^\d{4}$'),
  is_import_source BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name, user_id)
);

-- Vendors table
CREATE TABLE public.vendors (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name, user_id)
);

-- Tags table
CREATE TABLE public.tags (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#dbeafe',
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name, user_id)
);

-- Transaction tags junction table
CREATE TABLE public.transaction_tags (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(transaction_id, tag_id)
);

-- Currency configuration table (defines supported currencies)
CREATE TABLE public.currency_configuration (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  currency_code TEXT NOT NULL UNIQUE,
  currency_symbol TEXT,
  display_name TEXT NOT NULL,
  decimal_places INTEGER DEFAULT 2,
  is_crypto BOOLEAN DEFAULT FALSE,
  is_tracked BOOLEAN DEFAULT TRUE,
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Exchange rates table (for historical tracking)
CREATE TABLE public.exchange_rates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  from_currency currency_type NOT NULL,
  to_currency currency_type NOT NULL,
  rate DECIMAL(18, 8) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  source TEXT,
  is_interpolated BOOLEAN DEFAULT FALSE,
  interpolated_from_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT positive_rate CHECK (rate > 0),
  CONSTRAINT different_currencies CHECK (from_currency != to_currency),
  UNIQUE(from_currency, to_currency, date)
);

-- Vendor duplicate suggestions table (for tracking potential merges)
CREATE TABLE public.vendor_duplicate_suggestions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  source_vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE NOT NULL,
  target_vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE NOT NULL,
  confidence_score DECIMAL(5, 2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
  status duplicate_status NOT NULL DEFAULT 'pending',
  reasons TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,

  -- Constraints
  CONSTRAINT different_vendors CHECK (source_vendor_id != target_vendor_id),
  CONSTRAINT unique_suggestion UNIQUE(user_id, source_vendor_id, target_vendor_id)
);

-- Create indexes for better performance
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_date ON public.transactions(transaction_date DESC);
CREATE INDEX idx_transactions_vendor_id ON public.transactions(vendor_id);
CREATE INDEX idx_transactions_payment_method_id ON public.transactions(payment_method_id);
CREATE INDEX idx_transactions_user_date_composite ON public.transactions(user_id, transaction_date DESC);
CREATE INDEX idx_transactions_source_email ON public.transactions(source_email_transaction_id)
  WHERE source_email_transaction_id IS NOT NULL;
CREATE INDEX idx_transactions_source_statement ON public.transactions(source_statement_upload_id)
  WHERE source_statement_upload_id IS NOT NULL;
CREATE INDEX idx_transactions_source_payment_slip ON public.transactions(source_payment_slip_id)
  WHERE source_payment_slip_id IS NOT NULL;
CREATE INDEX idx_payment_methods_user_id ON public.payment_methods(user_id);
CREATE INDEX idx_payment_methods_name ON public.payment_methods(name);
CREATE INDEX idx_vendors_user_id ON public.vendors(user_id);
CREATE INDEX idx_vendors_name ON public.vendors(name);
CREATE INDEX idx_exchange_rates_date ON public.exchange_rates(date DESC);
CREATE INDEX idx_exchange_rates_currencies ON public.exchange_rates(from_currency, to_currency);
CREATE INDEX idx_tags_user_id ON public.tags(user_id);
CREATE INDEX idx_tags_name ON public.tags(name);
CREATE INDEX idx_currency_configuration_code ON public.currency_configuration(currency_code);
CREATE INDEX idx_currency_configuration_tracked ON public.currency_configuration(is_tracked);
CREATE INDEX idx_transaction_tags_transaction_id ON public.transaction_tags(transaction_id);
CREATE INDEX idx_transaction_tags_tag_id ON public.transaction_tags(tag_id);
CREATE INDEX idx_vendor_duplicates_user_id ON public.vendor_duplicate_suggestions(user_id);
CREATE INDEX idx_vendor_duplicates_status ON public.vendor_duplicate_suggestions(status);
CREATE INDEX idx_vendor_duplicates_source_vendor ON public.vendor_duplicate_suggestions(source_vendor_id);
CREATE INDEX idx_vendor_duplicates_target_vendor ON public.vendor_duplicate_suggestions(target_vendor_id);
CREATE INDEX idx_vendor_duplicates_confidence ON public.vendor_duplicate_suggestions(confidence_score DESC);

-- Foreign key indexes (for efficient DELETE/UPDATE on parent tables)
CREATE INDEX idx_rate_changes_exchange_rate_id ON public.rate_changes(exchange_rate_id);
CREATE INDEX idx_sync_configuration_last_modified_by ON public.sync_configuration(last_modified_by);
CREATE INDEX idx_sync_history_retry_of ON public.sync_history(retry_of);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.currency_configuration ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_duplicate_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
-- Note: Uses (select auth.uid()) for performance optimization (prevents per-row re-evaluation)
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING ((select auth.uid()) = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING ((select auth.uid()) = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK ((select auth.uid()) = id);

-- RLS Policies for transactions table
CREATE POLICY "Users can view own transactions" ON public.transactions
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own transactions" ON public.transactions
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own transactions" ON public.transactions
  FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own transactions" ON public.transactions
  FOR DELETE USING ((select auth.uid()) = user_id);

-- RLS Policies for payment_methods table
CREATE POLICY "Users can view own payment methods" ON public.payment_methods
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own payment methods" ON public.payment_methods
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own payment methods" ON public.payment_methods
  FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own payment methods" ON public.payment_methods
  FOR DELETE USING ((select auth.uid()) = user_id);

-- RLS Policies for vendors table
CREATE POLICY "Users can view own vendors" ON public.vendors
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own vendors" ON public.vendors
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own vendors" ON public.vendors
  FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own vendors" ON public.vendors
  FOR DELETE USING ((select auth.uid()) = user_id);

-- RLS Policies for currency_configuration table (public read access)
CREATE POLICY "Anyone can view currency configuration" ON public.currency_configuration
  FOR SELECT USING (true);

-- RLS Policies for exchange_rates table
-- Authenticated users can view, admins can insert/update/delete
CREATE POLICY "Authenticated users can view exchange rates" ON public.exchange_rates
  FOR SELECT USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Admins can insert exchange rates" ON public.exchange_rates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE (select auth.uid()) = id
      AND raw_user_meta_data->>'is_admin' = 'true'
    )
  );

CREATE POLICY "Admins can update exchange rates" ON public.exchange_rates
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE (select auth.uid()) = id
      AND raw_user_meta_data->>'is_admin' = 'true'
    )
  );

CREATE POLICY "Admins can delete exchange rates" ON public.exchange_rates
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE (select auth.uid()) = id
      AND raw_user_meta_data->>'is_admin' = 'true'
    )
  );

-- RLS Policies for tags table
CREATE POLICY "Users can view own tags" ON public.tags
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own tags" ON public.tags
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own tags" ON public.tags
  FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own tags" ON public.tags
  FOR DELETE USING ((select auth.uid()) = user_id);

-- RLS Policies for transaction_tags table
CREATE POLICY "Users can view own transaction tags" ON public.transaction_tags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.transactions
      WHERE transactions.id = transaction_tags.transaction_id
      AND transactions.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can insert own transaction tags" ON public.transaction_tags
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.transactions
      WHERE transactions.id = transaction_tags.transaction_id
      AND transactions.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete own transaction tags" ON public.transaction_tags
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.transactions
      WHERE transactions.id = transaction_tags.transaction_id
      AND transactions.user_id = (select auth.uid())
    )
  );

-- RLS Policies for vendor_duplicate_suggestions table
CREATE POLICY "Users can view their own duplicate suggestions"
  ON public.vendor_duplicate_suggestions
  FOR SELECT
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own duplicate suggestions"
  ON public.vendor_duplicate_suggestions
  FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own duplicate suggestions"
  ON public.vendor_duplicate_suggestions
  FOR UPDATE
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own duplicate suggestions"
  ON public.vendor_duplicate_suggestions
  FOR DELETE
  USING ((select auth.uid()) = user_id);

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create triggers for updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON public.tags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_currency_configuration_updated_at BEFORE UPDATE ON public.currency_configuration
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to handle vendor_duplicate_suggestions updates
CREATE OR REPLACE FUNCTION update_vendor_duplicate_suggestions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  IF (NEW.status != OLD.status AND NEW.status IN ('ignored', 'merged')) THEN
    NEW.resolved_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_vendor_duplicate_suggestions_timestamp
BEFORE UPDATE ON public.vendor_duplicate_suggestions
FOR EACH ROW
EXECUTE FUNCTION update_vendor_duplicate_suggestions_updated_at();

-- Function to handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users (id, email, first_name, last_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );

  -- Create default payment methods for new user
  INSERT INTO public.payment_methods (name, user_id) VALUES
    ('Cash', NEW.id),
    ('Credit Card', NEW.id),
    ('Bank Account', NEW.id),
    ('Bank Transfer', NEW.id);

  -- Create default vendors for new user
  INSERT INTO public.vendors (name, user_id) VALUES
    ('McDonalds', NEW.id),
    ('Starbucks', NEW.id),
    ('Amazon', NEW.id),
    ('Target', NEW.id),
    ('Uber', NEW.id),
    ('Netflix', NEW.id),
    ('Spotify', NEW.id),
    ('Shell', NEW.id);

  -- Create default tags for new user based on email
  IF NEW.email = 'dennis@dsil.design' THEN
    -- Custom tags for dennis@dsil.design
    INSERT INTO public.tags (name, color, user_id) VALUES
      ('Reimburseable', '#dbeafe', NEW.id),
      ('Business Expense', '#fef3c7', NEW.id),
      ('Florida Villa', '#dcfce7', NEW.id);
  ELSIF NEW.email LIKE '%demo%' OR NEW.email = 'demo@example.com' THEN
    -- Tags for demo accounts
    INSERT INTO public.tags (name, color, user_id) VALUES
      ('Personal', '#dbeafe', NEW.id),
      ('Work Travel', '#dcfce7', NEW.id),
      ('Client Meeting', '#fef3c7', NEW.id);
  ELSE
    -- Default tags for all other users
    INSERT INTO public.tags (name, color, user_id) VALUES
      ('Personal', '#dbeafe', NEW.id),
      ('Business', '#dcfce7', NEW.id),
      ('Tax Deductible', '#fef3c7', NEW.id),
      ('Recurring', '#ffe2e2', NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to cleanup orphaned vendors (vendors with 0 transactions)
CREATE OR REPLACE FUNCTION cleanup_orphaned_vendors()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  vendor_to_check UUID;
BEGIN
  -- Determine which vendor(s) to check based on operation
  IF TG_OP = 'DELETE' THEN
    -- On DELETE, check the vendor of the deleted transaction
    vendor_to_check := OLD.vendor_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- On UPDATE, check the old vendor if vendor_id changed
    IF OLD.vendor_id IS DISTINCT FROM NEW.vendor_id THEN
      vendor_to_check := OLD.vendor_id;
    END IF;
  END IF;

  -- If we have a vendor to check and it's not NULL
  IF vendor_to_check IS NOT NULL THEN
    -- Check if this vendor has any remaining transactions
    IF NOT EXISTS (
      SELECT 1
      FROM public.transactions
      WHERE vendor_id = vendor_to_check
      LIMIT 1
    ) THEN
      -- No transactions left, delete the vendor
      DELETE FROM public.vendors
      WHERE id = vendor_to_check;
    END IF;
  END IF;

  -- Return appropriate record based on operation
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Trigger to automatically cleanup orphaned vendors
CREATE TRIGGER cleanup_orphaned_vendors_after_transaction_change
AFTER DELETE OR UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION cleanup_orphaned_vendors();

-- Add foreign key constraints after all tables are created
ALTER TABLE public.transactions 
ADD CONSTRAINT transactions_vendor_id_fkey 
FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE SET NULL;

ALTER TABLE public.transactions 
ADD CONSTRAINT transactions_payment_method_id_fkey 
FOREIGN KEY (payment_method_id) REFERENCES public.payment_methods(id) ON DELETE SET NULL;

-- Emails table - stores synced email metadata for iCloud integration
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
  text_body TEXT,                       -- Parsed plain text body (NULL = never fetched, '' = empty/unparseable)
  html_body TEXT,                       -- Parsed HTML body (NULL = never fetched, '' = empty/unparseable)
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, message_id)
);

-- Partial index for backfill: efficiently find emails missing bodies
CREATE INDEX IF NOT EXISTS idx_emails_missing_body
  ON public.emails(user_id, uid)
  WHERE text_body IS NULL AND html_body IS NULL;

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

-- Indexes for emails tables
CREATE INDEX idx_emails_user_date ON public.emails(user_id, date DESC);
CREATE INDEX idx_emails_user_folder ON public.emails(user_id, folder);
CREATE INDEX idx_emails_message_id ON public.emails(message_id);
CREATE INDEX idx_email_sync_state_user_folder ON public.email_sync_state(user_id, folder);

-- Enable RLS for emails tables
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

-- Email groups table - consolidates related emails about the same transaction
CREATE TABLE public.email_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  group_key TEXT NOT NULL,
  vendor_name TEXT,
  amount DECIMAL(12, 2),
  currency TEXT,
  transaction_date DATE,
  email_count INTEGER NOT NULL DEFAULT 1,
  primary_email_transaction_id UUID,  -- FK added after email_transactions table exists
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, group_key)
);

-- Email transactions table - stores parsed email data with match info
-- Links synced emails to extracted transaction data and tracks matching status
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
  payment_card_last_four TEXT DEFAULT NULL CHECK (payment_card_last_four IS NULL OR payment_card_last_four ~ '^\d{4}$'),
  payment_card_type TEXT DEFAULT NULL,  -- Card type from receipt (e.g., 'Visa', 'Mastercard')

  -- Match information
  matched_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  match_confidence INTEGER CHECK (match_confidence IS NULL OR (match_confidence >= 0 AND match_confidence <= 100)),
  match_method TEXT CHECK (match_method IS NULL OR match_method IN ('auto', 'manual', 'cross_source')),
  rejected_transaction_ids UUID[] NOT NULL DEFAULT '{}',
  rejected_pair_keys TEXT[] NOT NULL DEFAULT '{}',
  -- Counterpart composite keys this email has been manually paired with via
  -- the "Attach a source" affordance on the Review Queue.
  manual_pair_keys TEXT[] NOT NULL DEFAULT '{}',

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN (
    'pending_review',        -- Needs user review
    'matched',               -- Linked to existing transaction
    'waiting_for_statement', -- THB receipt waiting for USD charge
    'waiting_for_email',     -- Needs email receipt before processing
    'waiting_for_slip',      -- Needs payment slip before processing
    'ready_to_import',       -- Can create new transaction
    'imported',              -- Transaction created
    'skipped'                -- User marked as non-transaction
  )),

  -- Classification (coarse, backward-compatible)
  classification TEXT CHECK (classification IS NULL OR classification IN (
    'receipt',               -- Payment confirmation
    'order_confirmation',    -- Order placed, payment pending
    'bank_transfer',         -- Direct bank transfer
    'bill_payment',          -- Bill payment notification
    'unknown'                -- Could not classify
  )),

  -- AI classification (granular, 13 types)
  ai_classification TEXT CHECK (ai_classification IS NULL OR ai_classification IN (
    'transaction_receipt',
    'subscription_charge',
    'bank_transfer_confirmation',
    'bill_payment_confirmation',
    'upcoming_charge_notice',
    'invoice_available',
    'refund_notification',
    'delivery_status',
    'order_status',
    'account_notification',
    'marketing_promotional',
    'otp_verification',
    'other_non_transaction'
  )),
  ai_suggested_skip BOOLEAN DEFAULT FALSE,
  ai_reasoning TEXT,
  parser_key TEXT,

  -- Email group reference
  email_group_id UUID REFERENCES public.email_groups(id) ON DELETE SET NULL,
  is_group_primary BOOLEAN DEFAULT TRUE,

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

-- Reset email_transaction status when its link to a transaction is cleared
-- (e.g. transaction deleted or manually unlinked)
CREATE OR REPLACE FUNCTION public.reset_email_transaction_on_unlink()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.matched_transaction_id IS NOT NULL AND NEW.matched_transaction_id IS NULL THEN
    NEW.status := 'pending_review';
    NEW.match_method := NULL;
    NEW.match_confidence := NULL;
    NEW.matched_at := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reset_email_transaction_on_unlink
  BEFORE UPDATE OF matched_transaction_id
  ON public.email_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.reset_email_transaction_on_unlink();

-- Add FK from email_groups back to email_transactions
ALTER TABLE public.email_groups
  ADD CONSTRAINT email_groups_primary_email_fkey
  FOREIGN KEY (primary_email_transaction_id)
  REFERENCES public.email_transactions(id) ON DELETE SET NULL;

-- AI feedback table - stores user corrections for few-shot prompt injection
CREATE TABLE public.ai_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  email_transaction_id UUID REFERENCES public.email_transactions(id) ON DELETE CASCADE,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN (
    'classification_change',
    'skip_override',
    'extraction_correction',
    'undo_skip',
    'skip_reason',
    'proposal_correction',
    'proposal_rejection'
  )),
  original_ai_classification TEXT,
  original_ai_suggested_skip BOOLEAN,
  corrected_classification TEXT,
  corrected_skip BOOLEAN,
  email_subject TEXT,
  email_from TEXT,
  email_body_preview TEXT,  -- First 500 chars
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for email_transactions
CREATE INDEX idx_email_trans_user_status ON public.email_transactions(user_id, status);
CREATE INDEX idx_email_transactions_waiting ON public.email_transactions(user_id, transaction_date)
  WHERE status = 'waiting_for_statement';
CREATE INDEX idx_email_transactions_waiting_slip ON public.email_transactions(user_id, transaction_date)
  WHERE status = 'waiting_for_slip';
CREATE INDEX idx_email_transactions_stats ON public.email_transactions(user_id, status, classification, email_date DESC);
CREATE INDEX idx_email_transactions_email_date ON public.email_transactions(user_id, email_date DESC);
CREATE INDEX idx_email_trans_user_date ON public.email_transactions(user_id, email_date DESC);
CREATE INDEX idx_email_trans_matched ON public.email_transactions(matched_transaction_id)
  WHERE matched_transaction_id IS NOT NULL;
CREATE INDEX idx_email_trans_folder ON public.email_transactions(user_id, folder);
CREATE INDEX idx_email_trans_synced ON public.email_transactions(synced_at DESC);
CREATE INDEX idx_email_trans_pending ON public.email_transactions(user_id, match_confidence DESC)
  WHERE status = 'pending_review';
CREATE INDEX idx_email_trans_search ON public.email_transactions
  USING gin(to_tsvector('english', COALESCE(subject, '') || ' ' || COALESCE(description, '')));
CREATE INDEX idx_email_trans_ai_classification
  ON public.email_transactions(user_id, ai_classification);
CREATE INDEX idx_email_trans_ai_skip
  ON public.email_transactions(user_id, ai_suggested_skip)
  WHERE ai_suggested_skip = TRUE;
CREATE INDEX idx_email_trans_group
  ON public.email_transactions(email_group_id)
  WHERE email_group_id IS NOT NULL;
CREATE INDEX idx_email_trans_parser_key
  ON public.email_transactions(parser_key);

-- Indexes for email_groups
CREATE INDEX idx_email_groups_user_id ON public.email_groups(user_id);
CREATE INDEX idx_email_groups_group_key ON public.email_groups(group_key);
CREATE INDEX idx_email_groups_vendor ON public.email_groups(user_id, vendor_name);

-- Indexes for ai_feedback
CREATE INDEX idx_ai_feedback_user_id ON public.ai_feedback(user_id);
CREATE INDEX idx_ai_feedback_email_tx ON public.ai_feedback(email_transaction_id);
CREATE INDEX idx_ai_feedback_user_recent
  ON public.ai_feedback(user_id, created_at DESC);

-- Enable RLS for email_groups
ALTER TABLE public.email_groups ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_groups table
CREATE POLICY "Users can view own email groups" ON public.email_groups
  FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can insert own email groups" ON public.email_groups
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update own email groups" ON public.email_groups
  FOR UPDATE USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete own email groups" ON public.email_groups
  FOR DELETE USING ((select auth.uid()) = user_id);

-- Trigger for updated_at on email_groups
CREATE TRIGGER update_email_groups_updated_at BEFORE UPDATE ON public.email_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for email_transactions
ALTER TABLE public.email_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_transactions table
CREATE POLICY "Users can view own email transactions" ON public.email_transactions
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own email transactions" ON public.email_transactions
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own email transactions" ON public.email_transactions
  FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own email transactions" ON public.email_transactions
  FOR DELETE USING ((select auth.uid()) = user_id);

-- Trigger for updated_at on email_transactions
CREATE TRIGGER update_email_transactions_updated_at BEFORE UPDATE ON public.email_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for ai_feedback
ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_feedback table
CREATE POLICY "Users can view own AI feedback" ON public.ai_feedback
  FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can insert own AI feedback" ON public.ai_feedback
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete own AI feedback" ON public.ai_feedback
  FOR DELETE USING ((select auth.uid()) = user_id);

-- Statement uploads table - stores metadata for uploaded statement files and processing results
-- Files are stored in Supabase Storage; this table tracks metadata and processing status
CREATE TABLE public.statement_uploads (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User ownership (for RLS)
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,

  -- File metadata
  filename TEXT NOT NULL,              -- Original uploaded filename
  file_path TEXT NOT NULL,             -- Path in Supabase Storage bucket
  file_size INTEGER,                   -- File size in bytes
  file_type TEXT,                      -- MIME type (e.g., 'application/pdf', 'text/csv')
  file_hash TEXT,                      -- SHA256 hash of file contents for duplicate detection

  -- Statement metadata
  payment_method_id UUID REFERENCES public.payment_methods(id) ON DELETE SET NULL,
  statement_period_start DATE,         -- Start of statement period
  statement_period_end DATE,           -- End of statement period

  -- Processing status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',          -- Uploaded, not yet processed
    'processing',       -- Currently being processed (extracting transactions)
    'ready_for_review', -- Processing finished, transactions need user review
    'in_review',        -- User has started reviewing/linking but isn't done
    'done',             -- All transactions linked to database records
    'failed'            -- Processing failed
  )),

  -- Processing results
  transactions_extracted INTEGER DEFAULT 0,  -- Number of transactions found in statement
  transactions_matched INTEGER DEFAULT 0,    -- Number matched to email transactions
  transactions_new INTEGER DEFAULT 0,        -- Number that are new (no email match)

  -- Processing timestamps and logs
  extraction_started_at TIMESTAMPTZ,         -- When processing began
  extraction_completed_at TIMESTAMPTZ,       -- When processing finished
  extraction_error TEXT,                     -- Error message if failed
  extraction_log JSONB,                      -- Detailed processing log

  -- Timestamps
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for statement_uploads
CREATE INDEX idx_statement_uploads_user_id ON public.statement_uploads(user_id);
CREATE INDEX idx_statement_uploads_payment_method ON public.statement_uploads(payment_method_id)
  WHERE payment_method_id IS NOT NULL;
CREATE INDEX idx_statement_uploads_uploaded_at ON public.statement_uploads(uploaded_at DESC);
CREATE INDEX idx_statement_uploads_status ON public.statement_uploads(user_id, status);
CREATE INDEX idx_statement_uploads_user_status_date
  ON public.statement_uploads(user_id, status, uploaded_at DESC);
CREATE INDEX idx_statement_uploads_file_hash ON public.statement_uploads(file_hash)
  WHERE file_hash IS NOT NULL;
-- Unique constraint per user for file hash (same user can't upload same file twice)
CREATE UNIQUE INDEX idx_statement_uploads_user_file_hash_unique
  ON public.statement_uploads(user_id, file_hash)
  WHERE file_hash IS NOT NULL;

-- Enable RLS for statement_uploads
ALTER TABLE public.statement_uploads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for statement_uploads table
CREATE POLICY "Users can view own statement uploads" ON public.statement_uploads
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own statement uploads" ON public.statement_uploads
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own statement uploads" ON public.statement_uploads
  FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own statement uploads" ON public.statement_uploads
  FOR DELETE USING ((select auth.uid()) = user_id);

-- Trigger for updated_at on statement_uploads
CREATE TRIGGER update_statement_uploads_updated_at BEFORE UPDATE ON public.statement_uploads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PAYMENT SLIP UPLOADS
-- ============================================================================

-- Payment slip uploads table - stores metadata and extracted data from Thai bank transfer slips
-- Images are processed via Claude Vision API for structured data extraction
CREATE TABLE public.payment_slip_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,

  -- File metadata
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  file_hash TEXT,

  -- Extracted transaction fields
  transaction_date DATE,
  transaction_time TIME,
  amount DECIMAL(12, 2),
  fee DECIMAL(12, 2) DEFAULT 0,
  currency TEXT DEFAULT 'THB',
  sender_name TEXT,
  sender_bank TEXT,
  sender_account TEXT,
  recipient_name TEXT,
  recipient_bank TEXT,
  recipient_account TEXT,
  transaction_reference TEXT,
  bank_reference TEXT,
  memo TEXT,
  bank_detected TEXT,
  transfer_type TEXT,
  detected_direction TEXT CHECK (detected_direction IS NULL OR detected_direction IN ('expense', 'income')),
  payment_method_id UUID REFERENCES public.payment_methods(id) ON DELETE SET NULL,

  -- Full extraction data from Claude Vision
  extraction_data JSONB,

  -- Processing status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'processing',
    'ready_for_review',
    'done',
    'failed'
  )),

  -- Processing metadata
  extraction_started_at TIMESTAMPTZ,
  extraction_completed_at TIMESTAMPTZ,
  extraction_error TEXT,
  extraction_log JSONB,
  extraction_confidence INTEGER CHECK (
    extraction_confidence IS NULL OR (extraction_confidence >= 0 AND extraction_confidence <= 100)
  ),
  ai_prompt_tokens INTEGER,
  ai_response_tokens INTEGER,
  ai_duration_ms INTEGER,

  -- Matched transaction
  matched_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  match_confidence INTEGER CHECK (
    match_confidence IS NULL OR (match_confidence >= 0 AND match_confidence <= 100)
  ),

  -- Rejected match tracking (parity with email_transactions)
  rejected_transaction_ids UUID[] NOT NULL DEFAULT '{}',
  rejected_pair_keys TEXT[] NOT NULL DEFAULT '{}',
  -- Counterpart composite keys this slip has been manually paired with via
  -- the "Attach a source" affordance on the Review Queue.
  manual_pair_keys TEXT[] NOT NULL DEFAULT '{}',

  -- Review status (for queue)
  review_status TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected')),

  -- Timestamps
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_slip_uploads_user_id ON public.payment_slip_uploads(user_id);
CREATE INDEX idx_payment_slip_uploads_status ON public.payment_slip_uploads(user_id, status);
CREATE INDEX idx_payment_slip_uploads_review ON public.payment_slip_uploads(user_id, review_status)
  WHERE review_status = 'pending';
CREATE INDEX idx_payment_slip_uploads_uploaded_at ON public.payment_slip_uploads(uploaded_at DESC);
CREATE INDEX idx_payment_slip_uploads_file_hash ON public.payment_slip_uploads(file_hash)
  WHERE file_hash IS NOT NULL;
CREATE UNIQUE INDEX idx_payment_slip_uploads_user_file_hash_unique
  ON public.payment_slip_uploads(user_id, file_hash)
  WHERE file_hash IS NOT NULL;
CREATE INDEX idx_payment_slip_uploads_transaction_ref ON public.payment_slip_uploads(transaction_reference)
  WHERE transaction_reference IS NOT NULL;

ALTER TABLE public.payment_slip_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payment slip uploads" ON public.payment_slip_uploads
  FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can insert own payment slip uploads" ON public.payment_slip_uploads
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update own payment slip uploads" ON public.payment_slip_uploads
  FOR UPDATE USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete own payment slip uploads" ON public.payment_slip_uploads
  FOR DELETE USING ((select auth.uid()) = user_id);

CREATE TRIGGER update_payment_slip_uploads_updated_at BEFORE UPDATE ON public.payment_slip_uploads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Reset payment slip state when its link to a transaction is cleared
-- (e.g. transaction deleted or manually unlinked)
CREATE OR REPLACE FUNCTION public.reset_payment_slip_on_unlink()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.matched_transaction_id IS NOT NULL AND NEW.matched_transaction_id IS NULL THEN
    NEW.review_status := 'pending';
    NEW.status := 'ready_for_review';
    NEW.match_confidence := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reset_payment_slip_on_unlink
  BEFORE UPDATE OF matched_transaction_id
  ON public.payment_slip_uploads
  FOR EACH ROW
  EXECUTE FUNCTION public.reset_payment_slip_on_unlink();

-- ============================================================================
-- USER BANK ACCOUNTS
-- ============================================================================

-- Stores user's known bank accounts for auto-detecting payment direction (income vs expense)
CREATE TABLE public.user_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  bank_name TEXT NOT NULL,
  account_identifier TEXT NOT NULL,
  account_holder_name TEXT,
  payment_method_id UUID REFERENCES public.payment_methods(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_bank_accounts_user ON public.user_bank_accounts(user_id);
CREATE UNIQUE INDEX idx_user_bank_accounts_unique
  ON public.user_bank_accounts(user_id, bank_name, account_identifier);
CREATE INDEX idx_user_bank_accounts_payment_method ON public.user_bank_accounts(payment_method_id)
  WHERE payment_method_id IS NOT NULL;

ALTER TABLE public.user_bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bank accounts" ON public.user_bank_accounts
  FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can insert own bank accounts" ON public.user_bank_accounts
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update own bank accounts" ON public.user_bank_accounts
  FOR UPDATE USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete own bank accounts" ON public.user_bank_accounts
  FOR DELETE USING ((select auth.uid()) = user_id);

CREATE TRIGGER update_user_bank_accounts_updated_at BEFORE UPDATE ON public.user_bank_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Import activities table - provides an audit trail of all import actions
-- Tracks email syncs, statement uploads, matches, imports, and user actions
CREATE TABLE public.import_activities (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User ownership (for RLS)
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,

  -- Activity type
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'email_sync',           -- Automatic or manual email sync
    'email_extracted',      -- Transaction data extracted from email
    'statement_uploaded',   -- Statement file uploaded
    'statement_processed',  -- Statement parsing completed
    'transaction_matched',  -- Email matched to existing transaction
    'transaction_imported', -- New transaction created from email
    'transaction_skipped',  -- User marked email as non-transaction
    'batch_import',         -- Multiple transactions imported at once
    'sync_error',           -- Error during sync process
    'extraction_error',     -- Error during data extraction
    'slip_uploaded',        -- Payment slip image uploaded
    'slip_processed',       -- Payment slip extraction completed
    'slip_corrected'        -- User manually corrected extracted slip data
  )),

  -- Optional reference to related statement upload
  statement_upload_id UUID REFERENCES public.statement_uploads(id) ON DELETE SET NULL,

  -- Optional reference to related email transaction
  email_transaction_id UUID REFERENCES public.email_transactions(id) ON DELETE SET NULL,

  -- Optional reference to related payment slip upload
  payment_slip_upload_id UUID REFERENCES public.payment_slip_uploads(id) ON DELETE SET NULL,

  -- Activity description
  description TEXT NOT NULL,

  -- Summary statistics (for batch operations)
  transactions_affected INTEGER DEFAULT 0,
  total_amount DECIMAL(12, 2),
  currency TEXT,

  -- Flexible metadata for additional context
  metadata JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for import_activities
CREATE INDEX idx_import_activities_user_id ON public.import_activities(user_id);
CREATE INDEX idx_import_activities_type ON public.import_activities(user_id, activity_type);
CREATE INDEX idx_import_activities_created_at ON public.import_activities(created_at DESC);
CREATE INDEX idx_import_activities_user_created
  ON public.import_activities(user_id, created_at DESC);
CREATE INDEX idx_import_activities_errors ON public.import_activities(user_id, created_at DESC)
  WHERE activity_type IN ('sync_error', 'extraction_error');

-- Enable RLS for import_activities
ALTER TABLE public.import_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for import_activities table
CREATE POLICY "Users can view own import activities" ON public.import_activities
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own import activities" ON public.import_activities
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own import activities" ON public.import_activities
  FOR DELETE USING ((select auth.uid()) = user_id);

-- ============================================================================
-- AI JOURNAL SYSTEM
-- ============================================================================

-- AI Journal: Logs every AI invocation with input context, output, timing, and outcome
CREATE TABLE public.ai_journal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  invocation_type TEXT NOT NULL,  -- classification_only | combined_extraction | fallback_extraction | reprocess
  email_id UUID,
  email_transaction_id UUID,
  from_address TEXT,
  from_name TEXT,
  subject TEXT,
  email_date TIMESTAMPTZ,
  body_length INTEGER,
  regex_parser_attempted TEXT,
  regex_extraction_success BOOLEAN,
  ai_classification TEXT,
  ai_suggested_skip BOOLEAN,
  ai_reasoning TEXT,
  ai_extracted_vendor TEXT,
  ai_extracted_amount DECIMAL(12,2),
  ai_extracted_currency TEXT,
  ai_extracted_date DATE,
  ai_confidence INTEGER,
  final_parser_key TEXT,
  final_confidence INTEGER,
  final_status TEXT,
  duration_ms INTEGER,
  prompt_tokens INTEGER,
  response_tokens INTEGER,
  feedback_examples_used INTEGER DEFAULT 0,
  feedback_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_journal_user_created ON public.ai_journal (user_id, created_at DESC);
CREATE INDEX idx_ai_journal_user_sender ON public.ai_journal (user_id, from_address);
CREATE INDEX idx_ai_journal_user_parser ON public.ai_journal (user_id, final_parser_key);

ALTER TABLE public.ai_journal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own journal entries"
  ON public.ai_journal FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert journal entries"
  ON public.ai_journal FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update journal entries"
  ON public.ai_journal FOR UPDATE
  USING (true);

-- AI Analysis Runs: Tracks each analysis execution with scope, results, and timing
CREATE TABLE public.ai_analysis_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  run_type TEXT NOT NULL,  -- batch | manual
  status TEXT NOT NULL DEFAULT 'running',
  journal_entries_analyzed INTEGER DEFAULT 0,
  journal_from TIMESTAMPTZ,
  journal_to TIMESTAMPTZ,
  previous_run_id UUID,
  summary JSONB,
  patterns JSONB,
  recommendations JSONB,
  duration_ms INTEGER,
  ai_calls_made INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_analysis_runs_user ON public.ai_analysis_runs (user_id, created_at DESC);

ALTER TABLE public.ai_analysis_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own analysis runs"
  ON public.ai_analysis_runs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert analysis runs"
  ON public.ai_analysis_runs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update analysis runs"
  ON public.ai_analysis_runs FOR UPDATE
  USING (true);

-- AI Insights: Individual actionable recommendations with lifecycle tracking
CREATE TABLE public.ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  analysis_run_id UUID REFERENCES public.ai_analysis_runs(id) ON DELETE CASCADE NOT NULL,
  insight_type TEXT NOT NULL,  -- regex_parser_candidate | classification_correction | vendor_normalization | skip_pattern | cost_savings | general
  severity TEXT NOT NULL DEFAULT 'info',  -- info | suggestion | action_needed
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  evidence JSONB,
  target_sender TEXT,
  email_count INTEGER,
  format_consistency_pct DECIMAL(5,2),
  status TEXT NOT NULL DEFAULT 'active',  -- active | dismissed | implemented | archived
  dismissed_at TIMESTAMPTZ,
  implemented_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_insights_user_status ON public.ai_insights (user_id, status);
CREATE INDEX idx_ai_insights_run ON public.ai_insights (analysis_run_id);

ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own insights"
  ON public.ai_insights FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert insights"
  ON public.ai_insights FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own insights"
  ON public.ai_insights FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can update insights"
  ON public.ai_insights FOR UPDATE
  USING (true);

-- ============================================================================
-- TRANSACTION PROPOSALS
-- ============================================================================

-- Smart Transaction Proposals: AI-generated pre-filled transaction data for import queue items
CREATE TABLE public.transaction_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Source reference
  source_type TEXT NOT NULL CHECK (source_type IN ('statement', 'email', 'merged', 'payment_slip')),
  composite_id TEXT NOT NULL,
  statement_upload_id UUID REFERENCES public.statement_uploads(id) ON DELETE CASCADE,
  suggestion_index INTEGER,
  email_transaction_id UUID REFERENCES public.email_transactions(id) ON DELETE CASCADE,
  payment_slip_upload_id UUID REFERENCES public.payment_slip_uploads(id) ON DELETE CASCADE,

  -- Proposed transaction fields
  proposed_description TEXT,
  proposed_amount DECIMAL(12,2),
  proposed_currency currency_type,
  proposed_transaction_type transaction_type,
  proposed_date DATE,
  proposed_vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  proposed_vendor_name_suggestion TEXT,
  proposed_payment_method_id UUID REFERENCES public.payment_methods(id) ON DELETE SET NULL,
  proposed_tag_ids UUID[] DEFAULT '{}',

  -- Per-field confidence and reasoning
  field_confidence JSONB NOT NULL DEFAULT '{}',
  overall_confidence INTEGER NOT NULL DEFAULT 0,

  -- Engine metadata
  engine TEXT NOT NULL CHECK (engine IN ('rule_based', 'llm', 'hybrid')),
  llm_model TEXT,
  llm_prompt_tokens INTEGER,
  llm_response_tokens INTEGER,
  generation_duration_ms INTEGER,

  -- Status lifecycle
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'modified', 'rejected', 'stale')),
  accepted_at TIMESTAMPTZ,
  created_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,

  -- Learning: what the user changed
  user_modifications JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT proposal_source_check CHECK (
    (statement_upload_id IS NOT NULL AND suggestion_index IS NOT NULL)
    OR email_transaction_id IS NOT NULL
    OR payment_slip_upload_id IS NOT NULL
  ),
  UNIQUE(composite_id, user_id)
);

CREATE INDEX idx_proposals_user_status ON transaction_proposals(user_id, status);
CREATE INDEX idx_proposals_composite ON transaction_proposals(composite_id);
CREATE INDEX idx_proposals_statement ON transaction_proposals(statement_upload_id, suggestion_index)
  WHERE statement_upload_id IS NOT NULL;
CREATE INDEX idx_proposals_email ON transaction_proposals(email_transaction_id)
  WHERE email_transaction_id IS NOT NULL;
CREATE INDEX idx_proposals_payment_slip ON transaction_proposals(payment_slip_upload_id)
  WHERE payment_slip_upload_id IS NOT NULL;

ALTER TABLE public.transaction_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own proposals"
  ON public.transaction_proposals FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own proposals"
  ON public.transaction_proposals FOR UPDATE
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Service role full access on proposals"
  ON public.transaction_proposals FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE TRIGGER update_transaction_proposals_updated_at
  BEFORE UPDATE ON public.transaction_proposals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample exchange rates
INSERT INTO public.exchange_rates (from_currency, to_currency, rate, date) VALUES
  ('USD', 'THB', 35.50, CURRENT_DATE),
  ('THB', 'USD', 0.02816901, CURRENT_DATE)
ON CONFLICT (from_currency, to_currency, date) DO NOTHING;

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================

-- Storage bucket: statement-uploads (private)
-- Stores uploaded statement files (PDF, PNG, JPG, JPEG, HEIC)
-- Files are stored at path: {user_id}/{upload_id}.{ext}
-- Files are kept forever (no automatic expiration)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'statement-uploads',
  'statement-uploads',
  false,  -- Private bucket: requires authentication for all access
  10485760,  -- 10MB file size limit
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for statement-uploads bucket
CREATE POLICY "Users can upload own statement files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'statement-uploads'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view own statement files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'statement-uploads'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own statement files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'statement-uploads'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own statement files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'statement-uploads'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- STORAGE HELPER FUNCTIONS
-- ============================================================================

-- Function to generate storage path for a statement upload
CREATE OR REPLACE FUNCTION public.get_statement_upload_path(
  p_user_id UUID,
  p_upload_id UUID,
  p_file_extension TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN p_user_id::text || '/' || p_upload_id::text || '.' || LOWER(p_file_extension);
END;
$$;

COMMENT ON FUNCTION public.get_statement_upload_path IS
  'Generates the storage path for a statement upload file: {user_id}/{upload_id}.{ext}';

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Unified view joining emails with email_transactions
-- Shows all emails with their extraction status (if any)
-- security_invoker = true ensures RLS policies on underlying tables are respected
CREATE OR REPLACE VIEW public.email_hub_unified
WITH (security_invoker = true) AS
SELECT
  e.id,
  e.user_id,
  e.message_id,
  e.uid,
  e.folder,
  e.subject,
  e.from_address,
  e.from_name,
  e.date AS email_date,
  e.seen,
  e.has_attachments,
  e.synced_at,
  e.created_at,
  et.id AS email_transaction_id,
  et.vendor_id,
  et.vendor_name_raw,
  et.amount,
  et.currency,
  et.transaction_date,
  et.description,
  et.order_id,
  et.payment_card_last_four,
  et.payment_card_type,
  et.matched_transaction_id,
  et.match_confidence,
  et.match_method,
  COALESCE(et.status, 'unprocessed') AS status,
  et.classification,
  et.extraction_confidence,
  et.extraction_notes,
  et.processed_at,
  et.matched_at,
  et.updated_at,
  (et.id IS NOT NULL) AS is_processed,
  COALESCE(et.transaction_date, e.date::date) AS effective_date,
  -- AI classification columns
  et.ai_classification,
  et.ai_suggested_skip,
  et.ai_reasoning,
  et.parser_key,
  et.email_group_id,
  et.is_group_primary,
  eg.email_count AS group_email_count
FROM public.emails e
LEFT JOIN public.email_transactions et
  ON e.message_id = et.message_id
  AND e.user_id = et.user_id
LEFT JOIN public.email_groups eg
  ON et.email_group_id = eg.id;

-- ============================================================================
-- VENDOR RECIPIENT MAPPINGS
-- Learns associations between bank transfer recipient names and Joot vendors
-- ============================================================================

CREATE TABLE IF NOT EXISTS vendor_recipient_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_name_normalized TEXT NOT NULL,
  recipient_name_raw TEXT NOT NULL,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  parser_key TEXT NOT NULL,
  match_count INTEGER NOT NULL DEFAULT 1,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, recipient_name_normalized, parser_key)
);

CREATE INDEX idx_vendor_recipient_mappings_user_lookup
  ON vendor_recipient_mappings (user_id, parser_key);

ALTER TABLE vendor_recipient_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own vendor-recipient mappings"
  ON vendor_recipient_mappings
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- USER DECISION LOG
-- Records every user action from the review queue for learning
-- ============================================================================

CREATE TABLE public.user_decision_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  decision_type TEXT NOT NULL CHECK (decision_type IN (
    'approve_match', 'approve_create', 'reject', 'link'
  )),
  source_type TEXT NOT NULL CHECK (source_type IN (
    'statement', 'email', 'payment_slip',
    'merged', 'merged_slip_email', 'merged_slip_stmt', 'self_transfer'
  )),
  composite_id TEXT NOT NULL,

  statement_upload_id UUID REFERENCES public.statement_uploads(id) ON DELETE SET NULL,
  suggestion_index INTEGER,
  email_transaction_id UUID REFERENCES public.email_transactions(id) ON DELETE SET NULL,
  payment_slip_id UUID REFERENCES public.payment_slip_uploads(id) ON DELETE SET NULL,

  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  payment_method_id UUID REFERENCES public.payment_methods(id) ON DELETE SET NULL,
  tag_ids UUID[] DEFAULT '{}',

  statement_description TEXT,
  email_from_address TEXT,
  email_vendor_name_raw TEXT,
  email_parser_key TEXT,
  slip_counterparty_name TEXT,
  amount DECIMAL(12, 2),
  currency TEXT,

  match_confidence INTEGER CHECK (match_confidence IS NULL OR (match_confidence >= 0 AND match_confidence <= 100)),
  was_auto_matched BOOLEAN DEFAULT false,
  rejected_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_decision_log_user_created
  ON public.user_decision_log (user_id, created_at DESC);
CREATE INDEX idx_user_decision_log_user_source
  ON public.user_decision_log (user_id, source_type);
CREATE INDEX idx_user_decision_log_user_vendor
  ON public.user_decision_log (user_id, vendor_id) WHERE vendor_id IS NOT NULL;
CREATE INDEX idx_user_decision_log_user_stmt_desc
  ON public.user_decision_log (user_id, statement_description) WHERE statement_description IS NOT NULL;

ALTER TABLE public.user_decision_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own decision log"
  ON public.user_decision_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own decision log"
  ON public.user_decision_log FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role full access on decision log"
  ON public.user_decision_log FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- STATEMENT DESCRIPTION MAPPINGS
-- Learns associations between statement descriptions and Joot vendors
-- ============================================================================

CREATE TABLE public.statement_description_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  description_normalized TEXT NOT NULL,
  description_raw TEXT NOT NULL,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  payment_method_id UUID REFERENCES public.payment_methods(id) ON DELETE SET NULL,

  match_count INTEGER NOT NULL DEFAULT 1,
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE (user_id, description_normalized, payment_method_id)
);

CREATE INDEX idx_stmt_desc_mappings_user
  ON public.statement_description_mappings (user_id);
CREATE INDEX idx_stmt_desc_mappings_vendor
  ON public.statement_description_mappings (user_id, vendor_id);

ALTER TABLE public.statement_description_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own statement description mappings"
  ON public.statement_description_mappings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own statement description mappings"
  ON public.statement_description_mappings FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Service role full access on statement description mappings"
  ON public.statement_description_mappings FOR ALL USING (auth.role() = 'service_role');
