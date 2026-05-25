-- Migration: add_email_sub_orders
-- Created: 2026-05-25 15:20:38
--
-- Adds support for vendors (currently Amazon) that send one order-confirmation
-- email summarizing multiple sub-orders that each post to the credit card as a
-- separate charge. The parent email_transactions row keeps the grand total;
-- each sub-order lives in this child table with its own match linkage.
--
-- Status semantics: the parent email_transaction is treated as `matched` only
-- once every sub-order has a matched_transaction_id. A trigger keeps the
-- parent's status in sync as sub-order match state changes.

BEGIN;

CREATE TABLE public.email_sub_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Parent email_transaction
  email_transaction_id UUID NOT NULL
    REFERENCES public.email_transactions(id) ON DELETE CASCADE,

  -- Denormalized for RLS and quick filtering
  user_id UUID NOT NULL
    REFERENCES public.users(id) ON DELETE CASCADE,

  -- Per-sub-order data extracted from the email
  position INTEGER NOT NULL DEFAULT 0,  -- 0-based index in the email
  order_id TEXT,                         -- e.g. "111-8507210-6332245"
  amount DECIMAL(12, 2) NOT NULL,
  currency TEXT NOT NULL,
  description TEXT,                      -- short summary or first item name
  arrival_date DATE,                     -- parsed from "Arriving May 7" hints

  -- Match linkage — mirrors the columns on email_transactions
  matched_transaction_id UUID
    REFERENCES public.transactions(id) ON DELETE SET NULL,
  match_confidence INTEGER
    CHECK (match_confidence IS NULL OR (match_confidence >= 0 AND match_confidence <= 100)),
  match_method TEXT
    CHECK (match_method IS NULL OR match_method IN ('auto', 'manual', 'cross_source')),
  matched_at TIMESTAMPTZ,

  -- Rejected suggestions, mirroring email_transactions
  rejected_transaction_ids UUID[] NOT NULL DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (email_transaction_id, position)
);

CREATE INDEX idx_email_sub_orders_parent
  ON public.email_sub_orders(email_transaction_id);

CREATE INDEX idx_email_sub_orders_user_unmatched
  ON public.email_sub_orders(user_id)
  WHERE matched_transaction_id IS NULL;

CREATE INDEX idx_email_sub_orders_matched_tx
  ON public.email_sub_orders(matched_transaction_id)
  WHERE matched_transaction_id IS NOT NULL;

-- Keep updated_at fresh
CREATE TRIGGER update_email_sub_orders_updated_at
  BEFORE UPDATE ON public.email_sub_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.email_sub_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own email sub orders"
  ON public.email_sub_orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own email sub orders"
  ON public.email_sub_orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own email sub orders"
  ON public.email_sub_orders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own email sub orders"
  ON public.email_sub_orders FOR DELETE
  USING (auth.uid() = user_id);

-- Parent-status sync trigger
--
-- When any sub-order's matched_transaction_id changes, recompute the parent's
-- effective status: `matched` if every sub-order is matched, otherwise
-- `waiting_for_statement` (the natural "waiting on the credit card charge"
-- state for an order email).
--
-- This intentionally only flips between `matched` and `waiting_for_statement`,
-- never overrides terminal states like `skipped` or `imported`.
CREATE OR REPLACE FUNCTION public.sync_parent_status_from_sub_orders()
RETURNS TRIGGER AS $$
DECLARE
  parent_id UUID;
  total INT;
  matched INT;
  parent_status TEXT;
BEGIN
  parent_id := COALESCE(NEW.email_transaction_id, OLD.email_transaction_id);

  SELECT COUNT(*),
         COUNT(*) FILTER (WHERE matched_transaction_id IS NOT NULL)
    INTO total, matched
    FROM public.email_sub_orders
   WHERE email_transaction_id = parent_id;

  IF total = 0 THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT status INTO parent_status
    FROM public.email_transactions
   WHERE id = parent_id;

  -- Don't touch terminal/manual states
  IF parent_status IN ('skipped', 'imported', 'pending_review') THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF matched = total THEN
    UPDATE public.email_transactions
       SET status = 'matched',
           matched_at = COALESCE(matched_at, NOW())
     WHERE id = parent_id
       AND status <> 'matched';
  ELSE
    UPDATE public.email_transactions
       SET status = 'waiting_for_statement',
           matched_at = NULL
     WHERE id = parent_id
       AND status = 'matched';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_email_sub_orders_sync_parent
  AFTER INSERT OR UPDATE OF matched_transaction_id OR DELETE
  ON public.email_sub_orders
  FOR EACH ROW EXECUTE FUNCTION public.sync_parent_status_from_sub_orders();

COMMIT;
