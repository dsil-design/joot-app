/**
 * Self-transfer detector tests.
 *
 * Covers the reconciliation-audit defects: the $4,895.28 Chase autopay pair
 * (card leg 2026-05-15, funding bank leg 2026-05-18) was never merged because
 * the window was ±1 day, and equal same-direction rows could pair because
 * opposite signs were never required.
 */

import { findSelfTransferPairs } from '@/lib/matching/self-transfer-detector'
import type { QueueItem } from '@/lib/imports/queue-types'

let nextId = 0

function makeItem(overrides: {
  amount: number
  date: string
  description?: string
  pmId?: string
  pmType?: string
  currency?: string
  status?: QueueItem['status']
}): QueueItem {
  nextId += 1
  return {
    id: `item-${nextId}`,
    statementFilename: 'test.pdf',
    paymentMethod: { id: overrides.pmId ?? 'pm-a', name: overrides.pmId ?? 'pm-a' },
    paymentMethodType: overrides.pmType,
    statementTransaction: {
      date: overrides.date,
      description: overrides.description ?? 'TRANSFER',
      amount: overrides.amount,
      currency: overrides.currency ?? 'USD',
      sourceFilename: 'test.pdf',
    },
    confidence: 0,
    confidenceLevel: 'none',
    reasons: [],
    isNew: true,
    status: overrides.status ?? 'pending',
    source: 'statement',
  } as QueueItem
}

beforeEach(() => {
  nextId = 0
})

describe('findSelfTransferPairs', () => {
  it('pairs a credit-card autopay with its bank leg 3 days later', () => {
    const cardLeg = makeItem({
      amount: -4895.28,
      date: '2026-05-15',
      description: 'AUTOMATIC PAYMENT - THANK YOU',
      pmId: 'chase',
      pmType: 'credit_card',
    })
    const bankLeg = makeItem({
      amount: 4895.28,
      date: '2026-05-18',
      description: 'Direct Payment - Autopay Chase Credit Crd XXXX',
      pmId: 'pnc',
      pmType: 'bank_account',
    })

    const pairs = findSelfTransferPairs([cardLeg, bankLeg])
    expect(pairs).toHaveLength(1)
    expect(pairs[0].daysDiff).toBe(3)
    expect(pairs[0].debitItem.id).toBe(bankLeg.id)
    expect(pairs[0].creditItem.id).toBe(cardLeg.id)
  })

  it('requires opposite signs — two same-direction rows of equal size do not pair', () => {
    const a = makeItem({ amount: 55.54, date: '2026-05-30', pmId: 'chase', pmType: 'credit_card' })
    const b = makeItem({ amount: 55.54, date: '2026-05-30', pmId: 'pnc', pmType: 'bank_account' })

    expect(findSelfTransferPairs([a, b])).toHaveLength(0)
  })

  it('keeps the tight ±1 day window for same-type account pairs', () => {
    const out = makeItem({ amount: 1000, date: '2026-05-10', pmId: 'pnc-personal', pmType: 'bank_account' })
    const inn = makeItem({ amount: -1000, date: '2026-05-13', pmId: 'pnc-house', pmType: 'bank_account' })

    expect(findSelfTransferPairs([out, inn])).toHaveLength(0)
  })

  it('pairs same-day bank-to-bank transfers', () => {
    const out = makeItem({ amount: 1000, date: '2026-05-10', pmId: 'pnc-personal', pmType: 'bank_account' })
    const inn = makeItem({ amount: -1000, date: '2026-05-10', pmId: 'pnc-house', pmType: 'bank_account' })

    const pairs = findSelfTransferPairs([out, inn])
    expect(pairs).toHaveLength(1)
    expect(pairs[0].debitItem.id).toBe(out.id)
    expect(pairs[0].creditItem.id).toBe(inn.id)
  })

  it('card-payment descriptions widen the window even when account types are unknown', () => {
    const cardLeg = makeItem({
      amount: -2500,
      date: '2026-05-15',
      description: 'PAYMENT - THANK YOU',
      pmId: 'card',
    })
    const bankLeg = makeItem({
      amount: 2500,
      date: '2026-05-19',
      description: 'AUTOPAY CARD PAYMENT',
      pmId: 'bank',
    })

    const pairs = findSelfTransferPairs([cardLeg, bankLeg])
    expect(pairs).toHaveLength(1)
    expect(pairs[0].daysDiff).toBe(4)
  })

  it('does not pair rows on the same payment method', () => {
    const a = makeItem({ amount: 500, date: '2026-05-10', pmId: 'pnc', pmType: 'bank_account' })
    const b = makeItem({ amount: -500, date: '2026-05-10', pmId: 'pnc', pmType: 'bank_account' })

    expect(findSelfTransferPairs([a, b])).toHaveLength(0)
  })

  it('ignores non-pending and different-currency items', () => {
    const a = makeItem({ amount: 500, date: '2026-05-10', pmId: 'pnc', pmType: 'bank_account' })
    const approved = makeItem({
      amount: -500,
      date: '2026-05-10',
      pmId: 'kbank',
      pmType: 'bank_account',
      status: 'approved',
    })
    const thb = makeItem({
      amount: -500,
      date: '2026-05-10',
      pmId: 'kbank',
      pmType: 'bank_account',
      currency: 'THB',
    })

    expect(findSelfTransferPairs([a, approved, thb])).toHaveLength(0)
  })
})
