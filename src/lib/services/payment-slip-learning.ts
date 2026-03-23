/**
 * Payment Slip Vendor-Recipient Learning
 *
 * Learns vendor associations from payment slip sender/recipient names
 * when slips are linked to or create transactions with vendors.
 *
 * For expense slips (user paid someone): learns recipient_name → vendor
 * For income slips (user received money): learns sender_name → vendor
 *
 * Reuses the same vendor_recipient_mappings table as email learning.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { upsertMapping } from './vendor-recipient-mapping'

/**
 * Learn a vendor mapping from a payment slip when it gets linked to a transaction.
 * Fire-and-forget — errors are logged but don't block the caller.
 */
export async function learnPaymentSlipMapping(
  supabase: SupabaseClient,
  userId: string,
  slipId: string,
  transactionId: string
): Promise<void> {
  // Fetch slip details
  const { data: slip } = await supabase
    .from('payment_slip_uploads')
    .select('sender_name, recipient_name, bank_detected, detected_direction')
    .eq('id', slipId)
    .eq('user_id', userId)
    .single()

  if (!slip?.bank_detected) return

  // Determine counterparty: income → sender is the counterparty, expense → recipient
  const counterpartyName = slip.detected_direction === 'income'
    ? slip.sender_name
    : slip.recipient_name

  if (!counterpartyName) return

  // Fetch the linked transaction's vendor_id
  const { data: transaction } = await supabase
    .from('transactions')
    .select('vendor_id')
    .eq('id', transactionId)
    .eq('user_id', userId)
    .single()

  if (!transaction?.vendor_id) return

  // Record the mapping (reuses email learning infrastructure)
  await upsertMapping(
    supabase,
    userId,
    counterpartyName,
    transaction.vendor_id,
    slip.bank_detected
  )
}
