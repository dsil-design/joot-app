/**
 * Call the aggregator with ONLY email 1 + stmt:56. If they don't merge in
 * this isolated setup, the bug is in the aggregator. If they DO merge,
 * something else in the full dataset is interfering.
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
const EMAIL_ID = '1e8a5b78-3e4d-4f1e-9111-309d739b9b73'
const STMT_KEY = 'stmt:984828e8-dead-4cde-bca2-9e9ce77f0aaf:56'

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

  const [statementItems, emailItems] = await Promise.all([
    fetchStatementQueueItems(supabase as any, USER_ID, filters),
    fetchEmailQueueItems(supabase as any, USER_ID, filters),
  ])

  const stmt56 = statementItems.find((i) => i.id === STMT_KEY)
  const email1 = emailItems.find((i) => i.id === `email:${EMAIL_ID}`)
  if (!stmt56 || !email1) {
    console.error('missing required items')
    return
  }

  console.log('--- Minimal aggregator call with only email 1 + stmt:56 ---')
  const result1 = await aggregateQueueItems(supabase as any, [stmt56], [email1], filters as any, [])
  console.log(`Got ${result1.items.length} items (stats: pending=${result1.stats.pending}, waiting=${result1.stats.waitingForStatementCount})`)
  for (const i of result1.items) {
    console.log(`  ${i.id}  source=${i.source}  status=${i.status}  date=${i.statementTransaction.date}`)
  }

  console.log('\n--- Same but adding ONE other statement item to allItems ---')
  const otherStmt = statementItems.find((i) => i.id !== STMT_KEY)!
  const result2 = await aggregateQueueItems(supabase as any, [stmt56, otherStmt], [email1], filters as any, [])
  console.log(`Got ${result2.items.length} items`)
  for (const i of result2.items) {
    if (i.id.includes(EMAIL_ID) || i.id.includes('stmt:984828e8-dead-4cde-bca2-9e9ce77f0aaf:56')) {
      console.log(`  ${i.id}  source=${i.source}  status=${i.status}`)
    }
  }

  console.log('\n--- Full aggregator call with all real inputs ---')
  const result3 = await aggregateQueueItems(supabase as any, statementItems, emailItems, filters as any, [])
  console.log(`Got ${result3.items.length} items`)
  const matches3 = result3.items.filter(
    (i) => i.id.includes(EMAIL_ID) || i.id.includes('stmt:984828e8-dead-4cde-bca2-9e9ce77f0aaf:56'),
  )
  console.log(`Matching email 1 or stmt:56: ${matches3.length}`)
  for (const i of matches3) {
    console.log(`  ${i.id}  source=${i.source}  status=${i.status}`)
  }

  // Now re-run with slips fetched AND backfills applied (matches the real route).
  console.log('\n--- With slips + backfillSlipTransactionMatches ---')
  const [statementItems2, emailItems2, slipItems2] = await Promise.all([
    fetchStatementQueueItems(supabase as any, USER_ID, filters),
    fetchEmailQueueItems(supabase as any, USER_ID, filters),
    fetchPaymentSlipQueueItems(supabase as any, USER_ID, filters),
  ])
  console.log(`slips fetched: ${slipItems2.length}`)
  const stmt56_pre = statementItems2.find((i) => i.id === STMT_KEY)
  const email1_pre = emailItems2.find((i) => i.id === `email:${EMAIL_ID}`)
  console.log(`pre-backfill email 1 matchedTransaction: ${email1_pre?.matchedTransaction?.id ?? 'null'}`)
  console.log(`pre-backfill stmt:56 matchedTransaction: ${stmt56_pre?.matchedTransaction?.id ?? 'null'}`)

  await backfillSlipTransactionMatches(supabase as any, USER_ID, emailItems2, statementItems2)

  const stmt56_postSlip = statementItems2.find((i) => i.id === STMT_KEY)
  const email1_postSlip = emailItems2.find((i) => i.id === `email:${EMAIL_ID}`)
  console.log(`post-slip-backfill email 1 matchedTransaction: ${email1_postSlip?.matchedTransaction?.id ?? 'null'}`)
  console.log(`post-slip-backfill stmt:56 matchedTransaction: ${stmt56_postSlip?.matchedTransaction?.id ?? 'null'}`)

  await backfillStatementBacklinks(supabase as any, USER_ID, statementItems2)

  const stmt56_postBacklink = statementItems2.find((i) => i.id === STMT_KEY)
  console.log(`post-statement-backlink stmt:56 matchedTransaction: ${stmt56_postBacklink?.matchedTransaction?.id ?? 'null'}`)

  const result4 = await aggregateQueueItems(supabase as any, statementItems2, emailItems2, filters as any, slipItems2)
  console.log(`After backfills + aggregator: ${result4.items.length} items`)
  const matches4 = result4.items.filter(
    (i) => i.id.includes(EMAIL_ID) || i.id.includes('stmt:984828e8-dead-4cde-bca2-9e9ce77f0aaf:56'),
  )
  console.log(`Matching email 1 or stmt:56 in result: ${matches4.length}`)
  for (const i of matches4) {
    console.log(`  ${i.id}  source=${i.source}  status=${i.status}  matched=${i.matchedTransaction?.id ?? 'null'}`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
