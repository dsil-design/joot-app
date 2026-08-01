/**
 * Transaction-type derivation and merge-precedence tests.
 *
 * Covers the two "wrong money" defects from the reconciliation audit:
 * - the LLM overriding an arithmetically-derived sign (DigiCo ฿302,647
 *   income proposed as expense)
 * - credit-card payment rows proposed as income ("AUTOMATIC PAYMENT -
 *   THANK YOU" → income from vendor "Thank You Cafe")
 */

import { generateRuleProposal } from '@/lib/proposals/rule-engine'
import { mergeResults } from '@/lib/proposals/hybrid-engine'
import { isCardPaymentDescription } from '@/lib/matching/transfer-descriptions'
import type {
  ProposalInput,
  ProposalEngineResult,
  RuleEngineContext,
} from '@/lib/proposals/types'

const KBANK_PM = 'pm-kbank'
const CHASE_PM = 'pm-chase'
const PNC_PM = 'pm-pnc'

function makeContext(): RuleEngineContext {
  return {
    vendors: [],
    paymentMethods: [
      { id: KBANK_PM, name: 'KBANK - Kasikorn Bank Account', type: 'bank_account' },
      { id: PNC_PM, name: 'PNC: Personal Account', type: 'bank_account' },
      { id: CHASE_PM, name: 'Chase Sapphire Reserve', type: 'credit_card' },
    ],
    tags: [],
    recentTransactions: [],
    vendorTagFrequency: [],
    vendorDescriptionPatterns: [],
    pastCorrections: [],
    vendorRecipientMappings: [],
    statementDescriptionMappings: [],
  }
}

function makeItem(overrides: Partial<ProposalInput>): ProposalInput {
  return {
    compositeId: 'stmt:test:1',
    sourceType: 'statement',
    description: 'TEST ROW',
    amount: 100,
    currency: 'THB',
    date: '2026-05-15',
    ...overrides,
  }
}

describe('proposeTransactionType — payment-method-aware sign rules', () => {
  it('bank account: negative amount is income (money in)', () => {
    const result = generateRuleProposal(
      makeItem({
        description: 'From: DIGICO CO.,LT',
        amount: -302647,
        paymentMethodId: KBANK_PM,
      }),
      makeContext()
    )
    expect(result.fields.transactionType).toBe('income')
    expect(result.fieldConfidence.transaction_type.source).toBe('arithmetic')
  })

  it('bank account: positive amount is expense (money out)', () => {
    const result = generateRuleProposal(
      makeItem({ description: 'To: X1413 KITTITACH K', amount: 1000, paymentMethodId: KBANK_PM }),
      makeContext()
    )
    expect(result.fields.transactionType).toBe('expense')
    expect(result.fieldConfidence.transaction_type.source).toBe('arithmetic')
  })

  it('credit card: negative card-payment row is a transfer, never income', () => {
    const result = generateRuleProposal(
      makeItem({
        description: 'AUTOMATIC PAYMENT - THANK YOU',
        amount: -4895.28,
        currency: 'USD',
        paymentMethodId: CHASE_PM,
      }),
      makeContext()
    )
    expect(result.fields.transactionType).toBe('transfer')
    expect(result.fields.transactionType).not.toBe('income')
    expect(result.fieldConfidence.transaction_type.source).toBe('arithmetic')
  })

  it('credit card: negative non-payment row is a refund (income)', () => {
    const result = generateRuleProposal(
      makeItem({
        description: 'ADIDAS 6177 ELLENTON RETURN',
        amount: -53.48,
        currency: 'USD',
        paymentMethodId: CHASE_PM,
      }),
      makeContext()
    )
    expect(result.fields.transactionType).toBe('income')
  })

  it('credit card: positive amount is a charge (expense)', () => {
    const result = generateRuleProposal(
      makeItem({
        description: 'WM SUPERCENTER #769 VENICE FL',
        amount: 21.7,
        currency: 'USD',
        paymentMethodId: CHASE_PM,
      }),
      makeContext()
    )
    expect(result.fields.transactionType).toBe('expense')
  })

  it('bank account: outgoing autopay leg of a card payment is a transfer', () => {
    const result = generateRuleProposal(
      makeItem({
        description: 'Direct Payment - Autopay Chase Credit Crd XXXX',
        amount: 4895.28,
        currency: 'USD',
        paymentMethodId: PNC_PM,
      }),
      makeContext()
    )
    expect(result.fields.transactionType).toBe('transfer')
  })
})

describe('mergeResults — LLM may not override arithmetic fields', () => {
  function ruleResult(): ProposalEngineResult {
    return {
      fields: {
        amount: 302647,
        currency: 'THB',
        date: '2026-05-29',
        transactionType: 'income',
      },
      fieldConfidence: {
        amount: { score: 95, reasoning: 'Direct from import source', source: 'arithmetic' },
        currency: { score: 95, reasoning: 'Direct from import source', source: 'arithmetic' },
        date: { score: 100, reasoning: 'Statement date (authoritative)', source: 'arithmetic' },
        transaction_type: {
          score: 90,
          reasoning: 'Negative amount on bank account indicates money in',
          source: 'arithmetic',
        },
      },
      overallConfidence: 90,
      enrichmentConfidence: 0,
      engine: 'rule_based',
      durationMs: 0,
    }
  }

  it('negative statement amount + LLM "expense" at 99 still merges as income', () => {
    const llm: ProposalEngineResult = {
      fields: { transactionType: 'expense' },
      fieldConfidence: {
        transaction_type: {
          score: 99,
          reasoning: 'Negative amount (-302647 THB) clearly indicates an expense/outgoing payment.',
        },
      },
      overallConfidence: 99,
      enrichmentConfidence: 0,
      engine: 'llm',
      durationMs: 0,
    }

    const merged = mergeResults(ruleResult(), llm)
    expect(merged.fields.transactionType).toBe('income')
    expect(merged.fieldConfidence.transaction_type.score).toBe(90)
  })

  it('LLM may still propose a type when the rule engine only had the default', () => {
    const rule: ProposalEngineResult = {
      fields: { transactionType: 'expense' },
      fieldConfidence: {
        transaction_type: {
          score: 80,
          reasoning: 'Default: most transactions are expenses',
          source: 'default',
        },
      },
      overallConfidence: 80,
      enrichmentConfidence: 0,
      engine: 'rule_based',
      durationMs: 0,
    }
    const llm: ProposalEngineResult = {
      fields: { transactionType: 'income' },
      fieldConfidence: {
        transaction_type: { score: 85, reasoning: 'Payout notification', source: 'inferred' },
      },
      overallConfidence: 85,
      enrichmentConfidence: 0,
      engine: 'llm',
      durationMs: 0,
    }

    const merged = mergeResults(rule, llm)
    expect(merged.fields.transactionType).toBe('income')
  })

  it('LLM cannot override the amount either', () => {
    const llm: ProposalEngineResult = {
      fields: { amount: 999 },
      fieldConfidence: {
        amount: { score: 100, reasoning: 'The amount is definitely 999' },
      },
      overallConfidence: 100,
      enrichmentConfidence: 0,
      engine: 'llm',
      durationMs: 0,
    }

    const merged = mergeResults(ruleResult(), llm)
    expect(merged.fields.amount).toBe(302647)
  })
})

describe('isCardPaymentDescription', () => {
  it.each([
    'AUTOMATIC PAYMENT - THANK YOU',
    'Direct Payment - Autopay Chase Credit Crd XXXX',
    'PAYMENT THANK YOU',
    'AUTOPAY RECEIVED',
  ])('recognises "%s"', (desc) => {
    expect(isCardPaymentDescription(desc)).toBe(true)
  })

  it.each([
    'THANK YOU CAFE BANGKOK',
    'WM SUPERCENTER #769 VENICE FL',
    'Bill Payment to electric company',
    '',
  ])('does not match ordinary purchases: "%s"', (desc) => {
    expect(isCardPaymentDescription(desc)).toBe(false)
  })
})
