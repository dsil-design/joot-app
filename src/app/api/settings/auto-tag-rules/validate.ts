import { RULE_SOURCE_TYPES } from '@/lib/services/auto-tag-rules'

export interface AutoTagRulePayload {
  match_type: 'vendor' | 'counterparty_pattern'
  vendor_id: string | null
  pattern: string | null
  transaction_type: 'expense' | 'income' | 'transfer' | null
  source_types: string[] | null
  tag_ids: string[]
  enabled: boolean
  priority: number
}

const TRANSACTION_TYPES = ['expense', 'income', 'transfer']

/**
 * Validate and normalize a rule request body.
 *
 * Mirrors the table's CHECK constraints so a bad payload fails with a useful
 * message instead of a raw Postgres constraint violation.
 */
export function parseRulePayload(
  body: unknown
): { ok: true; value: AutoTagRulePayload } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Request body is required' }
  }
  const b = body as Record<string, unknown>

  const matchType = b.match_type
  if (matchType !== 'vendor' && matchType !== 'counterparty_pattern') {
    return { ok: false, error: 'match_type must be "vendor" or "counterparty_pattern"' }
  }

  const vendorId = typeof b.vendor_id === 'string' && b.vendor_id ? b.vendor_id : null
  const pattern = typeof b.pattern === 'string' ? b.pattern.trim() : ''

  if (matchType === 'vendor' && !vendorId) {
    return { ok: false, error: 'A vendor is required for a vendor rule' }
  }
  if (matchType === 'counterparty_pattern' && !pattern) {
    return { ok: false, error: 'A pattern is required for a counterparty rule' }
  }

  const tagIds = Array.isArray(b.tag_ids)
    ? b.tag_ids.filter((t): t is string => typeof t === 'string' && t.length > 0)
    : []
  if (tagIds.length === 0) {
    return { ok: false, error: 'At least one tag is required' }
  }

  const transactionType =
    typeof b.transaction_type === 'string' && TRANSACTION_TYPES.includes(b.transaction_type)
      ? (b.transaction_type as AutoTagRulePayload['transaction_type'])
      : null

  let sourceTypes: string[] | null = null
  if (Array.isArray(b.source_types) && b.source_types.length > 0) {
    const filtered = b.source_types.filter(
      (s): s is string =>
        typeof s === 'string' && (RULE_SOURCE_TYPES as readonly string[]).includes(s)
    )
    if (filtered.length !== b.source_types.length) {
      return { ok: false, error: `source_types must be a subset of ${RULE_SOURCE_TYPES.join(', ')}` }
    }
    sourceTypes = filtered
  }

  const priority = typeof b.priority === 'number' && Number.isFinite(b.priority)
    ? Math.trunc(b.priority)
    : 0

  return {
    ok: true,
    value: {
      match_type: matchType,
      // Keep the unused half null so the table's target CHECK stays satisfied
      // and a rule can be switched between match types without stale data.
      vendor_id: matchType === 'vendor' ? vendorId : null,
      pattern: matchType === 'counterparty_pattern' ? pattern : null,
      transaction_type: transactionType,
      source_types: sourceTypes,
      tag_ids: tagIds,
      enabled: b.enabled === undefined ? true : b.enabled !== false,
      priority,
    },
  }
}
