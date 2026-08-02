/**
 * Auto-Tag Rules Service
 *
 * User-authored "always tag X with Y" rules. Unlike the statistical strategies
 * in the rule engine (past corrections, vendor tag frequency), these are
 * explicit intent: they fire on the first matching item, with no history
 * required, and the LLM layer is not allowed to overrule them.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeCounterpartyName } from './vendor-recipient-mapping'
import type { AutoTagRuleRecord, ProposalInput } from '@/lib/proposals/types'

/** Source types a rule may be scoped to. */
export const RULE_SOURCE_TYPES = ['statement', 'email', 'payment_slip', 'merged'] as const

/**
 * Fetch a user's enabled auto-tag rules, highest priority first.
 * Called once per batch during proposal context prefetch.
 */
export async function fetchAutoTagRules(
  supabase: SupabaseClient,
  userId: string
): Promise<AutoTagRuleRecord[]> {
  const { data, error } = await supabase
    .from('auto_tag_rules')
    .select('id, match_type, vendor_id, pattern, transaction_type, source_types, tag_ids, priority')
    .eq('user_id', userId)
    .eq('enabled', true)
    .order('priority', { ascending: false })

  if (error || !data) return []

  return data
    .filter((row) => Array.isArray(row.tag_ids) && row.tag_ids.length > 0)
    .map((row) => ({
      id: row.id,
      matchType: row.match_type as AutoTagRuleRecord['matchType'],
      vendorId: row.vendor_id,
      pattern: row.pattern,
      transactionType: row.transaction_type as AutoTagRuleRecord['transactionType'],
      sourceTypes: row.source_types,
      tagIds: row.tag_ids,
      priority: row.priority,
    }))
}

/**
 * Every piece of raw text on a queue item that a counterparty pattern may
 * match against. Payment slips carry the counterparty on senderName /
 * recipientName; emails on fromName / vendorNameRaw; statements only have the
 * description line.
 */
function counterpartyHaystack(item: ProposalInput): string[] {
  return [
    item.senderName,
    item.recipientName,
    item.fromName,
    item.vendorNameRaw,
    item.description,
    ...(item.extraSlipContext || []).flatMap((s) => [s.senderName, s.recipientName]),
    ...(item.extraEmailContext || []).map((e) => e.fromName),
  ].filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
}

/**
 * Does this rule apply to this item?
 *
 * `resolvedVendorId` and `resolvedTransactionType` are the values the engine
 * has proposed so far — vendor rules can only fire once vendor resolution has
 * succeeded, which is why counterparty patterns exist as a fallback.
 */
export function ruleMatches(
  rule: AutoTagRuleRecord,
  item: ProposalInput,
  resolvedVendorId: string | null | undefined,
  resolvedTransactionType: string | null | undefined
): boolean {
  // Source type filter. A merged item carries data from more than one source,
  // so a rule scoped to e.g. payment_slip should still fire on a merged item
  // that includes a slip.
  if (rule.sourceTypes && rule.sourceTypes.length > 0) {
    if (!itemMatchesSourceTypes(item, rule.sourceTypes)) return false
  }

  // Transaction type filter
  if (rule.transactionType && resolvedTransactionType !== rule.transactionType) {
    return false
  }

  if (rule.matchType === 'vendor') {
    return !!rule.vendorId && !!resolvedVendorId && rule.vendorId === resolvedVendorId
  }

  // counterparty_pattern: substring match on normalized text
  const needle = normalizeCounterpartyName(rule.pattern || '')
  if (!needle) return false

  return counterpartyHaystack(item).some((raw) =>
    normalizeCounterpartyName(raw).includes(needle)
  )
}

function itemMatchesSourceTypes(item: ProposalInput, sourceTypes: string[]): boolean {
  if (sourceTypes.includes(item.sourceType)) return true

  // Merged items satisfy a rule scoped to any of their constituent sources.
  if (item.sourceType.startsWith('merged')) {
    if (item.paymentSlipUploadId && sourceTypes.includes('payment_slip')) return true
    if (item.emailTransactionId && sourceTypes.includes('email')) return true
    if (item.statementUploadId && sourceTypes.includes('statement')) return true
  }

  return false
}

export interface AutoTagRuleMatch {
  tagIds: string[]
  ruleIds: string[]
  /** Human-readable description of what fired, for the confidence reasoning. */
  labels: string[]
}

/**
 * Evaluate all rules against an item and collect the tags to apply.
 *
 * Rules at the same priority union their tags. A lower-priority rule is
 * skipped entirely once a higher-priority rule has matched, so "priority"
 * behaves as a tie-breaker between rules that would otherwise disagree
 * rather than as a filter that silently drops unrelated tags.
 */
export function evaluateAutoTagRules(
  rules: AutoTagRuleRecord[],
  item: ProposalInput,
  resolvedVendorId: string | null | undefined,
  resolvedTransactionType: string | null | undefined,
  knownTagIds: Set<string>
): AutoTagRuleMatch | null {
  const matched = rules.filter((r) =>
    ruleMatches(r, item, resolvedVendorId, resolvedTransactionType)
  )
  if (matched.length === 0) return null

  const topPriority = Math.max(...matched.map((r) => r.priority))
  const winners = matched.filter((r) => r.priority === topPriority)

  const tagIds: string[] = []
  const ruleIds: string[] = []
  const labels: string[] = []

  for (const rule of winners) {
    // Drop tags that no longer exist — a deleted tag would otherwise produce a
    // proposal referencing a dangling UUID that fails on approval insert.
    const valid = rule.tagIds.filter((id) => knownTagIds.has(id))
    if (valid.length === 0) continue

    for (const id of valid) {
      if (!tagIds.includes(id)) tagIds.push(id)
    }
    ruleIds.push(rule.id)
    labels.push(
      rule.matchType === 'vendor'
        ? 'vendor rule'
        : `pattern "${rule.pattern}"`
    )
  }

  if (tagIds.length === 0) return null

  return { tagIds, ruleIds, labels }
}

/**
 * Bump usage counters for rules that fired. Fire-and-forget: a failed counter
 * update must never block proposal generation.
 */
export async function recordRuleUsage(
  supabase: SupabaseClient,
  ruleIds: string[]
): Promise<void> {
  if (ruleIds.length === 0) return
  try {
    await supabase.rpc('increment_auto_tag_rule_usage', { rule_ids: ruleIds })
  } catch (error) {
    console.error('Failed to record auto-tag rule usage:', error)
  }
}
