-- Migration: add_auto_tag_rules
-- Created: 2026-08-02 18:54:29
--
-- User-authored auto-tagging rules. Until now tag suggestion was purely
-- statistical (past corrections + >50% vendor tag frequency), so there was no
-- way to say "always tag this vendor with this tag" — the rule only emerged
-- once enough history existed to infer it. These rules are explicit intent.

BEGIN;

CREATE TABLE public.auto_tag_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- What to match on.
  --   'vendor'               — fires once the engine has resolved a vendor
  --   'counterparty_pattern' — fires on raw counterparty/description text, so it
  --                            still works when vendor resolution failed (e.g. a
  --                            new spelling of a sender's name not yet in
  --                            vendor_recipient_mappings)
  match_type TEXT NOT NULL CHECK (match_type IN ('vendor', 'counterparty_pattern')),
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE,
  pattern TEXT,

  -- Optional narrowing filters. NULL means "applies to all".
  transaction_type transaction_type,
  source_types TEXT[],

  -- What to apply
  tag_ids UUID[] NOT NULL DEFAULT '{}',

  enabled BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 0,
  match_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT auto_tag_rule_target_check CHECK (
    (match_type = 'vendor' AND vendor_id IS NOT NULL)
    OR (match_type = 'counterparty_pattern' AND pattern IS NOT NULL AND length(trim(pattern)) > 0)
  ),
  CONSTRAINT auto_tag_rule_source_types_check CHECK (
    source_types IS NULL
    OR source_types <@ ARRAY['statement', 'email', 'payment_slip', 'merged']::TEXT[]
  )
);

CREATE INDEX idx_auto_tag_rules_user_enabled
  ON public.auto_tag_rules (user_id, enabled) WHERE enabled;
CREATE INDEX idx_auto_tag_rules_vendor
  ON public.auto_tag_rules (user_id, vendor_id) WHERE vendor_id IS NOT NULL;

ALTER TABLE public.auto_tag_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own auto tag rules"
  ON public.auto_tag_rules FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can manage own auto tag rules"
  ON public.auto_tag_rules FOR ALL USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Service role full access on auto tag rules"
  ON public.auto_tag_rules FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE TRIGGER update_auto_tag_rules_updated_at
  BEFORE UPDATE ON public.auto_tag_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Atomic usage counter. Proposal generation runs in batches, so a
-- read-modify-write from the app would lose increments across concurrent items.
CREATE OR REPLACE FUNCTION public.increment_auto_tag_rule_usage(rule_ids UUID[])
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  UPDATE public.auto_tag_rules r
  SET match_count = r.match_count + c.n,
      last_used_at = now()
  FROM (
    SELECT rid, count(*) AS n FROM unnest(rule_ids) AS rid GROUP BY rid
  ) c
  WHERE r.id = c.rid;
$$;

COMMIT;
