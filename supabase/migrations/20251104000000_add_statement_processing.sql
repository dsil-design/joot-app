-- ============================================================================
-- STATEMENT PROCESSING MIGRATION
-- Created: 2025-11-04
-- Description: Adds support for multi-transaction statement processing
-- ============================================================================

-- Enable UUID extension (already enabled, but ensure)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;

-- ============================================================================
-- 1. STATEMENT_METADATA TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.statement_metadata (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL UNIQUE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,

  -- Statement period
  statement_start_date DATE,
  statement_end_date DATE,

  -- Account info
  account_number_masked TEXT,
  account_type TEXT, -- 'checking', 'savings', 'credit_card', 'investment'
  institution_name TEXT,

  -- Balances
  beginning_balance DECIMAL(12, 2),
  ending_balance DECIMAL(12, 2),

  -- Transaction summary
  total_credits DECIMAL(12, 2),
  total_debits DECIMAL(12, 2),
  transaction_count INT DEFAULT 0,

  -- Extraction quality
  extraction_confidence DECIMAL(5, 2), -- 0-100
  validation_status TEXT DEFAULT 'pending', -- 'pending', 'validated', 'failed'
  validation_errors JSONB, -- Array of validation error messages

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_statement_metadata_document_id ON public.statement_metadata(document_id);
CREATE INDEX idx_statement_metadata_user_id ON public.statement_metadata(user_id);
CREATE INDEX idx_statement_metadata_period ON public.statement_metadata(statement_start_date, statement_end_date);
CREATE INDEX idx_statement_metadata_institution ON public.statement_metadata(institution_name);

ALTER TABLE public.statement_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own statement metadata" ON public.statement_metadata
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own statement metadata" ON public.statement_metadata
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own statement metadata" ON public.statement_metadata
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own statement metadata" ON public.statement_metadata
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 2. STATEMENT_TRANSACTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.statement_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  statement_metadata_id UUID REFERENCES public.statement_metadata(id) ON DELETE CASCADE NOT NULL,
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,

  -- Transaction details
  transaction_index INT NOT NULL,
  transaction_date DATE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  transaction_type TEXT, -- 'debit', 'credit', 'pending'
  running_balance DECIMAL(12, 2),
  category TEXT,

  -- Matching to existing transactions
  matched_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  match_confidence DECIMAL(5, 2), -- 0-100
  match_status TEXT DEFAULT 'pending', -- 'pending', 'matched', 'new', 'ignored'
  match_metadata JSONB, -- Detailed match scores

  -- User actions
  user_action TEXT, -- 'auto_matched', 'manually_matched', 'marked_as_new', 'ignored'
  reviewed_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(statement_metadata_id, transaction_index)
);

CREATE INDEX idx_statement_transactions_statement_id ON public.statement_transactions(statement_metadata_id);
CREATE INDEX idx_statement_transactions_document_id ON public.statement_transactions(document_id);
CREATE INDEX idx_statement_transactions_user_id ON public.statement_transactions(user_id);
CREATE INDEX idx_statement_transactions_date ON public.statement_transactions(transaction_date DESC);
CREATE INDEX idx_statement_transactions_match_status ON public.statement_transactions(match_status);
CREATE INDEX idx_statement_transactions_matched_id ON public.statement_transactions(matched_transaction_id) WHERE matched_transaction_id IS NOT NULL;

ALTER TABLE public.statement_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own statement transactions" ON public.statement_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own statement transactions" ON public.statement_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own statement transactions" ON public.statement_transactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own statement transactions" ON public.statement_transactions
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 3. MODIFY DOCUMENTS TABLE
-- ============================================================================

-- Add document type classification
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS document_type TEXT DEFAULT 'receipt',
  -- Values: 'receipt', 'invoice', 'bank_statement', 'credit_card_statement', 'investment_statement'
ADD COLUMN IF NOT EXISTS is_multi_transaction BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS classification_confidence DECIMAL(5, 2);

CREATE INDEX idx_documents_type ON public.documents(document_type);
CREATE INDEX idx_documents_multi_transaction ON public.documents(is_multi_transaction) WHERE is_multi_transaction = TRUE;

-- ============================================================================
-- 4. UPDATED_AT TRIGGERS
-- ============================================================================

CREATE TRIGGER update_statement_metadata_updated_at
  BEFORE UPDATE ON public.statement_metadata
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_statement_transactions_updated_at
  BEFORE UPDATE ON public.statement_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. HELPER FUNCTIONS
-- ============================================================================

-- Get statement transactions for a document
CREATE OR REPLACE FUNCTION get_statement_transactions(p_document_id UUID)
RETURNS TABLE (
  transaction_id UUID,
  transaction_index INT,
  transaction_date DATE,
  description TEXT,
  amount DECIMAL,
  running_balance DECIMAL,
  match_status TEXT,
  matched_transaction_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    st.id,
    st.transaction_index,
    st.transaction_date,
    st.description,
    st.amount,
    st.running_balance,
    st.match_status,
    st.matched_transaction_id
  FROM public.statement_transactions st
  WHERE st.document_id = p_document_id
  ORDER BY st.transaction_index ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get unmatched statement transactions for reconciliation
CREATE OR REPLACE FUNCTION get_unmatched_statement_transactions(p_user_id UUID, p_limit INT DEFAULT 50)
RETURNS TABLE (
  transaction_id UUID,
  document_id UUID,
  statement_date DATE,
  description TEXT,
  amount DECIMAL,
  match_confidence DECIMAL,
  suggested_match_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    st.id,
    st.document_id,
    st.transaction_date,
    st.description,
    st.amount,
    st.match_confidence,
    st.matched_transaction_id
  FROM public.statement_transactions st
  WHERE st.user_id = p_user_id
    AND st.match_status = 'pending'
  ORDER BY st.transaction_date DESC, st.match_confidence ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Validate statement balances
CREATE OR REPLACE FUNCTION validate_statement_balances(p_statement_metadata_id UUID)
RETURNS TABLE (
  is_valid BOOLEAN,
  calculated_ending_balance DECIMAL,
  expected_ending_balance DECIMAL,
  difference DECIMAL
) AS $$
DECLARE
  v_beginning_balance DECIMAL;
  v_ending_balance DECIMAL;
  v_total_credits DECIMAL;
  v_total_debits DECIMAL;
  v_calculated_balance DECIMAL;
  v_difference DECIMAL;
BEGIN
  -- Get statement metadata
  SELECT beginning_balance, ending_balance
  INTO v_beginning_balance, v_ending_balance
  FROM public.statement_metadata
  WHERE id = p_statement_metadata_id;

  -- Calculate totals from transactions
  SELECT
    COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0)
  INTO v_total_credits, v_total_debits
  FROM public.statement_transactions
  WHERE statement_metadata_id = p_statement_metadata_id;

  -- Calculate expected ending balance
  v_calculated_balance := v_beginning_balance + v_total_credits - v_total_debits;
  v_difference := ABS(v_calculated_balance - v_ending_balance);

  RETURN QUERY SELECT
    v_difference < 0.01, -- Allow 1 cent rounding error
    v_calculated_balance,
    v_ending_balance,
    v_difference;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.statement_metadata IS 'Stores metadata for bank/credit card/investment statements (account info, period, balances)';
COMMENT ON TABLE public.statement_transactions IS 'Individual transactions extracted from statements, with matching status to existing transactions table';

COMMENT ON COLUMN public.statement_metadata.validation_status IS 'Indicates if statement passed validation checks (balance reconciliation, transaction count)';
COMMENT ON COLUMN public.statement_transactions.match_status IS 'pending: not yet matched, matched: linked to existing transaction, new: needs to be imported, ignored: user skipped';
COMMENT ON COLUMN public.statement_transactions.user_action IS 'Tracks how the transaction was processed (auto, manual, etc)';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Summary:
-- ✓ statement_metadata table created
-- ✓ statement_transactions table created
-- ✓ documents table enhanced with document_type
-- ✓ RLS policies applied
-- ✓ Indexes for performance
-- ✓ Helper functions for common queries
-- ✓ Validation functions for data integrity
