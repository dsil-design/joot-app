/**
 * Find the slip-derived transaction that backfillSlipTransactionMatches
 * auto-linked email 1 to, and identify the corresponding slip queue item.
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const MATCHED_TXN = '6cbeced7-a3ce-482a-8b68-bc64b21501c6'

async function main() {
  const { data: txn } = await supabase
    .from('transactions')
    .select(
      'id, transaction_date, amount, original_currency, description, source_payment_slip_id, source_email_transaction_id, source_statement_upload_id, source_statement_suggestion_index, vendor_id',
    )
    .eq('id', MATCHED_TXN)
    .single()
  console.log('Matched transaction:')
  console.log(JSON.stringify(txn, null, 2))

  if (txn?.source_payment_slip_id) {
    const { data: slip } = await supabase
      .from('payment_slip_uploads')
      .select('id, filename, status, review_status, matched_transaction_id, match_confidence, manual_pair_keys, transaction_date, amount, currency, sender_name, recipient_name')
      .eq('id', txn.source_payment_slip_id)
      .single()
    console.log('\nSlip:')
    console.log(JSON.stringify(slip, null, 2))
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
