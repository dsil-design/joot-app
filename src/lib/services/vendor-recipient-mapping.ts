/**
 * Vendor-Recipient Mapping Service
 *
 * Learns and retrieves associations between bank transfer recipient names
 * (from email receipts) and Joot vendor IDs.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export interface VendorRecipientMapping {
  recipientNameNormalized: string
  vendorId: string
  vendorName?: string
  parserKey: string
  matchCount: number
}

const BANK_PARSER_KEYS = ['bangkok-bank', 'kasikorn']

function normalizeRecipientName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^(mr\.|mrs\.|ms\.|miss|นาย|นาง|น\.ส\.|นางสาว)\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Check if a parser key belongs to a bank transfer parser.
 */
export function isBankParser(parserKey: string | null | undefined): boolean {
  return !!parserKey && BANK_PARSER_KEYS.includes(parserKey)
}

/**
 * Upsert a vendor-recipient mapping.
 * If the mapping already exists with the same vendor, increments match_count.
 * If the vendor changed (user picked a different vendor), resets count to 1.
 */
export async function upsertMapping(
  supabase: SupabaseClient,
  userId: string,
  recipientNameRaw: string,
  vendorId: string,
  parserKey: string
): Promise<void> {
  const normalized = normalizeRecipientName(recipientNameRaw)
  if (!normalized) return

  // Check if mapping already exists
  const { data: existing } = await supabase
    .from('vendor_recipient_mappings')
    .select('id, match_count, vendor_id')
    .eq('user_id', userId)
    .eq('recipient_name_normalized', normalized)
    .eq('parser_key', parserKey)
    .single()

  if (existing) {
    // Update: increment count if same vendor, reset if vendor changed
    await supabase
      .from('vendor_recipient_mappings')
      .update({
        vendor_id: vendorId,
        match_count: existing.vendor_id === vendorId ? existing.match_count + 1 : 1,
        last_used_at: new Date().toISOString(),
        recipient_name_raw: recipientNameRaw,
      })
      .eq('id', existing.id)
  } else {
    const { error } = await supabase
      .from('vendor_recipient_mappings')
      .insert({
        user_id: userId,
        recipient_name_normalized: normalized,
        recipient_name_raw: recipientNameRaw,
        vendor_id: vendorId,
        parser_key: parserKey,
        match_count: 1,
        last_used_at: new Date().toISOString(),
      })

    if (error) {
      console.error('Error inserting vendor-recipient mapping:', error)
    }
  }
}

/**
 * Fetch all learned mappings for a user.
 * Used by the proposal engine during context prefetch.
 */
export async function fetchMappings(
  supabase: SupabaseClient,
  userId: string
): Promise<VendorRecipientMapping[]> {
  const { data, error } = await supabase
    .from('vendor_recipient_mappings')
    .select('recipient_name_normalized, vendor_id, parser_key, match_count, vendors(name)')
    .eq('user_id', userId)
    .order('match_count', { ascending: false })

  if (error || !data) return []

  return data.map((row) => ({
    recipientNameNormalized: row.recipient_name_normalized,
    vendorId: row.vendor_id,
    vendorName: (row.vendors as { name: string } | null)?.name || undefined,
    parserKey: row.parser_key,
    matchCount: row.match_count,
  }))
}

/**
 * Look up a vendor for a given recipient name and parser key.
 */
export function findMappingMatch(
  recipientName: string,
  parserKey: string,
  mappings: VendorRecipientMapping[]
): VendorRecipientMapping | null {
  const normalized = normalizeRecipientName(recipientName)
  if (!normalized) return null

  // Exact match on normalized name + parser key
  const exactMatch = mappings.find(
    (m) => m.recipientNameNormalized === normalized && m.parserKey === parserKey
  )
  if (exactMatch) return exactMatch

  // Cross-parser match (same recipient, different bank)
  const crossMatch = mappings.find(
    (m) => m.recipientNameNormalized === normalized
  )
  if (crossMatch) return crossMatch

  // Partial match: check if normalized name contains or is contained by a mapping
  for (const m of mappings) {
    if (
      normalized.includes(m.recipientNameNormalized) ||
      m.recipientNameNormalized.includes(normalized)
    ) {
      // Only accept if the shorter string is at least 4 chars (avoid false positives)
      const shorter = normalized.length < m.recipientNameNormalized.length
        ? normalized
        : m.recipientNameNormalized
      if (shorter.length >= 4) return m
    }
  }

  return null
}
