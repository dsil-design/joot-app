-- Migration: add_missing_fk_indexes
-- Created: 2025-12-27 18:31:57
-- Purpose: Add missing indexes on foreign key columns to improve
--          DELETE/UPDATE performance on parent tables

-- Index for rate_changes.exchange_rate_id (FK to exchange_rates)
CREATE INDEX IF NOT EXISTS idx_rate_changes_exchange_rate_id
ON public.rate_changes(exchange_rate_id);

-- Index for sync_configuration.last_modified_by (FK to users)
CREATE INDEX IF NOT EXISTS idx_sync_configuration_last_modified_by
ON public.sync_configuration(last_modified_by);

-- Index for sync_history.retry_of (self-referential FK)
CREATE INDEX IF NOT EXISTS idx_sync_history_retry_of
ON public.sync_history(retry_of);
