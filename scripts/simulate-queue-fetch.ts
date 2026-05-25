/**
 * Simulate a real /api/imports/queue fetch end-to-end (without HTTP/auth)
 * for the exact URL the user is on:
 *   /review?from=2026-04-01&to=2026-04-30
 *
 * Reports what items the aggregator returns, with special attention to
 * whether the manually-paired Apr 8 ($8.17) Grab transaction surfaces.
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

import { fetchStatementQueueItems } from '../src/lib/imports/statement-queue-builder'
import { fetchEmailQueueItems } from '../src/lib/imports/email-queue-builder'
import { fetchPaymentSlipQueueItems } from '../src/lib/imports/payment-slip-queue-builder'
import { aggregateQueueItems } from '../src/lib/imports/queue-aggregator'
import { backfillSlipTransactionMatches } from '../src/lib/imports/slip-transaction-backfill'
import { backfillStatementBacklinks } from '../src/lib/imports/statement-backlink-backfill'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const USER_ID = 'a1c3caff-a5de-4898-be7d-ab4b76247ae6'
const TARGET_EMAIL_ID = '1e8a5b78-3e4d-4f1e-9111-309d739b9b73'
const TARGET_STMT_KEY = 'stmt:984828e8-dead-4cde-bca2-9e9ce77f0aaf:56'

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

  console.log(`Fetched: ${statementItems.length} stmt items, ${emailItems.length} email items, ${paymentSlipItems.length} slip items`)

  // Did email 1 come back?
  const targetEmail = emailItems.find((i) => i.id === `email:${TARGET_EMAIL_ID}`)
  console.log(`\nEmail 1 in emailItems? ${targetEmail ? 'YES' : 'NO'}`)
  if (targetEmail) {
    console.log(`  status: ${targetEmail.status}`)
    console.log(`  waitingForStatement: ${targetEmail.waitingForStatement}`)
    console.log(`  manualPairKeys: ${JSON.stringify(targetEmail.manualPairKeys)}`)
    console.log(`  date: ${targetEmail.statementTransaction.date}`)
  }

  const targetStmt = statementItems.find((i) => i.id === TARGET_STMT_KEY)
  console.log(`\nStmt suggestion 56 in statementItems? ${targetStmt ? 'YES' : 'NO'}`)
  if (targetStmt) {
    console.log(`  status: ${targetStmt.status}`)
    console.log(`  date: ${targetStmt.statementTransaction.date}`)
    console.log(`  amount: ${targetStmt.statementTransaction.amount} ${targetStmt.statementTransaction.currency}`)
  }

  await backfillSlipTransactionMatches(supabase as any, USER_ID, emailItems, statementItems)
  await backfillStatementBacklinks(supabase as any, USER_ID, statementItems)

  const result = await aggregateQueueItems(supabase as any, statementItems, emailItems, filters as any, paymentSlipItems)

  console.log(`\nAggregator returned ${result.items.length} items (total ${result.total})`)
  console.log(`Stats: pending=${result.stats.pending}, total=${result.stats.total}, waiting=${result.stats.waitingForStatementCount}`)

  // Look for any item that mentions email 1 or stmt:56
  console.log(`\nItems mentioning email 1 (${TARGET_EMAIL_ID}) or stmt:56:`)
  for (const item of result.items) {
    if (item.id.includes(TARGET_EMAIL_ID) || item.id.includes(TARGET_STMT_KEY)) {
      console.log(`  ${item.id}`)
      console.log(`    source=${item.source}  status=${item.status}  isNew=${item.isNew}`)
      console.log(`    date=${item.statementTransaction.date}  ${item.statementTransaction.amount} ${item.statementTransaction.currency}`)
      console.log(`    reasons=${JSON.stringify(item.reasons?.slice(0, 2))}`)
    }
  }

  // Also: how many items have date in April that mention "GRAB"
  console.log(`\nAll April items with "GRAB" in description:`)
  for (const item of result.items) {
    if (
      item.statementTransaction.date.startsWith('2026-04') &&
      item.statementTransaction.description?.toUpperCase().includes('GRAB')
    ) {
      console.log(`  ${item.id}  ${item.statementTransaction.date}  ${item.statementTransaction.amount} ${item.statementTransaction.currency}  status=${item.status}`)
    }
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
