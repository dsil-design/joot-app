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
    CREATE TYPE transaction_type AS ENUM ('income', 'expense');
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT positive_amount CHECK (amount > 0)
);

-- Payment methods table
CREATE TABLE public.payment_methods (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
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
  rate DECIMAL(10, 4) NOT NULL,
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

-- Insert some sample exchange rates
INSERT INTO public.exchange_rates (from_currency, to_currency, rate, date) VALUES
  ('USD', 'THB', 35.50, CURRENT_DATE),
  ('THB', 'USD', 0.0282, CURRENT_DATE)
ON CONFLICT (from_currency, to_currency, date) DO NOTHING;
