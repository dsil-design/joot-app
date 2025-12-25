-- Migration: cleanup_unused_tables
-- Created: 2025-12-25 16:04:19
-- Description: Cleanup unused database tables from removed features
-- Features removed: Document management, Email processing, Recurring transactions
-- Related commits: 2f8d3ac, a5dfbf3

BEGIN;

-- ============================================================================
-- 1. DROP DOCUMENT MANAGEMENT TABLES (8 tables)
-- ============================================================================
-- These tables were created for the document/receipt scanning feature that was removed

DROP TABLE IF EXISTS public.processing_jobs CASCADE;
DROP TABLE IF EXISTS public.reconciliation_audit_log CASCADE;
DROP TABLE IF EXISTS public.vendor_enrichment_jobs CASCADE;
DROP TABLE IF EXISTS public.vendor_profiles CASCADE;
DROP TABLE IF EXISTS public.reconciliation_queue CASCADE;
DROP TABLE IF EXISTS public.transaction_document_matches CASCADE;
DROP TABLE IF EXISTS public.document_extractions CASCADE;
DROP TABLE IF EXISTS public.documents CASCADE;

-- ============================================================================
-- 2. DROP EMAIL PROCESSING TABLES (4 tables)
-- ============================================================================
-- These tables were created for the email receipt processing feature that was removed

DROP TABLE IF EXISTS public.email_actions_log CASCADE;
DROP TABLE IF EXISTS public.email_sync_jobs CASCADE;
DROP TABLE IF EXISTS public.email_messages CASCADE;
DROP TABLE IF EXISTS public.email_accounts CASCADE;

-- ============================================================================
-- 3. DROP RECURRING TRANSACTIONS TABLES (5 tables)
-- ============================================================================
-- These tables were created for the recurring transactions feature that was removed

DROP TABLE IF EXISTS public.expected_transaction_tags CASCADE;
DROP TABLE IF EXISTS public.expected_transactions CASCADE;
DROP TABLE IF EXISTS public.template_tags CASCADE;
DROP TABLE IF EXISTS public.transaction_templates CASCADE;
DROP TABLE IF EXISTS public.month_plans CASCADE;

-- ============================================================================
-- 4. CLEAN UP TRANSACTIONS TABLE COLUMNS
-- ============================================================================
-- Remove columns that were added for the recurring transactions feature

ALTER TABLE public.transactions
DROP COLUMN IF EXISTS source_type;

ALTER TABLE public.transactions
DROP COLUMN IF EXISTS expected_transaction_id;

-- ============================================================================
-- 5. DROP UNUSED FUNCTIONS
-- ============================================================================
-- Remove functions that were created for the removed features

-- Document management functions
DROP FUNCTION IF EXISTS get_unmatched_documents(UUID);
DROP FUNCTION IF EXISTS get_reconciliation_queue(UUID, INT);
DROP FUNCTION IF EXISTS get_document_storage_path(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS get_thumbnail_storage_path(UUID, UUID);
DROP FUNCTION IF EXISTS get_vendor_logo_path(UUID, TEXT);

-- Email processing functions
DROP FUNCTION IF EXISTS get_email_receipt_stats(UUID);
DROP FUNCTION IF EXISTS get_email_reconciliation_queue(UUID, INT);

-- Recurring transactions functions
DROP FUNCTION IF EXISTS calculate_expected_transaction_variance();
DROP FUNCTION IF EXISTS update_overdue_expected_transactions();

-- ============================================================================
-- 6. DROP UNUSED TRIGGERS (if they still exist)
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_calculate_variance ON public.expected_transactions;
DROP TRIGGER IF EXISTS update_templates_updated_at ON public.transaction_templates;
DROP TRIGGER IF EXISTS update_month_plans_updated_at ON public.month_plans;
DROP TRIGGER IF EXISTS update_expected_transactions_updated_at ON public.expected_transactions;
DROP TRIGGER IF EXISTS update_email_accounts_updated_at ON public.email_accounts;
DROP TRIGGER IF EXISTS update_email_messages_updated_at ON public.email_messages;
DROP TRIGGER IF EXISTS update_email_sync_jobs_updated_at ON public.email_sync_jobs;

COMMIT;
