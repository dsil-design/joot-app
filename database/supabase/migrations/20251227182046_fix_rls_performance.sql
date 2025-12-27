-- Migration: fix_rls_performance
-- Created: 2025-12-27 18:20:46
-- Description: Fixes Supabase Performance Advisor warnings
--
-- Issues fixed:
-- 1. auth_rls_initplan: Wrap auth.uid() and auth.role() in subqueries
--    to prevent per-row re-evaluation
-- 2. multiple_permissive_policies: Remove duplicate policies
--
-- This is safe and will not impact functionality - only improves query performance.

BEGIN;

-- ============================================================================
-- 1. FIX: users table policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING ((select auth.uid()) = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING ((select auth.uid()) = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK ((select auth.uid()) = id);

-- ============================================================================
-- 2. FIX: transactions table policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can delete own transactions" ON public.transactions;

CREATE POLICY "Users can view own transactions" ON public.transactions
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own transactions" ON public.transactions
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own transactions" ON public.transactions
  FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own transactions" ON public.transactions
  FOR DELETE USING ((select auth.uid()) = user_id);

-- ============================================================================
-- 3. FIX: payment_methods table policies (+ remove duplicates)
-- ============================================================================

-- Drop all existing policies (including duplicates)
DROP POLICY IF EXISTS "Users can view own payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Users can view their own payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Users can insert own payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Users can insert their own payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Users can update own payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Users can update their own payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Users can delete own payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Users can delete their own payment methods" ON public.payment_methods;

-- Recreate with optimized syntax (single policy per action)
CREATE POLICY "Users can view own payment methods" ON public.payment_methods
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own payment methods" ON public.payment_methods
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own payment methods" ON public.payment_methods
  FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own payment methods" ON public.payment_methods
  FOR DELETE USING ((select auth.uid()) = user_id);

-- ============================================================================
-- 4. FIX: vendors table policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own vendors" ON public.vendors;
DROP POLICY IF EXISTS "Users can insert own vendors" ON public.vendors;
DROP POLICY IF EXISTS "Users can update own vendors" ON public.vendors;
DROP POLICY IF EXISTS "Users can delete own vendors" ON public.vendors;

CREATE POLICY "Users can view own vendors" ON public.vendors
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own vendors" ON public.vendors
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own vendors" ON public.vendors
  FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own vendors" ON public.vendors
  FOR DELETE USING ((select auth.uid()) = user_id);

-- ============================================================================
-- 5. FIX: tags table policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own tags" ON public.tags;
DROP POLICY IF EXISTS "Users can insert own tags" ON public.tags;
DROP POLICY IF EXISTS "Users can update own tags" ON public.tags;
DROP POLICY IF EXISTS "Users can delete own tags" ON public.tags;

CREATE POLICY "Users can view own tags" ON public.tags
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own tags" ON public.tags
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own tags" ON public.tags
  FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own tags" ON public.tags
  FOR DELETE USING ((select auth.uid()) = user_id);

-- ============================================================================
-- 6. FIX: transaction_tags table policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own transaction tags" ON public.transaction_tags;
DROP POLICY IF EXISTS "Users can insert own transaction tags" ON public.transaction_tags;
DROP POLICY IF EXISTS "Users can delete own transaction tags" ON public.transaction_tags;

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

-- ============================================================================
-- 7. FIX: vendor_duplicate_suggestions table policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own duplicate suggestions" ON public.vendor_duplicate_suggestions;
DROP POLICY IF EXISTS "Users can insert their own duplicate suggestions" ON public.vendor_duplicate_suggestions;
DROP POLICY IF EXISTS "Users can update their own duplicate suggestions" ON public.vendor_duplicate_suggestions;
DROP POLICY IF EXISTS "Users can delete their own duplicate suggestions" ON public.vendor_duplicate_suggestions;

CREATE POLICY "Users can view their own duplicate suggestions" ON public.vendor_duplicate_suggestions
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own duplicate suggestions" ON public.vendor_duplicate_suggestions
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own duplicate suggestions" ON public.vendor_duplicate_suggestions
  FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own duplicate suggestions" ON public.vendor_duplicate_suggestions
  FOR DELETE USING ((select auth.uid()) = user_id);

-- ============================================================================
-- 8. FIX: currency_configuration table policies (+ remove duplicates)
-- ============================================================================

-- Drop all existing policies (including duplicates)
DROP POLICY IF EXISTS "Authenticated users can view currency configuration" ON public.currency_configuration;
DROP POLICY IF EXISTS "Public users can view currency configuration" ON public.currency_configuration;
DROP POLICY IF EXISTS "Admin users can update currency configuration" ON public.currency_configuration;

-- Recreate with optimized syntax
-- Use a single policy that allows both authenticated and public access for SELECT
CREATE POLICY "Anyone can view currency configuration" ON public.currency_configuration
  FOR SELECT USING (true);

CREATE POLICY "Admin users can update currency configuration" ON public.currency_configuration
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE (select auth.uid()) = id
      AND raw_user_meta_data->>'is_admin' = 'true'
    )
  );

-- ============================================================================
-- 9. FIX: exchange_rates table policies (+ remove duplicates)
-- ============================================================================

-- Drop all existing policies (including duplicates)
DROP POLICY IF EXISTS "Authenticated users can view exchange rates" ON public.exchange_rates;
DROP POLICY IF EXISTS "Admins can manage exchange rates" ON public.exchange_rates;

-- Recreate with optimized syntax
-- All authenticated users can view
CREATE POLICY "Authenticated users can view exchange rates" ON public.exchange_rates
  FOR SELECT USING ((select auth.role()) = 'authenticated');

-- Admins can insert/update/delete (separate policies to avoid duplicate SELECT)
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

-- ============================================================================
-- 10. FIX: sync_configuration table policies
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can view sync configuration" ON public.sync_configuration;
DROP POLICY IF EXISTS "Admin users can update sync configuration" ON public.sync_configuration;

CREATE POLICY "Authenticated users can view sync configuration" ON public.sync_configuration
  FOR SELECT USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Admin users can update sync configuration" ON public.sync_configuration
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE (select auth.uid()) = id
      AND raw_user_meta_data->>'is_admin' = 'true'
    )
  );

-- ============================================================================
-- 11. FIX: sync_history table policies
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can view sync history" ON public.sync_history;
DROP POLICY IF EXISTS "Admin users can insert sync history" ON public.sync_history;

CREATE POLICY "Authenticated users can view sync history" ON public.sync_history
  FOR SELECT USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Admin users can insert sync history" ON public.sync_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE (select auth.uid()) = id
      AND raw_user_meta_data->>'is_admin' = 'true'
    )
  );

-- ============================================================================
-- 12. FIX: sync_logs table policies
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can view sync logs" ON public.sync_logs;

CREATE POLICY "Authenticated users can view sync logs" ON public.sync_logs
  FOR SELECT USING ((select auth.role()) = 'authenticated');

-- ============================================================================
-- 13. FIX: rate_changes table policies
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can view rate changes" ON public.rate_changes;

CREATE POLICY "Authenticated users can view rate changes" ON public.rate_changes
  FOR SELECT USING ((select auth.role()) = 'authenticated');

-- ============================================================================
-- 14. FIX: statement_metadata table policies (if table exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'statement_metadata') THEN
    DROP POLICY IF EXISTS "Users can view own statement metadata" ON public.statement_metadata;
    DROP POLICY IF EXISTS "Users can insert own statement metadata" ON public.statement_metadata;
    DROP POLICY IF EXISTS "Users can update own statement metadata" ON public.statement_metadata;
    DROP POLICY IF EXISTS "Users can delete own statement metadata" ON public.statement_metadata;

    EXECUTE 'CREATE POLICY "Users can view own statement metadata" ON public.statement_metadata FOR SELECT USING ((select auth.uid()) = user_id)';
    EXECUTE 'CREATE POLICY "Users can insert own statement metadata" ON public.statement_metadata FOR INSERT WITH CHECK ((select auth.uid()) = user_id)';
    EXECUTE 'CREATE POLICY "Users can update own statement metadata" ON public.statement_metadata FOR UPDATE USING ((select auth.uid()) = user_id)';
    EXECUTE 'CREATE POLICY "Users can delete own statement metadata" ON public.statement_metadata FOR DELETE USING ((select auth.uid()) = user_id)';
  END IF;
END $$;

-- ============================================================================
-- 15. FIX: statement_transactions table policies (if table exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'statement_transactions') THEN
    DROP POLICY IF EXISTS "Users can view own statement transactions" ON public.statement_transactions;
    DROP POLICY IF EXISTS "Users can insert own statement transactions" ON public.statement_transactions;
    DROP POLICY IF EXISTS "Users can update own statement transactions" ON public.statement_transactions;
    DROP POLICY IF EXISTS "Users can delete own statement transactions" ON public.statement_transactions;

    EXECUTE 'CREATE POLICY "Users can view own statement transactions" ON public.statement_transactions FOR SELECT USING ((select auth.uid()) = user_id)';
    EXECUTE 'CREATE POLICY "Users can insert own statement transactions" ON public.statement_transactions FOR INSERT WITH CHECK ((select auth.uid()) = user_id)';
    EXECUTE 'CREATE POLICY "Users can update own statement transactions" ON public.statement_transactions FOR UPDATE USING ((select auth.uid()) = user_id)';
    EXECUTE 'CREATE POLICY "Users can delete own statement transactions" ON public.statement_transactions FOR DELETE USING ((select auth.uid()) = user_id)';
  END IF;
END $$;

COMMIT;
