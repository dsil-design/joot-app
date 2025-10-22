-- Migration: Add automatic vendor cleanup trigger
-- Created: 2025-10-22 17:58:01
--
-- This migration adds a trigger that automatically deletes vendors when they have 0 transactions.
-- This prevents orphaned vendors from accumulating when transactions are deleted or updated.

BEGIN;

-- Create function to cleanup orphaned vendors
CREATE OR REPLACE FUNCTION cleanup_orphaned_vendors()
RETURNS TRIGGER AS $$
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

      -- Log for debugging (optional, can be removed in production)
      RAISE NOTICE 'Cleaned up orphaned vendor: %', vendor_to_check;
    END IF;
  END IF;

  -- Return appropriate record based on operation
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on transactions table
-- Runs AFTER DELETE or UPDATE to ensure the transaction changes are committed first
CREATE TRIGGER cleanup_orphaned_vendors_after_transaction_change
AFTER DELETE OR UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION cleanup_orphaned_vendors();

-- Clean up any existing orphaned vendors (one-time cleanup)
-- This removes all vendors that currently have 0 transactions
DELETE FROM public.vendors v
WHERE NOT EXISTS (
  SELECT 1
  FROM public.transactions t
  WHERE t.vendor_id = v.id
);

COMMIT;
