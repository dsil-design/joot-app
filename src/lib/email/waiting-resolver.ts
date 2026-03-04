import type { SupabaseClient } from '@supabase/supabase-js'
import { rankMatches, canAutoApprove } from '@/lib/matching/match-ranker'
import type { SourceTransaction, TargetTransaction } from '@/lib/matching/match-scorer'

interface ResolveResult {
  resolved: number
  stillWaiting: number
}

/**
 * Resolves unmatched email transactions against existing transactions.
 *
 * Called after a statement is processed. Finds email transactions in
 * "waiting_for_statement" or "ready_to_import" status that overlap with
 * the statement period, runs match scoring, and auto-approves high-confidence
 * matches. This covers both THB receipts waiting for a statement AND USD
 * receipts that could match a credit card transaction.
 */
export async function resolveWaitingEmailTransactions(
  userId: string,
  periodStart: string,
  periodEnd: string,
  supabase: SupabaseClient
): Promise<ResolveResult> {
  // Find unmatched email transactions in the period
  // Include both waiting_for_statement (THB CC) and ready_to_import (USD, e-wallet, etc.)
  const { data: waitingEmails, error: fetchError } = await supabase
    .from('email_transactions')
    .select(`
      id, amount, currency, transaction_date, vendor_name_raw, description,
      vendors:vendor_id (id, name)
    `)
    .eq('user_id', userId)
    .in('status', ['waiting_for_statement', 'ready_to_import'])
    .gte('transaction_date', periodStart)
    .lte('transaction_date', periodEnd)

  if (fetchError || !waitingEmails || waitingEmails.length === 0) {
    return { resolved: 0, stillWaiting: 0 }
  }

  // Fetch candidate transactions in the period (from statements)
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

  // Build target transactions
  const targets: TargetTransaction[] = candidates.map((tx) => ({
    id: tx.id,
    amount: Number(tx.amount),
    currency: tx.original_currency,
    date: tx.transaction_date,
    vendor: (tx.vendors as { name: string } | null)?.name || tx.description || '',
    description: tx.description || undefined,
  }))

  let resolved = 0

  // Try to match each waiting email
  for (const email of waitingEmails) {
    if (!email.amount || !email.transaction_date) continue

    const vendorName = (email.vendors as { name: string } | null)?.name || email.vendor_name_raw || ''
    const source: SourceTransaction = {
      amount: Number(email.amount),
      currency: email.currency || 'USD',
      date: email.transaction_date,
      vendor: vendorName,
      description: email.description || undefined,
    }

    // Pass supabase for cross-currency exchange rate lookups
    const ranked = await rankMatches(source, targets, { supabase })

    if (canAutoApprove(ranked) && ranked.bestMatch) {
      // Auto-link this email transaction
      const { error: updateError } = await supabase
        .from('email_transactions')
        .update({
          status: 'matched',
          matched_transaction_id: ranked.bestMatch.targetId,
          match_confidence: ranked.bestMatch.score,
          match_method: 'auto',
          matched_at: new Date().toISOString(),
        })
        .eq('id', email.id)
        .eq('user_id', userId)

      if (!updateError) {
        // Set source reference on the matched transaction
        await supabase
          .from('transactions')
          .update({ source_email_transaction_id: email.id })
          .eq('id', ranked.bestMatch.targetId)

        resolved++
      }
    } else if (ranked.bestMatch && ranked.bestMatch.score >= 55) {
      // Medium confidence — store hint for user review
      await supabase
        .from('email_transactions')
        .update({
          match_confidence: ranked.bestMatch.score,
        })
        .eq('id', email.id)
        .eq('user_id', userId)
    }
  }

  return {
    resolved,
    stillWaiting: waitingEmails.length - resolved,
  }
}
