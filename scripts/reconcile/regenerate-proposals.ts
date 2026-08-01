/**
 * MUTATES PROPOSALS — and only proposals. Never creates, approves, rejects,
 * or links a transaction.
 *
 * Regenerates the pending proposals for a month's unresolved cards using the
 * current proposal engine (use after engine fixes), and marks orphaned
 * pending proposals (composite_id absent from the current queue) stale.
 *
 * Usage: npx tsx scripts/reconcile/regenerate-proposals.ts 2026-05
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

import { fetchStatementQueueItems } from '../../src/lib/imports/statement-queue-builder'
import { fetchEmailQueueItems } from '../../src/lib/imports/email-queue-builder'
import { fetchPaymentSlipQueueItems } from '../../src/lib/imports/payment-slip-queue-builder'
import { aggregateQueueItems } from '../../src/lib/imports/queue-aggregator'
import { generateAndStoreProposals, markStaleProposals } from '../../src/lib/proposals/proposal-service'
import type { ProposalInput } from '../../src/lib/proposals/types'
import type { QueueItem } from '../../src/lib/imports/queue-types'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const month = process.argv[2] || '2026-05'
const [y, m] = month.split('-').map(Number)
const fromDate = `${month}-01`
const toDate = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10)

function toProposalInput(item: QueueItem): ProposalInput {
  const parts = item.id.split(':')
  const emailMeta = item.emailMetadata
  const mergedEmail = item.mergedEmailData
  const slipMeta = item.paymentSlipMetadata
  const isMerged = item.source === 'merged'
  const isSlip = item.source === 'payment_slip'

  return {
    compositeId: item.id,
    sourceType: item.source || 'statement',
    statementUploadId: item.statementUploadId || (parts[0] === 'stmt' ? parts[1] : undefined),
    suggestionIndex: parts[0] === 'stmt' ? parseInt(parts[2], 10) : undefined,
    emailTransactionId: parts[0] === 'email' ? parts[1] : undefined,
    description: (isMerged && mergedEmail?.description)
      ? mergedEmail.description
      : (isMerged && item.mergedPaymentSlipData?.description)
        ? item.mergedPaymentSlipData.description
        : item.statementTransaction.description,
    amount: item.statementTransaction.amount,
    currency: item.statementTransaction.currency,
    date: item.statementTransaction.date,
    paymentMethodId: item.paymentMethod?.id,
    paymentMethodName: item.paymentMethod?.name,
    subject: emailMeta?.subject,
    fromAddress: emailMeta?.fromAddress,
    fromName: emailMeta?.fromName,
    vendorId: emailMeta?.vendorId,
    vendorNameRaw: emailMeta?.vendorNameRaw,
    parserKey: emailMeta?.parserKey,
    classification: emailMeta?.classification,
    extractionConfidence: emailMeta?.extractionConfidence,
    paymentCardLastFour: emailMeta?.paymentCardLastFour,
    paymentCardType: emailMeta?.paymentCardType,
    ...((isSlip || item.mergedPaymentSlipData) && {
      paymentSlipDescription: isSlip
        ? item.statementTransaction.description
        : item.mergedPaymentSlipData?.description,
    }),
    ...((isSlip || isMerged) && slipMeta && {
      paymentSlipUploadId: slipMeta.slipUploadId,
      senderName: slipMeta.senderName,
      recipientName: slipMeta.recipientName,
      bankDetected: slipMeta.bankDetected,
      detectedDirection: slipMeta.detectedDirection ?? undefined,
    }),
  }
}

async function main() {
  const { data: users } = await sb.from('users').select('id, email')
  const counts = await Promise.all((users || []).map(async (u) => {
    const { count } = await sb.from('transactions').select('*', { count: 'exact', head: true }).eq('user_id', u.id)
    return { id: u.id, email: u.email, count: count || 0 }
  }))
  counts.sort((a, b) => b.count - a.count)
  const userId = counts[0].id
  console.log(`User: ${counts[0].email}`)

  const filters = {
    statusFilter: 'all', currencyFilter: 'all', confidenceFilter: 'all',
    sourceFilter: 'all', searchQuery: '', fromDate, toDate, statementUploadId: undefined,
  }
  const [s, e, sl] = await Promise.all([
    fetchStatementQueueItems(sb as never, userId, filters),
    fetchEmailQueueItems(sb as never, userId, filters),
    fetchPaymentSlipQueueItems(sb as never, userId, filters),
  ])
  const result = await aggregateQueueItems(sb as never, s, e, filters as never, sl)
  const currentIds = new Set(result.items.map((i) => i.id))
  const unresolved = result.items.filter(
    (i) => (i.status === 'pending' || (i.status as string) === 'unset') && i.isNew
  )

  const { data: allProposals } = await sb
    .from('transaction_proposals')
    .select('composite_id, proposed_date, status')
    .eq('user_id', userId)
    .in('status', ['pending', 'accepted', 'modified', 'rejected'])
  const pendingProposals = (allProposals || []).filter((p) => p.status === 'pending')
  const userActedComposites = new Set(
    (allProposals || []).filter((p) => p.status !== 'pending').map((p) => p.composite_id)
  )

  // 1. Orphans: pending proposals in this month whose composite_id no longer
  //    matches any UNRESOLVED card in the (unfiltered, month-covering) queue
  //    → stale. Covers both regrouped/absent sources and cards that were
  //    resolved without their proposal (e.g. auto-linked by a backfill) —
  //    either way the pending proposal renders nowhere.
  const unresolvedIds = new Set(
    result.items
      .filter((i) => i.status === 'pending' || (i.status as string) === 'unset')
      .map((i) => i.id)
  )
  const orphanIds = pendingProposals
    .filter((p) => !unresolvedIds.has(p.composite_id)
      && p.proposed_date >= fromDate && p.proposed_date <= toDate)
    .map((p) => p.composite_id)
  if (orphanIds.length > 0) {
    const marked = await markStaleProposals(sb as never, userId, orphanIds)
    console.log(`Marked ${marked || orphanIds.length} orphaned proposals stale`)
  } else {
    console.log('No orphaned proposals')
  }

  // 2. Regenerate: unresolved cards with a pending proposal (rebuilt with
  //    the current engine) or none at all. Cards the user already acted on
  //    (accepted/modified/rejected proposal) are left alone — force would
  //    otherwise resurrect a rejected proposal.
  const targets = unresolved.filter((i) => !userActedComposites.has(i.id))
  const inputs = targets.map(toProposalInput)

  console.log(`Regenerating proposals for ${inputs.length} unresolved cards...`)
  const gen = await generateAndStoreProposals(sb as never, userId, inputs, { force: true })
  console.log(`Generated ${gen.generated} (rule-only ${gen.ruleOnly}, LLM-enhanced ${gen.llmEnhanced}), errors ${gen.errors}`)
  if (gen.failedCompositeIds.length > 0) {
    console.log('Failed composite ids:')
    for (const id of gen.failedCompositeIds) console.log(`  ${id}`)
  }
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1) })
