/**
 * Slip-transaction backfill guards.
 *
 * The case these exist for: a ฿139 GrabFood email receipt was auto-linked at
 * 95% to a ฿139 reimbursement *received* from Nidnoi two days later — an
 * expense claiming an income transaction, on a different account, from a
 * different vendor. Amount and date agreed; nothing else was checked.
 */

import { backfillSlipTransactionMatches } from '@/lib/imports/slip-transaction-backfill'
import type { QueueItem } from '@/lib/imports/queue-types'

const KBANK_PM = '0aaeb6c8-6052-47c9-b377-bc27d3231d4f'
const CHASE_PM = 'ca11ab1e-0000-0000-0000-00000000cafe'
const NIDNOI = '504c68c7-9a78-4e84-aa35-255918fdc5bb'
const GRABFOOD = '6b451d8c-b8db-4475-b19b-6c3cf38b93d0'

/** Row shape the backfill selects from `transactions`. */
interface TxnRow {
  id: string
  transaction_date: string
  amount: number
  original_currency: string
  description: string | null
  source_payment_slip_id: string
  transaction_type: string | null
  vendor_id: string | null
  payment_method_id: string | null
  vendors: { name: string } | null
  payment_methods: { name: string; card_last_four: string | null } | null
}

/** Minimal stub of the chained Supabase query the backfill builds. */
function stubSupabase(rows: TxnRow[]) {
  const chain: Record<string, unknown> = {}
  for (const method of ['select', 'eq', 'not', 'gte']) {
    chain[method] = () => chain
  }
  chain.lte = () => Promise.resolve({ data: rows, error: null })
  return { from: () => chain } as never
}

function emailItem(overrides: Partial<QueueItem> = {}): QueueItem {
  return {
    id: 'email:0be67edc',
    statementFilename: 'Grab',
    paymentMethod: null,
    statementTransaction: {
      date: '2026-05-23',
      description: 'Meal: noodles',
      amount: 139,
      currency: 'THB',
      sourceFilename: 'Grab',
    },
    confidence: 0,
    confidenceLevel: 'none',
    reasons: [],
    isNew: true,
    status: 'pending',
    source: 'email',
    emailMetadata: { vendorId: GRABFOOD, classification: 'receipt' },
    ...overrides,
  } as QueueItem
}

/** The Nidnoi reimbursement: income, KBANK, created from a payment slip. */
function reimbursementRow(overrides: Partial<TxnRow> = {}): TxnRow {
  return {
    id: 'c47c6758-70b4-4287-9809-4dc414aa9c4d',
    transaction_date: '2026-05-25',
    amount: 139,
    original_currency: 'THB',
    description: 'Acai bowl',
    source_payment_slip_id: '10ee0617-505d-4121-b3e5-a87a14a64738',
    transaction_type: 'income',
    vendor_id: NIDNOI,
    payment_method_id: KBANK_PM,
    vendors: { name: 'Nidnoi' },
    payment_methods: { name: 'KBANK - Kasikorn Bank Account', card_last_four: null },
    ...overrides,
  }
}

describe('backfillSlipTransactionMatches — identity guards', () => {
  it('does not link an expense receipt to an income transaction', async () => {
    const item = emailItem()
    await backfillSlipTransactionMatches(stubSupabase([reimbursementRow()]), 'u1', [item], [])
    expect(item.matchedTransaction).toBeUndefined()
    expect(item.isNew).toBe(true)
  })

  it('does not link across different payment methods', async () => {
    // Same direction this time, so only the account differs.
    const item = emailItem({
      paymentMethod: { id: CHASE_PM, name: 'Chase Sapphire Reserve' },
      emailMetadata: { vendorId: undefined },
    })
    const row = reimbursementRow({ transaction_type: 'expense', vendor_id: null })
    await backfillSlipTransactionMatches(stubSupabase([row]), 'u1', [], [item])
    expect(item.matchedTransaction).toBeUndefined()
  })

  it('does not link when both sides resolve to different vendors', async () => {
    const item = emailItem()
    const row = reimbursementRow({ transaction_type: 'expense' }) // vendor still Nidnoi
    await backfillSlipTransactionMatches(stubSupabase([row]), 'u1', [item], [])
    expect(item.matchedTransaction).toBeUndefined()
  })

  it('does not link a receipt paid by one card to a transaction on another', async () => {
    const item = emailItem({
      emailMetadata: { paymentCardLastFour: '0599' },
    })
    const row = reimbursementRow({
      transaction_type: 'expense',
      vendor_id: null,
      payment_methods: { name: 'Amex', card_last_four: '1008' },
    })
    await backfillSlipTransactionMatches(stubSupabase([row]), 'u1', [item], [])
    expect(item.matchedTransaction).toBeUndefined()
  })

  it('still links the case the backfill exists for, and scores it honestly', async () => {
    // Slip created the transaction; the matching vendor receipt arrives later.
    const item = emailItem({
      statementTransaction: {
        date: '2026-05-06',
        description: 'Invoice',
        amount: 2782,
        currency: 'THB',
        sourceFilename: 'Bliss',
      },
      emailMetadata: { vendorId: 'bliss-vendor-id', classification: 'receipt' },
    })
    const row = reimbursementRow({
      id: 'bliss-txn',
      transaction_date: '2026-05-06',
      amount: 2782,
      description: 'Cleaning Service',
      transaction_type: 'expense',
      vendor_id: 'bliss-vendor-id',
      vendors: { name: 'Bliss Clean and Care' },
    })

    await backfillSlipTransactionMatches(stubSupabase([row]), 'u1', [item], [])

    expect(item.matchedTransaction?.id).toBe('bliss-txn')
    expect(item.isNew).toBe(false)
    // Same day + same vendor, but amount/date evidence alone must never reach
    // the 95 this used to assert unconditionally.
    expect(item.transactionMatchConfidence).toBe(90)
    expect(item.reasons.join(' ')).toContain('same vendor')
  })

  it('treats transfers as direction-neutral', async () => {
    const item = emailItem({ emailMetadata: { vendorId: undefined } })
    const row = reimbursementRow({ transaction_type: 'transfer', vendor_id: null })
    await backfillSlipTransactionMatches(stubSupabase([row]), 'u1', [item], [])
    expect(item.matchedTransaction?.id).toBe(reimbursementRow().id)
  })

  it('flags an uncorroborated link in its reason text', async () => {
    const item = emailItem({ emailMetadata: {} })
    const row = reimbursementRow({ transaction_type: 'expense', vendor_id: null })
    await backfillSlipTransactionMatches(stubSupabase([row]), 'u1', [item], [])
    expect(item.matchedTransaction).toBeDefined()
    expect(item.reasons.join(' ')).toContain('verify before approving')
    expect(item.transactionMatchConfidence).toBe(80)
  })
})
