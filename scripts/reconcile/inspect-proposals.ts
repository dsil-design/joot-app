/**
 * READ ONLY. Dump every proposal attached to the unresolved queue cards for a
 * month, next to the source data it was derived from, so the two can be compared.
 *
 * Usage: npx tsx scripts/reconcile/inspect-proposals.ts 2026-05
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

import { fetchStatementQueueItems } from '../../src/lib/imports/statement-queue-builder'
import { fetchEmailQueueItems } from '../../src/lib/imports/email-queue-builder'
import { fetchPaymentSlipQueueItems } from '../../src/lib/imports/payment-slip-queue-builder'
import { aggregateQueueItems } from '../../src/lib/imports/queue-aggregator'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const month = process.argv[2] || '2026-05'
const [y, m] = month.split('-').map(Number)
const fromDate = `${month}-01`
const toDate = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10)

async function main() {
  const { data: users } = await sb.from('users').select('id, email')
  const counts = await Promise.all((users || []).map(async (u) => {
    const { count } = await sb.from('transactions').select('*', { count: 'exact', head: true }).eq('user_id', u.id)
    return { id: u.id, count: count || 0 }
  }))
  counts.sort((a, b) => b.count - a.count)
  const userId = counts[0].id

  const [vendors, pms, tags] = await Promise.all([
    sb.from('vendors').select('id, name').eq('user_id', userId),
    sb.from('payment_methods').select('id, name, preferred_currency').eq('user_id', userId),
    sb.from('tags').select('id, name').eq('user_id', userId),
  ])
  const vName = new Map((vendors.data || []).map((v) => [v.id, v.name]))
  const pName = new Map((pms.data || []).map((p) => [p.id, p.name]))
  const tName = new Map((tags.data || []).map((t) => [t.id, t.name]))

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
  const unresolved = result.items.filter((i) => i.status === 'pending' || i.status === 'unset')

  const { data: proposals } = await sb
    .from('transaction_proposals')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['pending'])
  const byComposite = new Map((proposals || []).map((p) => [p.composite_id, p]))

  const withProposal = unresolved.filter((i) => byComposite.has(i.id))
  const withoutProposal = unresolved.filter((i) => !byComposite.has(i.id))
  const orphanProposals = (proposals || []).filter(
    (p) => !unresolved.some((i) => i.id === p.composite_id) && p.proposed_date >= fromDate && p.proposed_date <= toDate
  )

  console.log(`\n${month}: ${unresolved.length} unresolved cards`)
  console.log(`  ${withProposal.length} have a pending proposal`)
  console.log(`  ${withoutProposal.length} have none`)
  console.log(`  ${orphanProposals.length} pending proposals point at a composite_id that is no longer in the queue\n`)

  console.log('='.repeat(100))
  console.log('CARDS WITH A PROPOSAL — source data vs what the proposal would create')
  console.log('='.repeat(100))
  for (const i of withProposal) {
    const p = byComposite.get(i.id)!
    const st = i.statementTransaction
    console.log(`\n${st?.date}  ${i.source}  conf=${i.confidence ?? '-'}  ${i.id.slice(0, 78)}`)
    console.log(`  SOURCE   ${String(st?.amount).padStart(11)} ${st?.currency}  "${(st?.description || '').slice(0, 60)}"`)
    if (i.emailData) console.log(`    email  ${i.emailData.amount ?? '-'} ${i.emailData.currency ?? '-'}  "${(i.emailData.subject || '').slice(0, 55)}"  vendor=${i.emailData.vendorName ?? '-'}`)
    if (i.paymentSlipData) console.log(`    slip   ${i.paymentSlipData.amount ?? '-'} ${i.paymentSlipData.currency ?? '-'}  recipient=${i.paymentSlipData.recipientName ?? '-'}`)
    console.log(`  PROPOSAL ${String(p.proposed_amount).padStart(11)} ${p.proposed_currency}  ${p.proposed_transaction_type}  ${p.proposed_date}`)
    console.log(`           vendor=${p.proposed_vendor_id ? vName.get(p.proposed_vendor_id) : `(new) ${p.proposed_vendor_name_suggestion ?? '—'}`}`)
    console.log(`           pm=${p.proposed_payment_method_id ? pName.get(p.proposed_payment_method_id) : '—'}  tags=[${(p.proposed_tag_ids || []).map((t: string) => tName.get(t)).join(', ')}]`)
    console.log(`           desc="${(p.proposed_description || '').slice(0, 70)}"`)
    console.log(`           engine=${p.engine} overall=${p.overall_confidence} fields=${JSON.stringify(p.field_confidence).slice(0, 150)}`)
  }

  console.log(`\n${'='.repeat(100)}`)
  console.log(`CARDS WITH NO PROPOSAL (${withoutProposal.length})`)
  console.log('='.repeat(100))
  for (const i of withoutProposal) {
    const st = i.statementTransaction
    console.log(`  ${st?.date} ${String(st?.amount).padStart(11)} ${(st?.currency || '').padEnd(4)} ${i.source.padEnd(13)} ${(st?.description || '').slice(0, 55)}`)
  }

  if (orphanProposals.length) {
    console.log(`\n${'='.repeat(100)}`)
    console.log(`ORPHANED PENDING PROPOSALS (${orphanProposals.length}) — would never surface on a card`)
    console.log('='.repeat(100))
    for (const p of orphanProposals) {
      console.log(`  ${p.proposed_date} ${String(p.proposed_amount).padStart(11)} ${p.proposed_currency} ${p.source_type.padEnd(13)} "${(p.proposed_description || '').slice(0, 50)}"  ${p.composite_id.slice(0, 60)}`)
    }
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
