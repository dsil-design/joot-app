/**
 * Consolidation-pass ID shape.
 *
 * The case these exist for: a Thai coffee purchase arrived as three sources —
 * a K PLUS payment slip, a K PLUS bill-payment email, and the card statement
 * row that settled in USD. The pairing heuristics can't join them (the
 * statement is a different currency/amount), but all three had already been
 * auto-linked to the same Joot transaction, so the consolidation pass folded
 * them into one card.
 *
 * That pass builds the card's ID from "whatever sources we have", and its
 * branch ladder had no 3-way case — a slip+email+stmt group fell into the
 * `emailItem && stmtItem` branch and produced a 2-way ID with the slip UUID
 * dropped. The card still rendered a "From Payment Slip" section, but
 * parseImportId reported type 'merged', so the slip's preview guard silently
 * no-opped and its eye button did nothing.
 */

import { aggregateQueueItems } from '@/lib/imports/queue-aggregator'
import { parseImportId } from '@/lib/utils/import-id'
import type { QueueItem, QueueFilters } from '@/lib/imports/queue-types'

const SLIP = '11111111-1111-1111-1111-111111111111'
const EMAIL = '22222222-2222-2222-2222-222222222222'
const STMT = '33333333-3333-3333-3333-333333333333'
const TXN = '44444444-4444-4444-4444-444444444444'

/** The aggregator's Supabase lookups aren't reached by this scenario. */
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

function source(
  id: string,
  src: 'statement' | 'email' | 'payment_slip',
  amount: number,
  currency: string
): QueueItem {
  return {
    id,
    source: src,
    statementTransaction: {
      date: '2026-05-27',
      description: 'BCR-INTHANIN S G G 2023',
      amount,
      currency,
    },
    // All three were independently auto-linked to the same Joot transaction —
    // this is what makes the consolidation pass group them.
    matchedTransaction: { id: TXN, date: '2026-05-27', amount: 120, currency: 'THB' },
    confidence: 100,
    confidenceLevel: 'high',
    reasons: [],
    isNew: false,
    status: 'pending',
  } as unknown as QueueItem
}

it('encodes the slip in the ID when slip+email+statement consolidate into one card', async () => {
  const { items } = await aggregateQueueItems(
    supabase,
    [source(`stmt:${STMT}:0`, 'statement', 3.5, 'USD')],
    [source(`email:${EMAIL}`, 'email', 120, 'THB')],
    filters,
    [source(`slip:${SLIP}`, 'payment_slip', 395, 'THB')]
  )

  expect(items).toHaveLength(1)
  const card = items[0]

  // Guard that this exercises the consolidation pass and not one of the
  // earlier pairing phases, which build their 3-way IDs separately.
  expect(card.reasons).toContain('Consolidated from 3 sources matching same transaction')

  // The card renders a "From Payment Slip" section...
  expect(card.mergedPaymentSlipData).toBeDefined()

  // ...so its ID has to carry the slip, or every slip-scoped action on the
  // card (preview, source link, approve/reject bookkeeping) silently no-ops.
  expect(parseImportId(card.id)).toEqual({
    type: 'merged_slip_email_stmt',
    slipId: SLIP,
    emailId: EMAIL,
    statementId: STMT,
    index: 0,
  })
})
