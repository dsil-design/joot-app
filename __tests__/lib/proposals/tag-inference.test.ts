/**
 * Tag inference from vendor history.
 *
 * The numbers below are the real shape of the May 2026 Xfinity case: 20
 * transactions for the vendor, 7 of them tagged, 5 carrying "Florida House"
 * and 2 carrying "Business Expense". Measured against all 20 transactions the
 * house tag scored 0.25 and no tag was ever proposed for a recurring utility
 * the user has tagged the same way for months.
 */

import { generateRuleProposal } from '@/lib/proposals/rule-engine'
import type {
  ProposalInput,
  RuleEngineContext,
  VendorTagFrequency,
} from '@/lib/proposals/types'

const XFINITY = 'vendor-xfinity'
const FLORIDA_HOUSE = 'tag-florida-house'
const BUSINESS_EXPENSE = 'tag-business-expense'

function context(vendorTagFrequency: VendorTagFrequency[]): RuleEngineContext {
  return {
    vendors: [{ id: XFINITY, name: 'Xfinity', transactionCount: 20 }],
    paymentMethods: [],
    tags: [
      { id: FLORIDA_HOUSE, name: 'Florida House', usageCount: 5 },
      { id: BUSINESS_EXPENSE, name: 'Business Expense', usageCount: 2 },
    ],
    recentTransactions: [],
    vendorTagFrequency,
    vendorDescriptionPatterns: [],
    pastCorrections: [],
    vendorRecipientMappings: [],
    statementDescriptionMappings: [],
  }
}

const xfinityBill: ProposalInput = {
  compositeId: 'email:xfinity-may',
  sourceType: 'email',
  description: 'Automatic bill payment - Xfinity service',
  amount: 75,
  currency: 'USD',
  date: '2026-05-19',
  vendorNameRaw: 'Xfinity',
  parserKey: 'ai-fallback',
}

/** Frequency as fetchVendorTagFrequency now computes it: over tagged transactions. */
function freq(tagId: string, tagName: string, count: number, taggedTxns: number): VendorTagFrequency {
  return { vendorId: XFINITY, tagId, tagName, count, frequency: count / taggedTxns }
}

describe('proposeTags — vendor history', () => {
  it('proposes the tag the user puts on most of this vendor\'s tagged charges', () => {
    const result = generateRuleProposal(
      xfinityBill,
      context([
        freq(FLORIDA_HOUSE, 'Florida House', 5, 7),
        freq(BUSINESS_EXPENSE, 'Business Expense', 2, 7),
      ])
    )

    expect(result.fields.vendorId).toBe(XFINITY)
    expect(result.fields.tagIds).toEqual([FLORIDA_HOUSE])
  })

  it('does not propose a tag seen on a minority of tagged charges', () => {
    const result = generateRuleProposal(
      xfinityBill,
      context([freq(BUSINESS_EXPENSE, 'Business Expense', 2, 7)])
    )

    expect(result.fields.tagIds ?? []).toEqual([])
  })

  it('needs a second observation — one stray tag is not a convention', () => {
    const result = generateRuleProposal(
      xfinityBill,
      context([freq(FLORIDA_HOUSE, 'Florida House', 1, 1)])
    )

    expect(result.fields.tagIds ?? []).toEqual([])
  })

  it('would have proposed nothing under the old all-transactions denominator', () => {
    // 5 of 20, the value the old computation produced for this exact vendor.
    const result = generateRuleProposal(
      xfinityBill,
      context([freq(FLORIDA_HOUSE, 'Florida House', 5, 20)])
    )

    expect(result.fields.tagIds ?? []).toEqual([])
  })
})
