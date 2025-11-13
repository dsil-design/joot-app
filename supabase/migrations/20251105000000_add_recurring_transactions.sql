-- Migration: Recurring Transactions and Month Template System
-- Created: 2025-11-05
-- Description: Adds support for transaction templates, expected transactions,
--              month planning, and automatic transaction matching/reconciliation

-- ============================================================================
-- 1. TRANSACTION TEMPLATES TABLE
-- ============================================================================
-- Stores recurring transaction patterns

CREATE TABLE IF NOT EXISTS public.transaction_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,

  -- Template identification
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,

  -- Transaction details
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  payment_method_id UUID REFERENCES public.payment_methods(id) ON DELETE SET NULL,
  amount DECIMAL(12, 2) NOT NULL,
  original_currency currency_type NOT NULL,
  transaction_type transaction_type NOT NULL,

  -- Recurrence pattern
  frequency TEXT NOT NULL,
  frequency_interval INTEGER DEFAULT 1,
  day_of_month INTEGER,
  day_of_week INTEGER,

  -- Schedule boundaries
  start_date DATE NOT NULL,
  end_date DATE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT positive_amount CHECK (amount > 0),
  CONSTRAINT valid_day_of_month CHECK (day_of_month IS NULL OR (day_of_month >= 1 AND day_of_month <= 31)),
  CONSTRAINT valid_day_of_week CHECK (day_of_week IS NULL OR (day_of_week >= 0 AND day_of_week <= 6)),
  CONSTRAINT valid_frequency CHECK (frequency IN ('monthly', 'bi-weekly', 'weekly', 'quarterly', 'annually', 'custom'))
);

-- Indexes for transaction_templates
CREATE INDEX IF NOT EXISTS idx_templates_user_id ON public.transaction_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_active ON public.transaction_templates(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_templates_frequency ON public.transaction_templates(frequency);
CREATE INDEX IF NOT EXISTS idx_templates_dates ON public.transaction_templates(start_date, end_date);

-- RLS Policies for transaction_templates
ALTER TABLE public.transaction_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view own templates" ON public.transaction_templates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert own templates" ON public.transaction_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own templates" ON public.transaction_templates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete own templates" ON public.transaction_templates
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON public.transaction_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. TEMPLATE TAGS JUNCTION TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.template_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES public.transaction_templates(id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(template_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_template_tags_template_id ON public.template_tags(template_id);
CREATE INDEX IF NOT EXISTS idx_template_tags_tag_id ON public.template_tags(tag_id);

ALTER TABLE public.template_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view template tags" ON public.template_tags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.transaction_templates
      WHERE transaction_templates.id = template_tags.template_id
      AND transaction_templates.user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "Users can insert template tags" ON public.template_tags
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.transaction_templates
      WHERE transaction_templates.id = template_tags.template_id
      AND transaction_templates.user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "Users can delete template tags" ON public.template_tags
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.transaction_templates
      WHERE transaction_templates.id = template_tags.template_id
      AND transaction_templates.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 3. MONTH PLANS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.month_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,

  -- Month identification
  month_year DATE NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'draft',

  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  closed_at TIMESTAMP WITH TIME ZONE,

  UNIQUE(user_id, month_year),
  CONSTRAINT valid_status CHECK (status IN ('draft', 'active', 'closed', 'archived'))
);

CREATE INDEX IF NOT EXISTS idx_month_plans_user_id ON public.month_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_month_plans_month_year ON public.month_plans(month_year DESC);
CREATE INDEX IF NOT EXISTS idx_month_plans_status ON public.month_plans(status);
CREATE INDEX IF NOT EXISTS idx_month_plans_user_month ON public.month_plans(user_id, month_year DESC);

ALTER TABLE public.month_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view own month plans" ON public.month_plans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert own month plans" ON public.month_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own month plans" ON public.month_plans
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete own month plans" ON public.month_plans
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_month_plans_updated_at BEFORE UPDATE ON public.month_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4. EXPECTED TRANSACTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.expected_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,

  -- Source tracking
  template_id UUID REFERENCES public.transaction_templates(id) ON DELETE SET NULL,
  month_plan_id UUID REFERENCES public.month_plans(id) ON DELETE CASCADE NOT NULL,

  -- Transaction details
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  payment_method_id UUID REFERENCES public.payment_methods(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  expected_amount DECIMAL(12, 2) NOT NULL,
  original_currency currency_type NOT NULL,
  transaction_type transaction_type NOT NULL,
  expected_date DATE NOT NULL,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending',

  -- Matching
  matched_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  matched_at TIMESTAMP WITH TIME ZONE,

  -- Variance tracking
  actual_amount DECIMAL(12, 2),
  variance_amount DECIMAL(12, 2),
  variance_percentage DECIMAL(5, 2),

  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT positive_expected_amount CHECK (expected_amount > 0),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'matched', 'skipped', 'overdue'))
);

CREATE INDEX IF NOT EXISTS idx_expected_transactions_user_id ON public.expected_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_expected_transactions_month_plan ON public.expected_transactions(month_plan_id);
CREATE INDEX IF NOT EXISTS idx_expected_transactions_template ON public.expected_transactions(template_id);
CREATE INDEX IF NOT EXISTS idx_expected_transactions_status ON public.expected_transactions(status);
CREATE INDEX IF NOT EXISTS idx_expected_transactions_date ON public.expected_transactions(expected_date);
CREATE INDEX IF NOT EXISTS idx_expected_transactions_matched ON public.expected_transactions(matched_transaction_id) WHERE matched_transaction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expected_transactions_user_month ON public.expected_transactions(user_id, expected_date);

ALTER TABLE public.expected_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view own expected transactions" ON public.expected_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert own expected transactions" ON public.expected_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own expected transactions" ON public.expected_transactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete own expected transactions" ON public.expected_transactions
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_expected_transactions_updated_at BEFORE UPDATE ON public.expected_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. EXPECTED TRANSACTION TAGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.expected_transaction_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  expected_transaction_id UUID REFERENCES public.expected_transactions(id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(expected_transaction_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_expected_transaction_tags_expected_id ON public.expected_transaction_tags(expected_transaction_id);
CREATE INDEX IF NOT EXISTS idx_expected_transaction_tags_tag_id ON public.expected_transaction_tags(tag_id);

ALTER TABLE public.expected_transaction_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view expected transaction tags" ON public.expected_transaction_tags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.expected_transactions
      WHERE expected_transactions.id = expected_transaction_tags.expected_transaction_id
      AND expected_transactions.user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "Users can insert expected transaction tags" ON public.expected_transaction_tags
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.expected_transactions
      WHERE expected_transactions.id = expected_transaction_tags.expected_transaction_id
      AND expected_transactions.user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "Users can delete expected transaction tags" ON public.expected_transaction_tags
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.expected_transactions
      WHERE expected_transactions.id = expected_transaction_tags.expected_transaction_id
      AND expected_transactions.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 6. MODIFY EXISTING TRANSACTIONS TABLE
-- ============================================================================

-- Add columns to track source and link to expected transactions
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'manual' CHECK (source_type IN ('manual', 'matched', 'imported'));

ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS expected_transaction_id UUID REFERENCES public.expected_transactions(id) ON DELETE SET NULL;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS IF NOT EXISTS idx_transactions_expected_id ON public.transactions(expected_transaction_id)
WHERE expected_transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS IF NOT EXISTS idx_transactions_source_type ON public.transactions(source_type);

-- ============================================================================
-- 7. DATABASE FUNCTIONS
-- ============================================================================

-- Function to auto-calculate variance when expected transaction is matched
CREATE OR REPLACE FUNCTION calculate_expected_transaction_variance()
RETURNS TRIGGER AS $$
BEGIN
  -- Only calculate when status is 'matched' and actual_amount is set
  IF NEW.status = 'matched' AND NEW.actual_amount IS NOT NULL THEN
    NEW.variance_amount := NEW.actual_amount - NEW.expected_amount;
    NEW.variance_percentage := ROUND(((NEW.actual_amount - NEW.expected_amount) / NEW.expected_amount * 100)::numeric, 2);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_variance
BEFORE INSERT OR UPDATE ON public.expected_transactions
FOR EACH ROW
EXECUTE FUNCTION calculate_expected_transaction_variance();

-- Function to update overdue expected transactions (called by cron job)
CREATE OR REPLACE FUNCTION update_overdue_expected_transactions()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  WITH updated AS (
    UPDATE public.expected_transactions
    SET status = 'overdue'
    WHERE status = 'pending'
    AND expected_date < CURRENT_DATE
    RETURNING id
  )
  SELECT COUNT(*) INTO updated_count FROM updated;

  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.transaction_templates IS 'Stores recurring transaction patterns that can generate expected transactions';
COMMENT ON TABLE public.month_plans IS 'Tracks monthly budget plans and their status';
COMMENT ON TABLE public.expected_transactions IS 'Expected/scheduled transactions generated from templates or created manually';
COMMENT ON TABLE public.template_tags IS 'Junction table linking templates to tags';
COMMENT ON TABLE public.expected_transaction_tags IS 'Junction table linking expected transactions to tags';

COMMENT ON COLUMN public.transaction_templates.frequency IS 'Recurrence pattern: monthly, bi-weekly, weekly, quarterly, annually, custom';
COMMENT ON COLUMN public.transaction_templates.frequency_interval IS 'Every X periods (e.g., every 2 weeks)';
COMMENT ON COLUMN public.transaction_templates.day_of_month IS 'Day of month for monthly recurrence (1-31)';
COMMENT ON COLUMN public.transaction_templates.day_of_week IS 'Day of week for weekly recurrence (0=Sunday, 6=Saturday)';

COMMENT ON COLUMN public.expected_transactions.status IS 'Status: pending (not yet matched), matched (linked to actual transaction), skipped (won''t happen), overdue (past expected_date)';
COMMENT ON COLUMN public.expected_transactions.variance_amount IS 'Difference between actual and expected amount (actual - expected)';
COMMENT ON COLUMN public.expected_transactions.variance_percentage IS 'Percentage variance: (variance_amount / expected_amount) * 100';

COMMENT ON COLUMN public.transactions.source_type IS 'Origin of transaction: manual (user entered), matched (linked to expected), imported (from document/bank)';
COMMENT ON COLUMN public.transactions.expected_transaction_id IS 'Link to expected transaction if this transaction was matched';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
