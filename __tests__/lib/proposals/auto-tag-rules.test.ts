/**
 * Auto-tag rule tests.
 *
 * These rules are the user's explicit intent ("anything from Nidnoi is a
 * reimbursement"), as opposed to the statistical strategies that surround them
 * (past corrections, >50% vendor tag frequency). The behaviours worth pinning
 * down are the ones where "explicit" has to win or has to stay out of the way:
 *
 * - a rule fires on the first matching item, with no history at all
 * - a rule adds to inferred tags rather than replacing them
 * - a counterparty pattern still fires when vendor resolution failed
 * - the LLM may not overrule a rule, however confident it claims to be
 */

import { generateRuleProposal } from '@/lib/proposals/rule-engine'
import { mergeResults } from '@/lib/proposals/hybrid-engine'
import { evaluateAutoTagRules, ruleMatches } from '@/lib/services/auto-tag-rules'
import type {
  ProposalInput,
  ProposalEngineResult,
  RuleEngineContext,
  AutoTagRuleRecord,
} from '@/lib/proposals/types'

const NIDNOI = 'vendor-nidnoi'
const PUBLIX = 'vendor-publix'
const KBANK_PM = 'pm-kbank'

const TAG_REIMBURSEMENT = 'tag-reimbursement'
const TAG_GROCERIES = 'tag-groceries'
const TAG_SHARED = 'tag-shared'

function makeRule(overrides: Partial<AutoTagRuleRecord> = {}): AutoTagRuleRecord {
  return {
    id: 'rule-1',
    matchType: 'vendor',
    vendorId: NIDNOI,
    pattern: null,
    transactionType: null,
    sourceTypes: null,
    tagIds: [TAG_REIMBURSEMENT],
    priority: 0,
    ...overrides,
  }
}

function makeContext(overrides: Partial<RuleEngineContext> = {}): RuleEngineContext {
  return {
    vendors: [
      { id: NIDNOI, name: 'Nidnoi', transactionCount: 12 },
      { id: PUBLIX, name: 'Publix', transactionCount: 30 },
    ],
    paymentMethods: [
      { id: KBANK_PM, name: 'KBANK - Kasikorn Bank Account', type: 'bank_account' },
    ],
    tags: [
      { id: TAG_REIMBURSEMENT, name: 'reimbursement', usageCount: 4 },
      { id: TAG_GROCERIES, name: 'groceries', usageCount: 40 },
      { id: TAG_SHARED, name: 'shared', usageCount: 8 },
    ],
    recentTransactions: [],
    vendorTagFrequency: [],
    vendorDescriptionPatterns: [],
    pastCorrections: [],
    vendorRecipientMappings: [],
    statementDescriptionMappings: [],
    autoTagRules: [],
    ...overrides,
  }
}

function makeItem(overrides: Partial<ProposalInput> = {}): ProposalInput {
  return {
    compositeId: 'slip:test:1',
    sourceType: 'payment_slip',
    description: 'Transfer',
    amount: 465.5,
    currency: 'THB',
    date: '2026-05-04',
    ...overrides,
  }
}

const ALL_TAGS = new Set([TAG_REIMBURSEMENT, TAG_GROCERIES, TAG_SHARED])

describe('ruleMatches — filters', () => {
  it('vendor rule fires when the resolved vendor matches', () => {
    expect(ruleMatches(makeRule(), makeItem(), NIDNOI, 'income')).toBe(true)
  })

  it('vendor rule does not fire for a different vendor', () => {
    expect(ruleMatches(makeRule(), makeItem(), PUBLIX, 'income')).toBe(false)
  })

  it('vendor rule does not fire when vendor resolution failed', () => {
    expect(ruleMatches(makeRule(), makeItem(), null, 'income')).toBe(false)
  })

  it('respects the transaction_type filter', () => {
    const incomeOnly = makeRule({ transactionType: 'income' })
    expect(ruleMatches(incomeOnly, makeItem(), NIDNOI, 'income')).toBe(true)
    expect(ruleMatches(incomeOnly, makeItem(), NIDNOI, 'expense')).toBe(false)
  })

  it('respects the source_types filter', () => {
    const slipOnly = makeRule({ sourceTypes: ['payment_slip'] })
    expect(ruleMatches(slipOnly, makeItem({ sourceType: 'payment_slip' }), NIDNOI, 'income')).toBe(true)
    expect(ruleMatches(slipOnly, makeItem({ sourceType: 'statement' }), NIDNOI, 'income')).toBe(false)
  })

  it('a merged item satisfies a rule scoped to one of its constituent sources', () => {
    // The review queue pairs a slip with a statement row into one merged item.
    // A rule scoped to payment_slip should still apply to that pairing.
    const slipOnly = makeRule({ sourceTypes: ['payment_slip'] })
    const merged = makeItem({
      sourceType: 'merged',
      paymentSlipUploadId: 'slip-1',
      statementUploadId: 'stmt-1',
    })
    expect(ruleMatches(slipOnly, merged, NIDNOI, 'income')).toBe(true)
  })
})

describe('ruleMatches — counterparty patterns', () => {
  it('fires on the slip sender name even when no vendor was resolved', () => {
    const rule = makeRule({
      matchType: 'counterparty_pattern',
      vendorId: null,
      pattern: 'supaporn',
    })
    const item = makeItem({ senderName: 'MS. SUPAPORN KIDK' })
    expect(ruleMatches(rule, item, null, 'income')).toBe(true)
  })

  it('normalizes the honorific prefix the same way vendor learning does', () => {
    const rule = makeRule({
      matchType: 'counterparty_pattern',
      vendorId: null,
      pattern: 'MS. Supaporn',
    })
    expect(ruleMatches(rule, makeItem({ senderName: 'supaporn kidk' }), null, 'income')).toBe(true)
  })

  it('matches against the email sender name too', () => {
    const rule = makeRule({
      matchType: 'counterparty_pattern',
      vendorId: null,
      pattern: 'supaporn',
    })
    const item = makeItem({ sourceType: 'email', fromName: 'Supaporn K.' })
    expect(ruleMatches(rule, item, null, 'expense')).toBe(true)
  })

  it('does not fire on unrelated text', () => {
    const rule = makeRule({
      matchType: 'counterparty_pattern',
      vendorId: null,
      pattern: 'supaporn',
    })
    expect(ruleMatches(rule, makeItem({ senderName: 'GRAB TAXI' }), null, 'expense')).toBe(false)
  })
})

describe('evaluateAutoTagRules — conflict resolution', () => {
  it('unions tags from rules at the same priority', () => {
    const rules = [
      makeRule({ id: 'a', tagIds: [TAG_REIMBURSEMENT] }),
      makeRule({ id: 'b', tagIds: [TAG_SHARED] }),
    ]
    const result = evaluateAutoTagRules(rules, makeItem(), NIDNOI, 'income', ALL_TAGS)
    expect(result?.tagIds.sort()).toEqual([TAG_REIMBURSEMENT, TAG_SHARED].sort())
  })

  it('higher priority wins outright over a conflicting lower-priority rule', () => {
    const rules = [
      makeRule({ id: 'low', tagIds: [TAG_GROCERIES], priority: 0 }),
      makeRule({ id: 'high', tagIds: [TAG_REIMBURSEMENT], priority: 10 }),
    ]
    const result = evaluateAutoTagRules(rules, makeItem(), NIDNOI, 'income', ALL_TAGS)
    expect(result?.tagIds).toEqual([TAG_REIMBURSEMENT])
    expect(result?.ruleIds).toEqual(['high'])
  })

  it('drops tags that no longer exist rather than proposing a dangling id', () => {
    // A deleted tag would otherwise reach the approval insert and fail there.
    const rules = [makeRule({ tagIds: [TAG_REIMBURSEMENT, 'tag-deleted'] })]
    const result = evaluateAutoTagRules(rules, makeItem(), NIDNOI, 'income', ALL_TAGS)
    expect(result?.tagIds).toEqual([TAG_REIMBURSEMENT])
  })

  it('returns null when every tag in the matching rule is gone', () => {
    const rules = [makeRule({ tagIds: ['tag-deleted'] })]
    expect(evaluateAutoTagRules(rules, makeItem(), NIDNOI, 'income', ALL_TAGS)).toBeNull()
  })

  it('returns null when nothing matches', () => {
    expect(evaluateAutoTagRules([makeRule()], makeItem(), PUBLIX, 'income', ALL_TAGS)).toBeNull()
  })
})

describe('proposeTags — rules inside the engine', () => {
  it('applies a rule with no prior history for the vendor', () => {
    // The whole point: vendorTagFrequency is empty, so the statistical
    // strategies have nothing to go on and would leave tags blank.
    const context = makeContext({ autoTagRules: [makeRule()] })
    const item = makeItem({ vendorId: NIDNOI, senderName: 'MS. SUPAPORN KIDK' })

    const result = generateRuleProposal(item, context)

    expect(result.fields.tagIds).toContain(TAG_REIMBURSEMENT)
    expect(result.fieldConfidence.tag_ids.source).toBe('user_rule')
    expect(result.fieldConfidence.tag_ids.score).toBe(98)
  })

  it('adds rule tags on top of inferred tags instead of replacing them', () => {
    const context = makeContext({
      autoTagRules: [makeRule()],
      vendorTagFrequency: [
        { vendorId: NIDNOI, tagId: TAG_GROCERIES, tagName: 'groceries', frequency: 0.9, count: 9 },
      ],
    })
    const result = generateRuleProposal(makeItem({ vendorId: NIDNOI }), context)

    expect(result.fields.tagIds).toEqual(
      expect.arrayContaining([TAG_GROCERIES, TAG_REIMBURSEMENT])
    )
  })

  it('does not duplicate a tag the inferred strategy already picked', () => {
    const context = makeContext({
      autoTagRules: [makeRule()],
      vendorTagFrequency: [
        {
          vendorId: NIDNOI,
          tagId: TAG_REIMBURSEMENT,
          tagName: 'reimbursement',
          frequency: 0.9,
          count: 9,
        },
      ],
    })
    const result = generateRuleProposal(makeItem({ vendorId: NIDNOI }), context)

    expect(result.fields.tagIds).toEqual([TAG_REIMBURSEMENT])
  })

  it('reports which rules fired so their usage counters can be bumped', () => {
    const context = makeContext({ autoTagRules: [makeRule({ id: 'rule-nidnoi' })] })
    const result = generateRuleProposal(makeItem({ vendorId: NIDNOI }), context)

    expect(result.fields.autoTagRuleIds).toEqual(['rule-nidnoi'])
  })

  it('leaves tags untouched when no rule matches', () => {
    const context = makeContext({ autoTagRules: [makeRule()] })
    const result = generateRuleProposal(makeItem({ vendorId: PUBLIX }), context)

    expect(result.fields.tagIds ?? []).toEqual([])
    expect(result.fieldConfidence.tag_ids.source).not.toBe('user_rule')
  })
})

describe('mergeResults — the LLM may not overrule a user rule', () => {
  function ruleResult(): ProposalEngineResult {
    return {
      fields: { tagIds: [TAG_REIMBURSEMENT] },
      fieldConfidence: {
        tag_ids: {
          score: 98,
          reasoning: 'Auto-tag vendor rule: reimbursement',
          source: 'user_rule',
        },
      },
      overallConfidence: 98,
      enrichmentConfidence: 98,
      engine: 'rule_based',
      durationMs: 1,
    }
  }

  it('keeps rule tags even when the LLM claims higher confidence', () => {
    const llm: ProposalEngineResult = {
      fields: { tagIds: [TAG_GROCERIES] },
      fieldConfidence: {
        tag_ids: { score: 100, reasoning: 'Looks like a grocery run' },
      },
      overallConfidence: 100,
      enrichmentConfidence: 100,
      engine: 'llm',
      durationMs: 1,
    }

    const merged = mergeResults(ruleResult(), llm)

    expect(merged.fields.tagIds).toEqual([TAG_REIMBURSEMENT])
    expect(merged.fieldConfidence.tag_ids.source).toBe('user_rule')
  })

  it('still lets the LLM improve fields the rule engine only guessed at', () => {
    const rule = ruleResult()
    rule.fieldConfidence.description = { score: 20, reasoning: 'weak guess' }
    rule.fields.description = 'Transfer'

    const llm: ProposalEngineResult = {
      fields: { description: 'Grocery reimbursement from Nidnoi' },
      fieldConfidence: { description: { score: 80, reasoning: 'from slip memo' } },
      overallConfidence: 80,
      enrichmentConfidence: 80,
      engine: 'llm',
      durationMs: 1,
    }

    const merged = mergeResults(rule, llm)

    expect(merged.fields.description).toBe('Grocery reimbursement from Nidnoi')
    expect(merged.fields.tagIds).toEqual([TAG_REIMBURSEMENT])
  })
})
