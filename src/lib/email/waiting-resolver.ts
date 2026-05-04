import type { SupabaseClient } from '@supabase/supabase-js'
import { rankMatches } from '@/lib/matching/match-ranker'
import type { SourceTransaction, TargetTransaction } from '@/lib/matching/match-scorer'
import { CONFIDENCE_THRESHOLDS } from '@/lib/matching/match-scorer'
import { groupRowsIntoBundles } from '@/lib/matching/email-bundler'
import { scoreBundleAgainstTargets } from '@/lib/matching/bundle-scorer'

interface ResolveResult {
  resolved: number
  stillWaiting: number
}

/**
 * Resolves unmatched email transactions against existing transactions.
 *
 * Called after a statement is processed. Finds email transactions in
 * "waiting_for_statement" or "ready_to_import" status that overlap with
 * the statement period, runs match scoring, and writes match suggestions
 * (the user still approves manually in the review queue).
 *
 * For split-receipt vendors (e.g. Lazada), bundles of sibling emails that
 * arrived in the same window are scored as a combined source first. When a
 * bundle wins, every member email gets the same `matched_transaction_id`,
 * mirroring the production precedent where multiple Lazada orders share one
 * card charge.
 */
export async function resolveWaitingEmailTransactions(
  userId: string,
  periodStart: string,
  periodEnd: string,
  supabase: SupabaseClient
): Promise<ResolveResult> {
  const { data: waitingEmails, error: fetchError } = await supabase
    .from('email_transactions')
    .select(`
      id, user_id, amount, currency, transaction_date, email_date, from_address,
      vendor_name_raw, description, order_id, is_group_primary, status,
      vendors:vendor_id (id, name)
    `)
    .eq('user_id', userId)
    .in('status', ['waiting_for_statement', 'ready_to_import'])
    .gte('transaction_date', periodStart)
    .lte('transaction_date', periodEnd)

  if (fetchError || !waitingEmails || waitingEmails.length === 0) {
    return { resolved: 0, stillWaiting: 0 }
  }

  const { data: candidates, error: candError } = await supabase
    .from('transactions')
    .select(`
      id, description, amount, original_currency, transaction_date,
      vendors:vendor_id (id, name)
    `)
    .eq('user_id', userId)
    .gte('transaction_date', periodStart)
    .lte('transaction_date', periodEnd)
    .order('transaction_date', { ascending: false })
    .limit(200)

  if (candError || !candidates || candidates.length === 0) {
    return { resolved: 0, stillWaiting: waitingEmails.length }
  }

  const targets: TargetTransaction[] = candidates.map((tx) => ({
    id: tx.id,
    amount: Number(tx.amount),
    currency: tx.original_currency,
    date: tx.transaction_date,
    vendor: (tx.vendors as { name: string } | null)?.name || tx.description || '',
    description: tx.description || undefined,
  }))

  // --- BUNDLE PASS: detect Lazada-style multi-email bundles first ---
  const bundles = groupRowsIntoBundles(
    waitingEmails.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      from_address: row.from_address,
      email_date: row.email_date,
      transaction_date: row.transaction_date,
      amount: row.amount,
      currency: row.currency,
      vendor_name_raw: row.vendor_name_raw,
      description: row.description,
      order_id: row.order_id,
      is_group_primary: row.is_group_primary,
      status: row.status,
    })),
  )

  const bundledIds = new Set<string>()
  for (const b of bundles) {
    const ranked = await scoreBundleAgainstTargets(
      { focalId: b.members[0].id, vendorLabel: b.vendorLabel, members: b.members },
      targets,
      supabase,
    )
    const best = ranked[0]
    if (!best || !best.isMatch || best.score < CONFIDENCE_THRESHOLDS.MEDIUM) continue
    // Don't claim bundle ownership of these emails unless the score clears
    // the bar. Below MEDIUM, fall back to single-email matching for each.

    // Pick the largest-amount member as the "primary" — this is what shows
    // in transactions.source_email_transaction_id back-pointer if no other
    // primary is set later.
    const memberIds = b.members.map((m) => m.id)
    const { error: updateErr } = await supabase
      .from('email_transactions')
      .update({
        matched_transaction_id: best.targetId,
        match_confidence: best.score,
        match_method: 'auto',
      })
      .in('id', memberIds)
      .eq('user_id', userId)

    if (updateErr) {
      console.error('Failed to write bundle match:', updateErr)
      continue
    }

    for (const id of memberIds) bundledIds.add(id)
  }

  // --- SINGLE PASS: any email not claimed by a bundle ---
  for (const email of waitingEmails) {
    if (bundledIds.has(email.id)) continue
    if (!email.amount || !email.transaction_date) continue

    const vendorName = (email.vendors as { name: string } | null)?.name || email.vendor_name_raw || ''
    const source: SourceTransaction = {
      amount: Number(email.amount),
      currency: email.currency || 'USD',
      date: email.transaction_date,
      vendor: vendorName,
      description: email.description || undefined,
    }

    const ranked = await rankMatches(source, targets, { supabase })

    if (ranked.bestMatch && ranked.bestMatch.score >= 55) {
      await supabase
        .from('email_transactions')
        .update({
          matched_transaction_id: ranked.bestMatch.targetId,
          match_confidence: ranked.bestMatch.score,
        })
        .eq('id', email.id)
        .eq('user_id', userId)
    }
  }

  return {
    resolved: 0,
    stillWaiting: waitingEmails.length,
  }
}
