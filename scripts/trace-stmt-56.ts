/**
 * Trace what happens to stmt:984828e8...:56 and email 1e8a5b78... through the
 * aggregator. The simulation showed both inputs present but neither the
 * standalone stmt:56 NOR a merged item containing it survives to the output.
 *
 * We monkey-patch the aggregator phases by re-implementing the early steps
 * inline so we can print snapshots between each pass.
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

import { fetchStatementQueueItems } from '../src/lib/imports/statement-queue-builder'
import { fetchEmailQueueItems } from '../src/lib/imports/email-queue-builder'
import { fetchPaymentSlipQueueItems } from '../src/lib/imports/payment-slip-queue-builder'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const USER_ID = 'a1c3caff-a5de-4898-be7d-ab4b76247ae6'
const EMAIL_ID = '1e8a5b78-3e4d-4f1e-9111-309d739b9b73'
const STMT_KEY = 'stmt:984828e8-dead-4cde-bca2-9e9ce77f0aaf:56'

function snapshot(label: string, allItems: Array<{ id: string; source: string; status: string; matchedTransaction?: { id: string } }>) {
  const matchingItems = allItems.filter(
    (i) => i.id.includes(EMAIL_ID) || i.id.includes(STMT_KEY),
  )
  console.log(`\n[${label}] allItems=${allItems.length}  matching=${matchingItems.length}`)
  for (const i of matchingItems) {
    console.log(`    ${i.id}  source=${i.source}  status=${i.status}  matched=${i.matchedTransaction?.id ?? 'null'}`)
  }
}

async function main() {
  const filters = {
    statusFilter: 'all',
    currencyFilter: 'all',
    confidenceFilter: 'all',
    sourceFilter: 'all',
    searchQuery: '',
    fromDate: '2026-04-01',
    toDate: '2026-04-30',
    statementUploadId: undefined,
  }

  const [statementItems, emailItems, paymentSlipItems] = await Promise.all([
    fetchStatementQueueItems(supabase as any, USER_ID, filters),
    fetchEmailQueueItems(supabase as any, USER_ID, filters),
    fetchPaymentSlipQueueItems(supabase as any, USER_ID, filters),
  ])

  const allItems: any[] = [...statementItems, ...emailItems, ...paymentSlipItems]
  snapshot('initial fetch', allItems)

  // Print the matchedTransaction of stmt:56 to detect any back-link.
  const stmt56 = allItems.find((i) => i.id === STMT_KEY)
  if (stmt56) {
    console.log(`\nstmt:56 detailed:`)
    console.log(`  matchedTransaction:`, stmt56.matchedTransaction ?? 'null')
    console.log(`  status: ${stmt56.status}`)
    console.log(`  isNew: ${stmt56.isNew}`)
  }
  const email1 = allItems.find((i) => i.id === `email:${EMAIL_ID}`)
  if (email1) {
    console.log(`\nemail 1 detailed:`)
    console.log(`  matchedTransaction:`, email1.matchedTransaction ?? 'null')
    console.log(`  status: ${email1.status}`)
    console.log(`  manualPairKeys:`, email1.manualPairKeys)
    console.log(`  waitingForStatement: ${email1.waitingForStatement}`)
  }

  // Also: any OTHER item in allItems that already references the same
  // matched transaction as email 1 or stmt:56 — i.e., something the dedup
  // pass would consolidate it with.
  console.log(`\nLooking for items sharing matched_transaction with email 1 or stmt:56:`)
  for (const i of allItems) {
    if (!i.matchedTransaction?.id) continue
    if (i.id === STMT_KEY || i.id === `email:${EMAIL_ID}`) continue
    // No-op — we already know neither has matched yet — but check siblings.
  }

  // Now: look up via DB whether any OTHER queue source row references
  // the email or stmt:56 by ID — e.g., a payment slip with a manual pair into
  // stmt:56, or a different email with manualPairKeys containing stmt:56.
  const { data: collidingEmails } = await supabase
    .from('email_transactions')
    .select('id, status, manual_pair_keys, transaction_date')
    .eq('user_id', USER_ID)
    .overlaps('manual_pair_keys', [STMT_KEY])
  console.log(`\nEmails with manual_pair_keys containing ${STMT_KEY}:`)
  for (const e of collidingEmails ?? []) {
    console.log(`  ${e.id}  status=${e.status}  date=${e.transaction_date}  keys=${JSON.stringify(e.manual_pair_keys)}`)
  }

  const { data: collidingSlips } = await supabase
    .from('payment_slip_uploads')
    .select('id, status, manual_pair_keys, transaction_date')
    .eq('user_id', USER_ID)
    .overlaps('manual_pair_keys', [STMT_KEY])
  console.log(`\nSlips with manual_pair_keys containing ${STMT_KEY}:`)
  for (const s of collidingSlips ?? []) {
    console.log(`  ${s.id}  status=${s.status}  date=${s.transaction_date}  keys=${JSON.stringify(s.manual_pair_keys)}`)
  }

  // Also: is there ANY transaction whose source_email/slip/stmt fields reference these?
  const { data: txnsSourcingStmt } = await supabase
    .from('transactions')
    .select('id, transaction_date, original_amount, source_email_transaction_id, source_payment_slip_upload_id, source_statement_upload_id, source_statement_suggestion_index')
    .eq('source_statement_upload_id', '984828e8-dead-4cde-bca2-9e9ce77f0aaf')
    .eq('source_statement_suggestion_index', 56)
  console.log(`\nTransactions whose source is stmt:...:56:`)
  console.log(JSON.stringify(txnsSourcingStmt, null, 2))

  const { data: txnsSourcingEmail } = await supabase
    .from('transactions')
    .select('id, transaction_date, original_amount, source_email_transaction_id, source_payment_slip_upload_id, source_statement_upload_id, source_statement_suggestion_index')
    .eq('source_email_transaction_id', EMAIL_ID)
  console.log(`\nTransactions whose source is email 1:`)
  console.log(JSON.stringify(txnsSourcingEmail, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
