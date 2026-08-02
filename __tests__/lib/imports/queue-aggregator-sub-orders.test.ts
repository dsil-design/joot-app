/**
 * Pairing an order email that settles as several card charges.
 *
 * The case these exist for: Amazon emails one order confirmation but bills the
 * card once per shipment. Cross-source pairing is 1:1 — an email claims a
 * statement row and both are retired — so a $420.87 order email could never
 * pair with the $361.61, $38.47 and $20.79 rows that make it up. All three sat
 * in the May 2026 review queue as evidence-free statement lines while the
 * receipt sat one table away, already broken down in `email_sub_orders`.
 *
 * The fix offers one pair candidate per shipment. The rule that keeps it
 * honest is all-or-nothing: a partial match would retire the email while one
 * of its shipments still had no evidence anywhere.
 */

import { aggregateQueueItems } from '@/lib/imports/queue-aggregator'
import { parseImportId } from '@/lib/utils/import-id'
import type { QueueItem, QueueFilters } from '@/lib/imports/queue-types'

const EMAIL = '22222222-2222-2222-2222-222222222222'
const STMT = '33333333-3333-3333-3333-333333333333'

/** No exchange-rate lookups: every amount here is USD on both sides. */
const supabase = {
  from: () => {
    const chain: Record<string, unknown> = {}
    for (const m of ['select', 'eq', 'in', 'not', 'gte', 'lte', 'order']) {
      chain[m] = () => chain
    }
    ;(chain as { then: unknown }).then = (res: (v: unknown) => unknown) =>
      res({ data: [], error: null })
    return chain
  },
} as never

const filters: QueueFilters = {
  statusFilter: 'all',
  currencyFilter: 'all',
  confidenceFilter: 'all',
  sourceFilter: 'all',
  searchQuery: '',
}

function statementRow(index: number, amount: number, date: string, description: string): QueueItem {
  return {
    id: `stmt:${STMT}:${index}`,
    source: 'statement',
    statementFilename: '20260518-statements-0599-.pdf',
    statementTransaction: { date, description, amount, currency: 'USD' },
    confidence: 0,
    confidenceLevel: 'none',
    reasons: [],
    isNew: true,
    status: 'pending',
  } as unknown as QueueItem
}

function orderEmail(total: number, subOrders: { amount: number; orderId: string }[]): QueueItem {
  return {
    id: `email:${EMAIL}`,
    source: 'email',
    statementFilename: 'auto-confirm@amazon.com',
    statementTransaction: {
      date: '2026-04-30',
      description: 'Amazon order',
      amount: total,
      currency: 'USD',
    },
    confidence: 100,
    confidenceLevel: 'high',
    reasons: [],
    isNew: true,
    status: 'pending',
    emailMetadata: {
      subject: 'Ordered: "Skechers Women\'s Viper..." and 13 more items',
      fromAddress: 'auto-confirm@amazon.com',
      subOrders: subOrders.map((s, position) => ({
        id: `sub-${position}`,
        position,
        orderId: s.orderId,
        amount: s.amount,
        currency: 'USD',
        description: `Shipment ${position + 1}`,
      })),
    },
  } as unknown as QueueItem
}

const SHIPMENTS = [
  { amount: 361.61, orderId: '111-8507210-6332245' },
  { amount: 20.79, orderId: '111-1346918-8922644' },
  { amount: 38.47, orderId: '111-4731488-0557010' },
]

it('pairs each shipment of one order email with its own statement charge', async () => {
  const { items } = await aggregateQueueItems(
    supabase,
    [
      statementRow(0, 361.61, '2026-05-03', 'AMAZON MKTPL*BJ6RR6ZJ0 Amzn.com/bill WA'),
      statementRow(1, 20.79, '2026-05-01', 'AMAZON MKTPL*BV1JS6MZ2 Amzn.com/bill WA'),
      statementRow(2, 38.47, '2026-05-01', 'AMAZON MKTPL*BJ3IM3GE1 Amzn.com/bill WA'),
    ],
    [orderEmail(420.87, SHIPMENTS)],
    filters
  )

  const merged = items.filter(i => i.source === 'merged')
  expect(merged).toHaveLength(3)

  // Each card keeps its own charge amount — the card was billed three times,
  // so three transactions are correct. Booking $420.87 once would misstate
  // both the dates and the per-charge amounts.
  expect(merged.map(i => i.statementTransaction.amount).sort((a, b) => a - b)).toEqual([
    20.79, 38.47, 361.61,
  ])

  // All three cite the same email as evidence, on distinct statement rows.
  for (const card of merged) {
    const parsed = parseImportId(card.id)
    expect(parsed).toMatchObject({ type: 'merged', emailId: EMAIL, statementId: STMT })
  }
  expect(new Set(merged.map(i => i.id)).size).toBe(3)

  // And the card says which shipment it is, so approving all three doesn't
  // read as double-counting one email.
  expect(merged.every(i => i.reasons.some(r => /^Shipment \d of 3 /.test(r)))).toBe(true)

  // The order email is no longer offered separately.
  expect(items.some(i => i.id === `email:${EMAIL}`)).toBe(false)
})

it('leaves everything unpaired when a shipment has no matching charge', async () => {
  const { items } = await aggregateQueueItems(
    supabase,
    [
      statementRow(0, 361.61, '2026-05-03', 'AMAZON MKTPL*BJ6RR6ZJ0 Amzn.com/bill WA'),
      statementRow(1, 20.79, '2026-05-01', 'AMAZON MKTPL*BV1JS6MZ2 Amzn.com/bill WA'),
      // The $38.47 shipment's charge is missing — a later statement, perhaps.
    ],
    [orderEmail(420.87, SHIPMENTS)],
    filters
  )

  // Retiring the email over two of three shipments would leave the third with
  // no evidence anywhere and no card to notice it by.
  expect(items.filter(i => i.source === 'merged')).toHaveLength(0)
  expect(items.some(i => i.id === `email:${EMAIL}`)).toBe(true)
  expect(items.filter(i => i.source === 'statement')).toHaveLength(2)
})
