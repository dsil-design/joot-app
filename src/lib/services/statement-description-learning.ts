/**
 * Statement Description Learning
 *
 * Learns vendor associations from statement descriptions (e.g. "GRAB*1234" → Grab).
 * Statement descriptions repeat identically across months, making them the
 * highest-value learning signal for vendor matching.
 *
 * Reuses the same pattern as vendor-recipient-mapping.ts but with
 * statement-specific normalization rules.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export interface StatementDescriptionMapping {
  descriptionNormalized: string
  vendorId: string
  vendorName?: string
  paymentMethodId: string | null
  matchCount: number
}

/**
 * Normalize a statement description for matching.
 *
 * Statement descriptions have different patterns than bank recipient names:
 * - Trailing reference numbers: "GRAB*1234" → "grab"
 * - Trailing dates: "AMAZON.COM 03/15" → "amazon.com"
 * - POS prefixes: "SQ *COFFEE SHOP" → "coffee shop"
 * - Common transaction prefixes/suffixes
 */
export function normalizeStatementDescription(description: string): string {
  let normalized = description
    .toLowerCase()
    .trim()

  // Remove common POS/payment prefixes
  normalized = normalized
    .replace(/^sq \*\s*/i, '')        // Square: "SQ *COFFEE SHOP"
    .replace(/^tst\*\s*/i, '')        // Toast: "TST*RESTAURANT"
    .replace(/^sp \*?\s*/i, '')       // Shopify: "SP * STORE"
    .replace(/^pp\*\s*/i, '')         // PayPal: "PP*MERCHANT"
    .replace(/^pos\s+/i, '')          // POS prefix
    .replace(/^debit\s+/i, '')        // Debit prefix
    .replace(/^purchase\s+/i, '')     // Purchase prefix

  // Remove trailing reference numbers after * or #
  // "GRAB*1234" → "grab", "UBER# 5678" → "uber"
  normalized = normalized.replace(/[*#]\s*\d+\s*$/, '')

  // Remove trailing dates in various formats
  // "AMAZON.COM 03/15" → "amazon.com"
  // "STORE 2024-03-15" → "store"
  normalized = normalized
    .replace(/\s+\d{1,2}\/\d{1,2}(\/\d{2,4})?\s*$/, '')
    .replace(/\s+\d{4}-\d{2}-\d{2}\s*$/, '')
    .replace(/\s+\d{2}-\d{2}-\d{4}\s*$/, '')

  // Remove trailing transaction/auth codes (common 6+ digit numbers at end)
  normalized = normalized.replace(/\s+\d{6,}\s*$/, '')

  // Remove trailing location identifiers (#123, -123)
  normalized = normalized.replace(/\s*[#-]\s*\d+\s*$/, '')

  // Remove country codes at end (US, TH, etc.)
  normalized = normalized.replace(/\s+[A-Z]{2}\s*$/i, '')

  // Collapse whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim()

  // Remove trailing punctuation
  normalized = normalized.replace(/[.*#\-_]+$/, '').trim()

  return normalized
}

/**
 * Upsert a statement description → vendor mapping.
 * If the mapping exists with the same vendor, increments match_count.
 * If the vendor changed (user picked a different vendor), resets count to 1.
 */
export async function upsertStatementDescriptionMapping(
  supabase: SupabaseClient,
  userId: string,
  descriptionRaw: string,
  vendorId: string,
  paymentMethodId: string | null
): Promise<void> {
  const normalized = normalizeStatementDescription(descriptionRaw)
  if (!normalized) return

  // Check if mapping already exists
  let query = supabase
    .from('statement_description_mappings')
    .select('id, match_count, vendor_id')
    .eq('user_id', userId)
    .eq('description_normalized', normalized)

  if (paymentMethodId) {
    query = query.eq('payment_method_id', paymentMethodId)
  } else {
    query = query.is('payment_method_id', null)
  }

  const { data: existing } = await query.single()

  if (existing) {
    await supabase
      .from('statement_description_mappings')
      .update({
        vendor_id: vendorId,
        match_count: existing.vendor_id === vendorId ? existing.match_count + 1 : 1,
        last_used_at: new Date().toISOString(),
        description_raw: descriptionRaw,
      })
      .eq('id', existing.id)
  } else {
    const { error } = await supabase
      .from('statement_description_mappings')
      .insert({
        user_id: userId,
        description_normalized: normalized,
        description_raw: descriptionRaw,
        vendor_id: vendorId,
        payment_method_id: paymentMethodId || null,
        match_count: 1,
        last_used_at: new Date().toISOString(),
      })

    if (error) {
      console.error('Error inserting statement description mapping:', error)
    }
  }
}

/**
 * Fetch all learned statement description mappings for a user.
 * Used by the proposal engine during context prefetch.
 */
export async function fetchStatementDescriptionMappings(
  supabase: SupabaseClient,
  userId: string
): Promise<StatementDescriptionMapping[]> {
  const { data, error } = await supabase
    .from('statement_description_mappings')
    .select('description_normalized, vendor_id, payment_method_id, match_count, vendors(name)')
    .eq('user_id', userId)
    .order('match_count', { ascending: false })

  if (error || !data) return []

  return data.map((row) => ({
    descriptionNormalized: row.description_normalized,
    vendorId: row.vendor_id,
    vendorName: (row.vendors as { name: string } | null)?.name || undefined,
    paymentMethodId: row.payment_method_id,
    matchCount: row.match_count,
  }))
}

/**
 * Look up a vendor for a given statement description.
 * Prefers same-payment-method matches, then cross-payment-method.
 */
export function findStatementDescriptionMatch(
  description: string,
  paymentMethodId: string | null,
  mappings: StatementDescriptionMapping[]
): StatementDescriptionMapping | null {
  const normalized = normalizeStatementDescription(description)
  if (!normalized) return null

  // Exact match on same payment method
  if (paymentMethodId) {
    const exactSamePM = mappings.find(
      (m) => m.descriptionNormalized === normalized && m.paymentMethodId === paymentMethodId
    )
    if (exactSamePM) return exactSamePM
  }

  // Exact match on any payment method
  const exactAny = mappings.find(
    (m) => m.descriptionNormalized === normalized
  )
  if (exactAny) return exactAny

  // Partial match: check containment with minimum length ratio
  // "grab" should match "grab food" but not "g"
  for (const m of mappings) {
    if (
      normalized.includes(m.descriptionNormalized) ||
      m.descriptionNormalized.includes(normalized)
    ) {
      const shorter = normalized.length < m.descriptionNormalized.length
        ? normalized
        : m.descriptionNormalized
      const longer = normalized.length >= m.descriptionNormalized.length
        ? normalized
        : m.descriptionNormalized
      if (shorter.length >= 4 && shorter.length / longer.length >= 0.7) {
        return m
      }
    }
  }

  return null
}
