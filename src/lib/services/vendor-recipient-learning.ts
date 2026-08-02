/**
 * Vendor-Recipient Learning
 *
 * Automatically learns "this extracted name is this vendor" associations when
 * an email gets linked to a transaction that has a vendor.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { upsertMapping } from './vendor-recipient-mapping'

/**
 * Learn a vendor-recipient mapping when an email_transaction gets linked to a
 * transaction. Records for any parser, keyed on (vendor_name_raw, parser_key).
 *
 * This used to be gated to the bank-transfer parsers (K-Bank, Bangkok Bank),
 * which meant a merchant whose receipts arrive by email taught the system
 * nothing however often the same link was confirmed: twenty months of "Xfinity"
 * receipts linked to the Xfinity vendor, and the twenty-first still proposed a
 * fuzzy guess. The gate was never load-bearing — the mapping key is the
 * extracted merchant/recipient name, which is as well-defined for `ai-fallback`
 * as it is for `kasikorn`. What must stay narrow is the *source* of the fact:
 * only a link the user actually confirmed, never a guess.
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

  if (!emailTx?.vendor_name_raw || !emailTx.parser_key) return

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
