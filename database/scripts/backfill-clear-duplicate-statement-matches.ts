#!/usr/bin/env tsx
/**
 * Backfill: clear false-positive auto-matched statement suggestions.
 *
 * Why: the auto-matcher can claim the same Joot transaction for multiple
 * statement suggestions when several charges share an amount + date window
 * (common with batched Amazon orders). Only one of those is the real link —
 * the one captured on the transaction itself via
 * source_statement_upload_id + source_statement_suggestion_index. The rest are
 * stale false positives that get grouped by the queue's matched-tx dedup pass
 * and pull previously-approved merged cards back to `pending` on every
 * refresh.
 *
 * What this does, for every transaction with a canonical statement link:
 *   - find every pending statement suggestion across this user's statements
 *     whose matched_transaction_id equals this transaction
 *   - skip the canonical (statementId, index) — and, for transfers, any other
 *     suggestion that the transaction's source_* columns sanction
 *   - clear matched_transaction_id, reset confidence to 0, mark is_new=true
 *
 * Idempotent. Re-running on already-clean data is a no-op.
 *
 * Usage:
 *   npx tsx database/scripts/backfill-clear-duplicate-statement-matches.ts            # dry-run (default)
 *   npx tsx database/scripts/backfill-clear-duplicate-statement-matches.ts --apply    # write
 *   npx tsx database/scripts/backfill-clear-duplicate-statement-matches.ts --user <uuid>
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import path from 'path'

config({ path: path.resolve(__dirname, '../../.env.local') })

const APPLY = process.argv.includes('--apply')
const userArgIdx = process.argv.indexOf('--user')
const SINGLE_USER = userArgIdx >= 0 ? process.argv[userArgIdx + 1] : null

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const sb = createClient(url, key, { auth: { persistSession: false } })

interface Suggestion {
  status?: 'pending' | 'approved' | 'rejected'
  matched_transaction_id?: string
  confidence?: number
  is_new?: boolean
  amount?: number
  description?: string
  transaction_date?: string
  [k: string]: unknown
}

interface ExtractionLog {
  suggestions?: Suggestion[]
  [k: string]: unknown
}

interface TxRow {
  id: string
  user_id: string
  source_statement_upload_id: string
  source_statement_suggestion_index: number
}

async function main() {
  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}${SINGLE_USER ? `  user=${SINGLE_USER}` : ''}\n`)

  // 1. Every transaction with a canonical statement link
  let txQuery = sb
    .from('transactions')
    .select('id, user_id, source_statement_upload_id, source_statement_suggestion_index')
    .not('source_statement_upload_id', 'is', null)
    .not('source_statement_suggestion_index', 'is', null)
  if (SINGLE_USER) txQuery = txQuery.eq('user_id', SINGLE_USER)

  const { data: txns, error: txnErr } = await txQuery
  if (txnErr) {
    console.error('Failed to fetch transactions:', txnErr)
    process.exit(1)
  }
  if (!txns || txns.length === 0) {
    console.log('No transactions with canonical statement link.')
    return
  }
  console.log(`Found ${txns.length} transaction(s) with canonical statement link.\n`)

  // 2. Group canonical links by user → tx → kept (statementId, index) pairs.
  //    Self-transfers will appear twice (debit + credit side of the same tx)
  //    by way of the same tx row having one canonical link plus a second
  //    suggestion legitimately pointing at it; the per-user pass below
  //    discovers the second one as a suggestion that should NOT be cleared
  //    only when the user's transaction row records it. To capture both
  //    sides, we also seed `keep` with every (matched_transaction_id,
  //    statement, index) where the suggestion's `status === 'approved'` —
  //    those are user-sanctioned even if not the canonical link on the tx.
  const txByUser = new Map<string, Map<string, Set<string>>>()
  for (const t of txns as TxRow[]) {
    const userMap = txByUser.get(t.user_id) ?? new Map<string, Set<string>>()
    const keeps = userMap.get(t.id) ?? new Set<string>()
    keeps.add(`${t.source_statement_upload_id}:${t.source_statement_suggestion_index}`)
    userMap.set(t.id, keeps)
    txByUser.set(t.user_id, userMap)
  }

  let totalCleared = 0
  let totalTouchedStatements = 0
  let totalAffectedTxs = 0

  for (const [userId, txMap] of txByUser) {
    const userTxIds = new Set(txMap.keys())

    // Fetch every statement for this user once
    const { data: statements, error: stmtErr } = await sb
      .from('statement_uploads')
      .select('id, filename, extraction_log')
      .eq('user_id', userId)

    if (stmtErr) {
      console.error(`[${userId}] failed to fetch statements:`, stmtErr)
      continue
    }
    if (!statements || statements.length === 0) continue

    // First pass: also keep any approved suggestion pointing at one of our
    // tracked transactions (covers self-transfers' second leg).
    for (const stmt of statements) {
      const ext = stmt.extraction_log as ExtractionLog | null
      const suggestions = ext?.suggestions
      if (!suggestions) continue
      for (let i = 0; i < suggestions.length; i++) {
        const s = suggestions[i]
        const mtid = s.matched_transaction_id
        if (!mtid || !userTxIds.has(mtid)) continue
        if (s.status === 'approved') {
          txMap.get(mtid)!.add(`${stmt.id}:${i}`)
        }
      }
    }

    // Second pass: clear false-positives
    for (const stmt of statements) {
      const ext = stmt.extraction_log as ExtractionLog | null
      const suggestions = ext?.suggestions
      if (!suggestions || suggestions.length === 0) continue

      let modified = false
      const cleared: Array<{ idx: number; sug: Suggestion; txId: string }> = []

      const updated: Suggestion[] = suggestions.map((s, idx) => {
        const mtid = s.matched_transaction_id
        if (!mtid) return s
        const keeps = txMap.get(mtid)
        if (!keeps) return s
        if (keeps.has(`${stmt.id}:${idx}`)) return s
        if (s.status === 'approved' || s.status === 'rejected') return s

        modified = true
        cleared.push({ idx, sug: s, txId: mtid })
        const { matched_transaction_id: _drop, ...rest } = s
        void _drop
        return { ...rest, confidence: 0, is_new: true }
      })

      if (!modified) continue

      totalTouchedStatements++
      totalCleared += cleared.length
      const affected = new Set(cleared.map((c) => c.txId))
      totalAffectedTxs += affected.size

      console.log(`[${userId.slice(0, 8)}] ${stmt.id.slice(0, 8)} (${stmt.filename}): clear ${cleared.length} stale match(es)`)
      for (const c of cleared) {
        console.log(
          `   idx=${c.idx}  $${c.sug.amount} ${c.sug.transaction_date}  "${c.sug.description?.slice(0, 40)}"  was→${c.txId.slice(0, 8)}`,
        )
      }

      if (APPLY) {
        const { error: updErr } = await sb
          .from('statement_uploads')
          .update({ extraction_log: { ...ext, suggestions: updated } })
          .eq('id', stmt.id)
          .eq('user_id', userId)
        if (updErr) {
          console.error(`   ✗ update failed:`, updErr)
        }
      }
    }
  }

  console.log('')
  console.log(`Summary: ${totalCleared} stale match(es) across ${totalTouchedStatements} statement(s), touching ${totalAffectedTxs} unique transaction(s).`)
  if (!APPLY && totalCleared > 0) {
    console.log('\nDry-run only. Re-run with --apply to write.')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
