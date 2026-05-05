#!/usr/bin/env tsx
/**
 * Survey + repair drift between transactions and statement_uploads.extraction_log.
 *
 * A "linked" statement suggestion should have status='approved' and
 * matched_transaction_id set to the transaction that holds the reciprocal
 * source_statement_upload_id + source_statement_suggestion_index. A pair of
 * pre-existing bugs in /api/imports/reject (merged reject flipping the
 * statement-side status to 'rejected') and /api/imports/reopen (clearing a
 * still-valid match) could leave the suggestion side out of sync with the
 * authoritative transactions side.
 *
 * Usage:
 *   tsx database/scripts/repair-statement-suggestion-drift.ts          # survey only
 *   tsx database/scripts/repair-statement-suggestion-drift.ts --fix-id babf661e-...   # also repair this transaction's link
 *   tsx database/scripts/repair-statement-suggestion-drift.ts --fix-all                # repair every drifted row
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

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
  is_new?: boolean
  amount?: number
  description?: string
  transaction_date?: string
  [k: string]: unknown
}

interface Drift {
  txId: string
  uploadId: string
  idx: number
  suggestion: Suggestion
  reason: string
}

const args = new Set(process.argv.slice(2))
const fixAll = args.has('--fix-all')
const fixIdFlag = process.argv.indexOf('--fix-id')
const fixId = fixIdFlag >= 0 ? process.argv[fixIdFlag + 1] : undefined

async function findDrift(): Promise<Drift[]> {
  const { data: txs, error } = await sb
    .from('transactions')
    .select('id, source_statement_upload_id, source_statement_suggestion_index')
    .not('source_statement_upload_id', 'is', null)
    .not('source_statement_suggestion_index', 'is', null)
  if (error) throw error

  const byUpload = new Map<string, Array<{ txId: string; idx: number }>>()
  for (const tx of txs ?? []) {
    const u = (tx as { source_statement_upload_id: string }).source_statement_upload_id
    const i = (tx as { source_statement_suggestion_index: number }).source_statement_suggestion_index
    if (!byUpload.has(u)) byUpload.set(u, [])
    byUpload.get(u)!.push({ txId: (tx as { id: string }).id, idx: i })
  }

  const uploadIds = Array.from(byUpload.keys())
  const { data: uploads, error: uploadErr } = await sb
    .from('statement_uploads')
    .select('id, extraction_log')
    .in('id', uploadIds)
  if (uploadErr) throw uploadErr

  const logByUpload = new Map<string, { suggestions?: Suggestion[]; [k: string]: unknown }>()
  for (const u of uploads ?? []) {
    logByUpload.set((u as { id: string }).id, (u as { extraction_log: { suggestions?: Suggestion[] } }).extraction_log ?? {})
  }

  const drifts: Drift[] = []
  for (const [uploadId, refs] of byUpload) {
    const log = logByUpload.get(uploadId)
    const suggestions = log?.suggestions ?? []
    for (const { txId, idx } of refs) {
      const s = suggestions[idx]
      if (!s) {
        drifts.push({ txId, uploadId, idx, suggestion: {} as Suggestion, reason: 'suggestion missing' })
        continue
      }
      const statusOk = s.status === 'approved'
      const matchOk = s.matched_transaction_id === txId
      if (!statusOk || !matchOk) {
        const reasons: string[] = []
        if (!statusOk) reasons.push(`status=${s.status ?? 'undefined'}`)
        if (!matchOk) reasons.push(`matched_transaction_id=${s.matched_transaction_id ?? 'undefined'}`)
        drifts.push({ txId, uploadId, idx, suggestion: s, reason: reasons.join(', ') })
      }
    }
  }
  return drifts
}

async function repair(drift: Drift): Promise<void> {
  const { data: upload, error } = await sb
    .from('statement_uploads')
    .select('id, extraction_log')
    .eq('id', drift.uploadId)
    .single()
  if (error || !upload) throw new Error(`Upload ${drift.uploadId} not found: ${error?.message}`)

  const log = (upload as { extraction_log: { suggestions?: Suggestion[]; [k: string]: unknown } }).extraction_log ?? {}
  const suggestions = log.suggestions ?? []
  if (drift.idx < 0 || drift.idx >= suggestions.length) {
    throw new Error(`Index ${drift.idx} out of range for upload ${drift.uploadId} (len=${suggestions.length})`)
  }

  suggestions[drift.idx] = {
    ...suggestions[drift.idx],
    status: 'approved',
    matched_transaction_id: drift.txId,
    is_new: false,
  }

  const { error: updErr } = await sb
    .from('statement_uploads')
    .update({ extraction_log: { ...log, suggestions } })
    .eq('id', drift.uploadId)
  if (updErr) throw updErr
}

async function main() {
  console.log('Surveying transactions ↔ extraction_log.suggestions for drift...\n')
  const drifts = await findDrift()

  if (drifts.length === 0) {
    console.log('No drift detected. Database is consistent.')
    return
  }

  console.log(`Found ${drifts.length} drifted suggestion(s):\n`)
  for (const d of drifts) {
    const { amount, description, transaction_date } = d.suggestion
    console.log(`  - tx ${d.txId}`)
    console.log(`      upload ${d.uploadId} idx=${d.idx}`)
    console.log(`      suggestion: ${transaction_date ?? '?'} | ${amount ?? '?'} | ${description ?? '?'}`)
    console.log(`      drift: ${d.reason}`)
  }
  console.log()

  let toFix: Drift[] = []
  if (fixAll) toFix = drifts
  else if (fixId) toFix = drifts.filter((d) => d.txId === fixId)

  if (toFix.length === 0) {
    console.log('No --fix-id or --fix-all specified — survey complete (no changes).')
    return
  }

  console.log(`Repairing ${toFix.length} row(s)...\n`)
  for (const d of toFix) {
    try {
      await repair(d)
      console.log(`  ✓ tx ${d.txId} (upload ${d.uploadId} idx=${d.idx})`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.log(`  ✗ tx ${d.txId}: ${msg}`)
    }
  }
  console.log('\nDone.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
