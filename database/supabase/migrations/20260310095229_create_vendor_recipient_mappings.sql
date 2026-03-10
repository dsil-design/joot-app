-- Vendor-Recipient Mappings
-- Learns the association between bank transfer recipient names (from email receipts)
-- and Joot vendor IDs, enabling automatic vendor suggestions for future transfers.

CREATE TABLE IF NOT EXISTS vendor_recipient_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_name_normalized TEXT NOT NULL,
  recipient_name_raw TEXT NOT NULL,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  parser_key TEXT NOT NULL,
  match_count INTEGER NOT NULL DEFAULT 1,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, recipient_name_normalized, parser_key)
);

-- Index for fast lookups during proposal generation
CREATE INDEX idx_vendor_recipient_mappings_user_lookup
  ON vendor_recipient_mappings (user_id, parser_key);

-- RLS
ALTER TABLE vendor_recipient_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own vendor-recipient mappings"
  ON vendor_recipient_mappings
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
