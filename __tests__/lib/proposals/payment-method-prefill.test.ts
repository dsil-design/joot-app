/**
 * Payment-method resolution from import sources.
 *
 * Covers the review-queue defect where a Grab receipt paired with a Chase
 * statement row offered no payment method at all: the pre-fill only knew how
 * to map an email parser key onto a payment method *name*, and no account is
 * named "Grab" — while the statement the charge was printed on is itself the
 * account that paid.
 */

import {
  paymentMethodSignalsFromItem,
  resolvePaymentMethodFromSignals,
} from '@/lib/proposals/payment-method-mapper'
import { generateRuleProposal } from '@/lib/proposals/rule-engine'
import type { ProposalInput, RuleEngineContext } from '@/lib/proposals/types'

const CHASE = { id: 'pm-chase', name: 'Chase Sapphire Reserve', card_last_four: '4321' }
const KBANK = { id: 'pm-kbank', name: 'KBANK - Kasikorn Bank Account', card_last_four: null }
const AMEX = { id: 'pm-amex', name: 'Amex Platinum', card_last_four: '1005' }

const METHODS = [CHASE, KBANK, AMEX]

describe('resolvePaymentMethodFromSignals', () => {
  it('uses the statement the row was imported from (the reported defect)', () => {
    const resolved = resolvePaymentMethodFromSignals(
      {
        sourcePaymentMethod: { id: CHASE.id, name: CHASE.name },
        parserKey: 'grab',
      },
      METHODS
    )

    expect(resolved?.id).toBe(CHASE.id)
    expect(resolved?.confidence).toBe(95)
  })

  it('prefers the statement account over the receipt email parser', () => {
    // A Grab receipt settled on the Chase card: the merchant is Grab, the
    // account is Chase. A payment method literally named "Grab" must not win.
    const resolved = resolvePaymentMethodFromSignals(
      {
        sourcePaymentMethod: { id: CHASE.id, name: CHASE.name },
        parserKey: 'grab',
      },
      [...METHODS, { id: 'pm-grab', name: 'Grab Wallet', card_last_four: null }]
    )

    expect(resolved?.id).toBe(CHASE.id)
  })

  it('falls back to card digits printed on the receipt when there is no statement', () => {
    const resolved = resolvePaymentMethodFromSignals(
      { cardLastFour: '1005', cardType: 'Amex' },
      METHODS
    )

    expect(resolved?.id).toBe(AMEX.id)
    expect(resolved?.confidence).toBe(92)
  })

  it('falls back to the email parser key when nothing more specific exists', () => {
    const resolved = resolvePaymentMethodFromSignals({ parserKey: 'kasikorn' }, METHODS)

    expect(resolved?.id).toBe(KBANK.id)
    expect(resolved?.confidence).toBe(85)
  })

  it('falls back to the bank detected on a payment slip', () => {
    const resolved = resolvePaymentMethodFromSignals({ bankDetected: 'kbank' }, METHODS)

    expect(resolved?.id).toBe(KBANK.id)
  })

  it('ignores an unknown bank_detected value', () => {
    expect(resolvePaymentMethodFromSignals({ bankDetected: 'unknown' }, METHODS)).toBeNull()
  })

  it('skips a source account the user no longer has and keeps resolving', () => {
    // A deleted/renamed payment method id would render as an empty picker.
    const resolved = resolvePaymentMethodFromSignals(
      { sourcePaymentMethod: { id: 'pm-deleted', name: 'Closed Card' }, cardLastFour: '4321' },
      METHODS
    )

    expect(resolved?.id).toBe(CHASE.id)
  })

  it('matches a source account by name when the id has changed', () => {
    const resolved = resolvePaymentMethodFromSignals(
      { sourcePaymentMethod: { id: 'stale-id', name: 'chase sapphire reserve' } },
      METHODS
    )

    expect(resolved?.id).toBe(CHASE.id)
  })

  it('returns null when no source says anything about the account', () => {
    expect(resolvePaymentMethodFromSignals({ parserKey: 'lazada' }, METHODS)).toBeNull()
    expect(resolvePaymentMethodFromSignals({}, METHODS)).toBeNull()
    expect(resolvePaymentMethodFromSignals({ parserKey: 'grab' }, [])).toBeNull()
  })
})

describe('paymentMethodSignalsFromItem', () => {
  it('reads a merged email + statement card', () => {
    const signals = paymentMethodSignalsFromItem({
      paymentMethod: { id: CHASE.id, name: CHASE.name },
      mergedEmailData: {
        metadata: { parserKey: 'grab', paymentCardLastFour: '4321', paymentCardType: 'Visa' },
      },
    })

    expect(signals).toEqual({
      sourcePaymentMethod: { id: CHASE.id, name: CHASE.name },
      cardLastFour: '4321',
      cardType: 'Visa',
      parserKey: 'grab',
      bankDetected: undefined,
    })
  })

  it('reads a standalone payment slip card', () => {
    const signals = paymentMethodSignalsFromItem({
      paymentMethod: null,
      paymentSlipMetadata: { bankDetected: 'kbank' },
    })

    expect(signals.bankDetected).toBe('kbank')
    expect(resolvePaymentMethodFromSignals(signals, METHODS)?.id).toBe(KBANK.id)
  })

  it('reads an email-only card', () => {
    const signals = paymentMethodSignalsFromItem({
      emailMetadata: { parserKey: 'kasikorn' },
    })

    expect(signals.sourcePaymentMethod).toBeNull()
    expect(signals.parserKey).toBe('kasikorn')
  })
})

describe('parity with the server-side rule engine', () => {
  function makeContext(): RuleEngineContext {
    return {
      vendors: [],
      paymentMethods: METHODS.map((pm) => ({
        id: pm.id,
        name: pm.name,
        type: pm.id === KBANK.id ? 'bank_account' : 'credit_card',
        cardLastFour: pm.card_last_four,
      })),
      tags: [],
      recentTransactions: [],
      vendorTagFrequency: [],
      vendorDescriptionPatterns: [],
      pastCorrections: [],
      vendorRecipientMappings: [],
      statementDescriptionMappings: [],
    }
  }

  function makeInput(overrides: Partial<ProposalInput>): ProposalInput {
    return {
      compositeId: 'merged:email-1+stmt:stmt-1:5',
      sourceType: 'merged',
      description: 'WWW.grab.COM Bangkok',
      amount: 1.27,
      currency: 'USD',
      date: '2026-05-18',
      ...overrides,
    }
  }

  it('client pre-fill and rule engine pick the same account for a Grab/Chase pair', () => {
    const ruleResult = generateRuleProposal(
      makeInput({ paymentMethodId: CHASE.id, paymentMethodName: CHASE.name, parserKey: 'grab' }),
      makeContext()
    )
    const clientResult = resolvePaymentMethodFromSignals(
      { sourcePaymentMethod: { id: CHASE.id, name: CHASE.name }, parserKey: 'grab' },
      METHODS
    )

    expect(ruleResult.fields.paymentMethodId).toBe(CHASE.id)
    expect(clientResult?.id).toBe(ruleResult.fields.paymentMethodId)
  })

  it('client pre-fill and rule engine agree on card-digit matching', () => {
    const ruleResult = generateRuleProposal(
      makeInput({ paymentCardLastFour: '1005', paymentCardType: 'Amex', parserKey: 'grab' }),
      makeContext()
    )
    const clientResult = resolvePaymentMethodFromSignals(
      { cardLastFour: '1005', cardType: 'Amex', parserKey: 'grab' },
      METHODS
    )

    expect(ruleResult.fields.paymentMethodId).toBe(AMEX.id)
    expect(clientResult?.id).toBe(ruleResult.fields.paymentMethodId)
  })
})
