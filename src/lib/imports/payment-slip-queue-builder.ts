import { SupabaseClient } from '@supabase/supabase-js'
import { makePaymentSlipId } from '@/lib/utils/import-id'
import type { QueueItem, PaymentSlipMetadata } from './queue-types'
import { fetchMatchedTransactions } from './fetch-matched-transactions'

interface SlipFilters {
  currencyFilter?: string
  searchQuery?: string
  fromDate?: string
  toDate?: string
}

export async function fetchPaymentSlipQueueItems(
  supabase: SupabaseClient,
  userId: string,
  _filters: SlipFilters = {}
): Promise<QueueItem[]> {
  const { data: slips, error: fetchError } = await supabase
    .from('payment_slip_uploads')
    .select(`
      id, filename, status, review_status,
      transaction_date, amount, currency, fee,
      sender_name, sender_bank, sender_account,
      recipient_name, recipient_bank, recipient_account,
      bank_detected, transaction_reference, memo,
      detected_direction, extraction_confidence,
      matched_transaction_id, match_confidence,
      rejected_pair_keys,
      payment_method_id,
      extraction_completed_at,
      payment_methods (
        id,
        name,
        type
      )
    `)
    .eq('user_id', userId)
    .in('status', ['ready_for_review', 'done'])
    .order('extraction_completed_at', { ascending: false })

  if (fetchError) {
    console.error('Failed to fetch payment slips:', fetchError)
    throw new Error('Failed to fetch payment slip queue items')
  }

  if (!slips || slips.length === 0) return []

  // ── Deduplicate slips with the same transaction reference ────────────
  // Different photos of the same bank transfer share a transaction_reference.
  // Keep the best extraction (highest confidence, then most recent) and skip the rest.
  const dedupedSlips = deduplicateByTransactionRef(slips)

  // Fetch matched transactions (batched to avoid URL-length errors with large ID sets)
  const matchedIds = dedupedSlips
    .map(s => s.matched_transaction_id)
    .filter((id): id is string => !!id)

  const matchedMap = await fetchMatchedTransactions(supabase, matchedIds)

  const items: QueueItem[] = []

  for (const slip of dedupedSlips) {
    if (!slip.amount || !slip.transaction_date) continue

    const id = makePaymentSlipId(slip.id)
    const confidence = slip.extraction_confidence ?? 0
    const pm = slip.payment_methods as { id: string; name: string; type?: string } | null

    let confidenceLevel: 'high' | 'medium' | 'low' | 'none' = 'none'
    if (confidence >= 90) confidenceLevel = 'high'
    else if (confidence >= 55) confidenceLevel = 'medium'
    else if (confidence > 0) confidenceLevel = 'low'

    // Build description from slip data
    const direction = slip.detected_direction === 'income' ? 'From' : 'To'
    const counterparty = slip.detected_direction === 'income'
      ? slip.sender_name
      : slip.recipient_name
    const description = slip.memo
      || `${direction} ${counterparty || 'unknown'}`

    let matchedTransactionData: QueueItem['matchedTransaction'] = undefined
    if (slip.matched_transaction_id) {
      const enriched = matchedMap.get(slip.matched_transaction_id)
      if (enriched) {
        matchedTransactionData = {
          id: enriched.id,
          date: enriched.transaction_date,
          amount: Number(enriched.amount),
          currency: enriched.original_currency,
          vendor_name: enriched.vendors?.name,
          description: enriched.description ?? undefined,
          payment_method_name: enriched.payment_methods?.name,
        }
      }
    }

    const slipMeta: PaymentSlipMetadata = {
      senderName: slip.sender_name ?? undefined,
      recipientName: slip.recipient_name ?? undefined,
      bankDetected: slip.bank_detected ?? undefined,
      transactionReference: slip.transaction_reference ?? undefined,
      memo: slip.memo ?? undefined,
      detectedDirection: slip.detected_direction as 'expense' | 'income' | 'transfer' | null,
      slipUploadId: slip.id,
    }

    const reasons: string[] = []
    if (slip.bank_detected) reasons.push(`Bank: ${slip.bank_detected}`)
    if (slip.detected_direction) reasons.push(`Direction: ${slip.detected_direction}`)
    if (slip.matched_transaction_id) reasons.push('Matched to existing transaction')

    items.push({
      id,
      statementFilename: slip.filename,
      paymentMethod: pm ? { id: pm.id, name: pm.name } : null,
      statementTransaction: {
        date: slip.transaction_date,
        description,
        amount: Number(slip.amount),
        currency: slip.currency || 'THB',
        sourceFilename: slip.filename,
      },
      matchedTransaction: matchedTransactionData,
      confidence,
      confidenceLevel,
      reasons,
      isNew: !slip.matched_transaction_id,
      status: slip.review_status as 'pending' | 'approved' | 'rejected',
      rejectedPairKeys: (slip.rejected_pair_keys as string[] | undefined) || undefined,
      source: 'payment_slip',
      paymentSlipMetadata: slipMeta,
    })
  }

  return items
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SlipRow = Record<string, any>

/**
 * Deduplicate slip rows that share the same transaction_reference.
 * Keeps the one with the highest extraction_confidence (ties broken by most recent extraction).
 * Slips without a transaction_reference are always kept (can't determine duplication).
 */
function deduplicateByTransactionRef(slips: SlipRow[]): SlipRow[] {
  const groups = new Map<string, SlipRow[]>()
  const unique: SlipRow[] = []

  for (const slip of slips) {
    const ref = slip.transaction_reference as string | null
    if (!ref) {
      unique.push(slip)
      continue
    }
    const existing = groups.get(ref)
    if (existing) {
      existing.push(slip)
    } else {
      groups.set(ref, [slip])
    }
  }

  for (const group of groups.values()) {
    // Sort: approved first, then highest confidence, then most recent
    group.sort((a, b) => {
      // Approved/done slips take priority over pending
      const aApproved = a.review_status === 'approved' ? 1 : 0
      const bApproved = b.review_status === 'approved' ? 1 : 0
      if (bApproved !== aApproved) return bApproved - aApproved

      const confDiff = (b.extraction_confidence ?? 0) - (a.extraction_confidence ?? 0)
      if (confDiff !== 0) return confDiff

      return (b.extraction_completed_at ?? '').localeCompare(a.extraction_completed_at ?? '')
    })
    unique.push(group[0])
  }

  return unique
}
