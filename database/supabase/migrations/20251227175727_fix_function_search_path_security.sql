-- Migration: fix_function_search_path_security
-- Created: 2025-12-27 17:57:27
-- Description: Fix function search_path security warnings from Supabase Security Advisor
--
-- This migration addresses the "Function Search Path Mutable" warnings by setting
-- an immutable search_path on all affected functions. This prevents potential
-- search_path hijacking attacks.
--
-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable

BEGIN;

-- ============================================================================
-- 1. update_updated_at_column - Trigger function for automatic timestamp updates
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 2. update_vendor_duplicate_suggestions_updated_at - Trigger for vendor duplicates
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_vendor_duplicate_suggestions_updated_at()
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

-- ============================================================================
-- 3. handle_new_user - Creates user profile and default data on auth signup
-- ============================================================================
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

-- ============================================================================
-- 4. cleanup_orphaned_vendors - Removes vendors with no transactions
-- ============================================================================
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_vendors()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  vendor_to_check UUID;
BEGIN
  -- Determine which vendor(s) to check based on operation
  IF TG_OP = 'DELETE' THEN
    vendor_to_check := OLD.vendor_id;
  ELSIF TG_OP = 'UPDATE' THEN
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

-- ============================================================================
-- 5. is_admin - Check if current user is an admin
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
BEGIN
  RETURN public.is_user_admin(auth.uid());
END;
$$;

-- ============================================================================
-- 6. get_tracked_currencies - Returns list of tracked currencies
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_tracked_currencies()
RETURNS TABLE(
  currency_code VARCHAR(10),
  display_name VARCHAR(100),
  currency_symbol VARCHAR(10),
  source VARCHAR(50),
  is_crypto BOOLEAN
)
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cc.currency_code,
    cc.display_name,
    cc.currency_symbol,
    cc.source,
    cc.is_crypto
  FROM public.currency_configuration cc
  WHERE cc.is_tracked = TRUE
  ORDER BY cc.is_crypto, cc.currency_code;
END;
$$;

-- ============================================================================
-- 7. update_tracked_currencies - Updates which currencies are tracked
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_tracked_currencies(
  p_currencies VARCHAR(10)[]
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  removed_rates INTEGER
)
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_removed_rates INTEGER := 0;
  v_untracked_currencies VARCHAR(10)[];
BEGIN
  -- Update all currencies to untracked
  UPDATE public.currency_configuration SET is_tracked = FALSE;

  -- Set specified currencies as tracked
  UPDATE public.currency_configuration
  SET is_tracked = TRUE, updated_at = NOW()
  WHERE currency_code = ANY(p_currencies);

  -- Get list of untracked currencies for cleanup
  SELECT ARRAY_AGG(currency_code) INTO v_untracked_currencies
  FROM public.currency_configuration
  WHERE is_tracked = FALSE;

  -- Remove exchange rates for untracked currencies
  IF v_untracked_currencies IS NOT NULL THEN
    DELETE FROM public.exchange_rates
    WHERE from_currency::text = ANY(v_untracked_currencies)
       OR to_currency::text = ANY(v_untracked_currencies);

    GET DIAGNOSTICS v_removed_rates = ROW_COUNT;
  END IF;

  RETURN QUERY
  SELECT
    TRUE as success,
    format('Updated tracked currencies. Removed %s rates for untracked currencies.', v_removed_rates) as message,
    v_removed_rates as removed_rates;
END;
$$;

-- ============================================================================
-- 8. get_sync_configuration - Returns sync configuration with tracked currencies
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_sync_configuration()
RETURNS TABLE(
  start_date DATE,
  auto_sync_enabled BOOLEAN,
  sync_time TIME,
  max_retries INTEGER,
  retry_delay_seconds INTEGER,
  tracked_currencies TEXT[]
)
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sc.start_date,
    sc.auto_sync_enabled,
    sc.sync_time,
    sc.max_retries,
    sc.retry_delay_seconds,
    ARRAY_AGG(cc.currency_code::TEXT ORDER BY cc.currency_code)::TEXT[] as tracked_currencies
  FROM public.sync_configuration sc
  CROSS JOIN public.currency_configuration cc
  WHERE cc.is_tracked = TRUE
    AND cc.source = 'ECB'
  GROUP BY sc.id, sc.start_date, sc.auto_sync_enabled, sc.sync_time,
           sc.max_retries, sc.retry_delay_seconds;
END;
$$;

-- ============================================================================
-- 9. update_sync_configuration - Updates sync settings
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_sync_configuration(
  p_start_date DATE DEFAULT NULL,
  p_auto_sync_enabled BOOLEAN DEFAULT NULL,
  p_sync_time TIME DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  UPDATE public.sync_configuration
  SET
    start_date = COALESCE(p_start_date, start_date),
    auto_sync_enabled = COALESCE(p_auto_sync_enabled, auto_sync_enabled),
    sync_time = COALESCE(p_sync_time, sync_time),
    last_modified_by = p_user_id,
    updated_at = NOW()
  WHERE id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid;

  RETURN FOUND;
END;
$$;

-- ============================================================================
-- 10. get_latest_sync_status - Returns most recent sync status
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_latest_sync_status()
RETURNS TABLE(
  id UUID,
  sync_type VARCHAR(50),
  status VARCHAR(50),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER,
  new_rates_inserted INTEGER,
  rates_updated INTEGER,
  rates_deleted INTEGER,
  rates_unchanged INTEGER,
  error_message TEXT
)
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sh.id,
    sh.sync_type,
    sh.status,
    sh.started_at,
    sh.completed_at,
    sh.duration_ms,
    sh.new_rates_inserted,
    sh.rates_updated,
    sh.rates_deleted,
    sh.rates_unchanged,
    sh.error_message
  FROM public.sync_history sh
  ORDER BY sh.started_at DESC
  LIMIT 1;
END;
$$;

-- ============================================================================
-- 11. get_sync_statistics - Returns sync statistics for given time period
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_sync_statistics(
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE(
  total_syncs INTEGER,
  successful_syncs INTEGER,
  failed_syncs INTEGER,
  average_duration_ms INTEGER,
  total_rates_inserted INTEGER,
  total_rates_updated INTEGER,
  last_successful_sync TIMESTAMP WITH TIME ZONE,
  last_failed_sync TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as total_syncs,
    COUNT(*) FILTER (WHERE sh.status = 'completed')::INTEGER as successful_syncs,
    COUNT(*) FILTER (WHERE sh.status = 'failed')::INTEGER as failed_syncs,
    AVG(sh.duration_ms)::INTEGER as average_duration_ms,
    SUM(sh.new_rates_inserted)::INTEGER as total_rates_inserted,
    SUM(sh.rates_updated)::INTEGER as total_rates_updated,
    MAX(sh.completed_at) FILTER (WHERE sh.status = 'completed') as last_successful_sync,
    MAX(sh.completed_at) FILTER (WHERE sh.status = 'failed') as last_failed_sync
  FROM public.sync_history sh
  WHERE sh.started_at >= NOW() - INTERVAL '1 day' * p_days;
END;
$$;

-- ============================================================================
-- 12. get_next_tag_color - Returns next available tag color for user
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_next_tag_color(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_colors TEXT[] := ARRAY['#dbeafe', '#dcfce7', '#fef3c7', '#ffe2e2', '#f4f4f5', '#bedbff', '#b9f8cf', '#fee685'];
  v_used_colors TEXT[];
  v_available_colors TEXT[];
BEGIN
  -- Get all colors currently used by this user
  SELECT ARRAY_AGG(DISTINCT color) INTO v_used_colors
  FROM public.tags
  WHERE user_id = p_user_id;

  -- If no colors used yet, return first color
  IF v_used_colors IS NULL THEN
    RETURN v_colors[1];
  END IF;

  -- Find colors not yet used
  SELECT ARRAY_AGG(c) INTO v_available_colors
  FROM UNNEST(v_colors) AS c
  WHERE c NOT IN (SELECT UNNEST(v_used_colors));

  -- If there are available colors, return the first one
  IF v_available_colors IS NOT NULL AND array_length(v_available_colors, 1) > 0 THEN
    RETURN v_available_colors[1];
  END IF;

  -- If all colors are used, cycle back to first color
  RETURN v_colors[1];
END;
$$;

-- ============================================================================
-- 13-16. Drop orphaned functions not in migrations (created directly in DB)
-- These functions exist in the database but have no corresponding migration.
-- If they are actually used, they should be recreated with proper migrations.
-- ============================================================================

-- Check if these functions exist and drop them if they do
DROP FUNCTION IF EXISTS public.get_statement_transactions(UUID, DATE, DATE);
DROP FUNCTION IF EXISTS public.get_statement_transactions(UUID);
DROP FUNCTION IF EXISTS public.get_unmatched_statement_transactions(UUID, DATE, DATE);
DROP FUNCTION IF EXISTS public.get_unmatched_statement_transactions(UUID);
DROP FUNCTION IF EXISTS public.validate_statement_balances(UUID, DATE, DATE);
DROP FUNCTION IF EXISTS public.validate_statement_balances(UUID);
DROP FUNCTION IF EXISTS public.get_exchange_rate_with_fallback(VARCHAR, VARCHAR, DATE);
DROP FUNCTION IF EXISTS public.get_exchange_rate_with_fallback(TEXT, TEXT, DATE);

COMMIT;
