/**
 * Retail order line items → ProposalInput
 *
 * `email_transactions.description` keeps only the first product name of an
 * order (and, for a multi-shipment Amazon order, the *same* first name on
 * every shipment). Naming what was actually bought needs the whole item list,
 * so it is re-read from the stored email body at proposal time.
 *
 * Deriving it here rather than persisting it keeps every existing email
 * eligible immediately — no schema change, no re-extraction pass that would
 * disturb rows already matched and imported.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { extractSubOrderLineItems } from '@/lib/email/extractors/amazon'
import { extractOrderItems as extractLazadaItems } from '@/lib/email/extractors/lazada'
import type { RetailOrderItem } from './retail-descriptions'
import type { ProposalInput } from './types'

/** Tolerance when matching a charge to the sub-order block that produced it. */
const AMOUNT_EPSILON = 0.02

/**
 * Load the line items behind every retail-order input and hang them off the
 * input. Silent no-op for non-retail items and for emails whose body is no
 * longer stored — the description proposers all treat items as optional.
 *
 * `inputs` is mutated in place, as with `attachExtraSourceContext`.
 */
export async function attachRetailOrderContext(
  supabase: SupabaseClient,
  userId: string,
  inputs: ProposalInput[]
): Promise<void> {
  const targets = inputs.filter((i) => !!i.emailTransactionId && !!senderFormat(i))
  if (targets.length === 0) return

  const emailTxIds = Array.from(new Set(targets.map((i) => i.emailTransactionId!)))

  const { data: txRows } = await supabase
    .from('email_transactions')
    .select('id, folder, uid')
    .eq('user_id', userId)
    .in('id', emailTxIds)

  if (!txRows || txRows.length === 0) return

  type TxRow = { id: string; folder: string; uid: number }
  const rows = txRows as TxRow[]

  // `emails` is keyed by (folder, uid); PostgREST can't express a composite
  // IN, so fetch by uid and filter the folder client-side.
  const { data: bodyRows } = await supabase
    .from('emails')
    .select('folder, uid, text_body')
    .in('uid', Array.from(new Set(rows.map((r) => r.uid))))

  if (!bodyRows || bodyRows.length === 0) return

  const bodyByKey = new Map<string, string>()
  for (const row of bodyRows as Array<{ folder: string; uid: number; text_body: string | null }>) {
    if (row.text_body) bodyByKey.set(`${row.folder}:${row.uid}`, row.text_body)
  }

  const bodyByTxId = new Map<string, string>()
  for (const row of rows) {
    const body = bodyByKey.get(`${row.folder}:${row.uid}`)
    if (body) bodyByTxId.set(row.id, body)
  }

  for (const input of targets) {
    const body = bodyByTxId.get(input.emailTransactionId!)
    if (!body) continue
    const items = extractItemsForInput(input, body)
    if (items.length > 0) input.retailOrderItems = items
  }
}

/**
 * Which merchant's body layout to read, by parser key or by sender.
 *
 * The sender check matters because a receipt that fell through to the AI
 * fallback still has an Amazon body — the parser key only records who won the
 * parse, not who wrote the mail.
 */
function senderFormat(input: ProposalInput): 'amazon' | 'lazada' | null {
  if (input.parserKey === 'amazon' || input.parserKey === 'lazada') return input.parserKey
  const sender = `${input.fromAddress ?? ''} ${input.fromName ?? ''}`.toLowerCase()
  if (/amazon/.test(sender)) return 'amazon'
  if (/lazada/.test(sender)) return 'lazada'
  return null
}

/**
 * Pull the items for one input out of its email body.
 *
 * For Amazon the body holds one block per shipment, each with its own Grand
 * Total — and a merged queue card represents a single shipment's charge, so
 * the block whose total equals the charge is the only relevant one. Falling
 * back to every item would describe a $20.31 charge with $75.76 of goods.
 */
function extractItemsForInput(input: ProposalInput, body: string): RetailOrderItem[] {
  const format = senderFormat(input)

  if (format === 'amazon') {
    const blocks = extractSubOrderLineItems(body)
    if (blocks.length === 0) return []

    const charge = Math.abs(input.amount)
    const match = blocks.find(
      (b) => b.amount != null && Math.abs(b.amount - charge) <= AMOUNT_EPSILON
    )
    if (match) return match.items

    // One block, or no block total that matches: the charge covers the whole
    // email (single-shipment order, or an amount we can't decompose).
    if (blocks.length === 1) return blocks[0].items
    return []
  }

  if (format === 'lazada') {
    return extractLazadaItems(body).map((i) => ({
      name: i.name,
      quantity: i.quantity,
      amount: i.amount,
      currency: input.currency,
    }))
  }

  return []
}
