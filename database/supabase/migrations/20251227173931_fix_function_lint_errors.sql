-- Migration: fix_function_lint_errors
-- Created: 2025-12-27 17:39:31
-- Fix function lint errors identified by supabase db lint:
-- 1. get_sync_configuration: varchar[] vs text[] type mismatch
-- 2. get_next_tag_color: unused variable v_next_color

BEGIN;

-- Fix get_sync_configuration: cast ARRAY_AGG result to TEXT[]
CREATE OR REPLACE FUNCTION get_sync_configuration()
RETURNS TABLE(
  start_date DATE,
  auto_sync_enabled BOOLEAN,
  sync_time TIME,
  max_retries INTEGER,
  retry_delay_seconds INTEGER,
  tracked_currencies TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sc.start_date,
    sc.auto_sync_enabled,
    sc.sync_time,
    sc.max_retries,
    sc.retry_delay_seconds,
    ARRAY_AGG(cc.currency_code::TEXT ORDER BY cc.currency_code)::TEXT[] as tracked_currencies
  FROM sync_configuration sc
  CROSS JOIN currency_configuration cc
  WHERE cc.is_tracked = TRUE
    AND cc.source = 'ECB'
  GROUP BY sc.id, sc.start_date, sc.auto_sync_enabled, sc.sync_time,
           sc.max_retries, sc.retry_delay_seconds;
END;
$$ LANGUAGE plpgsql;

-- Fix get_next_tag_color: remove unused v_next_color variable
CREATE OR REPLACE FUNCTION get_next_tag_color(p_user_id UUID)
RETURNS TEXT AS $$
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
$$ LANGUAGE plpgsql;

COMMIT;
