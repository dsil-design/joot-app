/**
 * Vendor-Recipient Learning
 *
 * Automatically learns vendor-recipient associations when bank transfer
 * emails get linked to transactions with vendors.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { isBankParser, upsertMapping } from './vendor-recipient-mapping'

/**
 * Learn a vendor-recipient mapping when an email_transaction gets linked to a transaction.
 * Only records mappings for bank transfer emails (K-Bank, Bangkok Bank) where
 * the transaction has a vendor_id and the email has a vendor_name_raw.
 */
export async function learnVendorRecipientMapping(
  supabase: SupabaseClient,
  userId: string,
  emailTransactionId: string,
  transactionId: string
): Promise<void> {
  // Fetch email_transaction details
  const { data: emailTx } = await supabase
    .from('email_transactions')
    .select('vendor_name_raw, parser_key')
    .eq('id', emailTransactionId)
    .eq('user_id', userId)
    .single()

  if (!emailTx?.vendor_name_raw || !isBankParser(emailTx.parser_key)) return

  // Fetch the linked transaction's vendor_id
  const { data: transaction } = await supabase
    .from('transactions')
    .select('vendor_id')
    .eq('id', transactionId)
    .eq('user_id', userId)
    .single()

  if (!transaction?.vendor_id) return

  // Record the mapping
  await upsertMapping(
    supabase,
    userId,
    emailTx.vendor_name_raw,
    transaction.vendor_id,
    emailTx.parser_key
  )
}
