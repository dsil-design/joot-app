import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import type { Json } from '@/lib/supabase/types'
import { parseImportId } from '@/lib/utils/import-id'

/**
 * POST /api/imports/reject-transaction-match
 *
 * Rejects ONLY the claim that a queue card corresponds to an existing Joot
 * transaction. The card stays in the queue, its sources stay paired with each
 * other, and its status is untouched — it simply becomes a new transaction
 * again.
 *
 * This exists because `/api/imports/reject` conflates three separate
 * decisions into one action: it clears the transaction link, records the
 * *source pairing* as rejected, and changes the item's status. A user who
 * only meant "that's the wrong transaction" would also silently sever a
 * correct email↔statement pairing and drop the row out of review — which is
 * exactly what happened to a Grab receipt that had been mis-linked to an
 * unrelated reimbursement.
 *
 * Request body:
 * - compositeId: string — any queue composite id
 * - transactionId?: string — the transaction being rejected. Optional; when
 *   omitted, whatever each source currently points at is used.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: { compositeId?: string; transactionId?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { compositeId, transactionId } = body
    if (!compositeId) {
      return NextResponse.json({ error: 'compositeId is required' }, { status: 400 })
    }

    const parsed = parseImportId(compositeId)
    if (!parsed) {
      return NextResponse.json({ error: `Unrecognized compositeId: ${compositeId}` }, { status: 400 })
    }

    // Collect every underlying source the card is built from.
    const emailIds: string[] = []
    const slipIds: string[] = []
    const statementRefs: Array<{ statementId: string; index: number }> = []

    switch (parsed.type) {
      case 'email':
        emailIds.push(parsed.emailId); break
      case 'statement':
        statementRefs.push({ statementId: parsed.statementId, index: parsed.index }); break
      case 'payment_slip':
        slipIds.push(parsed.slipId); break
      case 'merged':
        emailIds.push(parsed.emailId)
        statementRefs.push({ statementId: parsed.statementId, index: parsed.index }); break
      case 'merged_slip_email':
        slipIds.push(parsed.slipId); emailIds.push(parsed.emailId); break
      case 'merged_slip_stmt':
        slipIds.push(parsed.slipId)
        statementRefs.push({ statementId: parsed.statementId, index: parsed.index }); break
      case 'merged_slip_email_stmt':
        slipIds.push(parsed.slipId); emailIds.push(parsed.emailId)
        statementRefs.push({ statementId: parsed.statementId, index: parsed.index }); break
      case 'self_transfer':
        statementRefs.push({ statementId: parsed.debitStatementId, index: parsed.debitIndex })
        statementRefs.push({ statementId: parsed.creditStatementId, index: parsed.creditIndex }); break
    }

    const serviceClient = createServiceRoleClient()
    const unlinked: string[] = []

    const remember = (existing: string[] | null | undefined, txnId: string | null): string[] => {
      const list = existing || []
      if (!txnId || list.includes(txnId)) return list
      return [...list, txnId]
    }

    // ── Emails ────────────────────────────────────────────────────────────
    for (const emailId of emailIds) {
      const { data: row } = await serviceClient
        .from('email_transactions')
        .select('id, matched_transaction_id, rejected_transaction_ids, status')
        .eq('id', emailId)
        .eq('user_id', user.id)
        .maybeSingle()
      if (!row) continue

      const txnId = transactionId || (row.matched_transaction_id as string | null)
      if (!txnId) continue

      await serviceClient
        .from('email_transactions')
        .update({
          matched_transaction_id: null,
          match_confidence: null,
          match_method: null,
          // Remember the rejection so matching doesn't re-propose it. Note
          // rejected_pair_keys is deliberately NOT touched — the sources
          // still belong together.
          rejected_transaction_ids: remember(
            row.rejected_transaction_ids as string[] | null,
            txnId
          ),
          // Back to needing review as a new transaction.
          status: 'pending_review',
        })
        .eq('id', emailId)
      unlinked.push(txnId)
    }

    // ── Payment slips ─────────────────────────────────────────────────────
    for (const slipId of slipIds) {
      const { data: row } = await serviceClient
        .from('payment_slip_uploads')
        .select('id, matched_transaction_id, rejected_transaction_ids')
        .eq('id', slipId)
        .eq('user_id', user.id)
        .maybeSingle()
      if (!row) continue

      const txnId = transactionId || (row.matched_transaction_id as string | null)
      if (!txnId) continue

      await serviceClient
        .from('payment_slip_uploads')
        .update({
          matched_transaction_id: null,
          match_confidence: null,
          rejected_transaction_ids: remember(
            row.rejected_transaction_ids as string[] | null,
            txnId
          ),
        })
        .eq('id', slipId)
      unlinked.push(txnId)
    }

    // ── Statement suggestions ─────────────────────────────────────────────
    // Grouped per statement so one read-modify-write covers every affected
    // row in the same extraction_log.
    const byStatement = new Map<string, number[]>()
    for (const ref of statementRefs) {
      byStatement.set(ref.statementId, [...(byStatement.get(ref.statementId) || []), ref.index])
    }

    for (const [statementId, indexes] of byStatement) {
      const { data: stmt } = await serviceClient
        .from('statement_uploads')
        .select('id, extraction_log')
        .eq('id', statementId)
        .eq('user_id', user.id)
        .maybeSingle()
      if (!stmt) continue

      const log = stmt.extraction_log as {
        suggestions?: Array<Record<string, unknown>>
      } | null
      const suggestions = log?.suggestions
      if (!suggestions) continue

      let changed = false
      for (const index of indexes) {
        const suggestion = suggestions[index]
        if (!suggestion) continue

        const txnId = transactionId || (suggestion.matched_transaction_id as string | null)
        if (!txnId) continue

        suggestion.matched_transaction_id = null
        suggestion.is_new = true
        suggestion.confidence = 0
        // Stays reviewable — this rejects the transaction, not the row.
        suggestion.status = 'pending'
        suggestion.rejected_transaction_ids = remember(
          suggestion.rejected_transaction_ids as string[] | null,
          txnId
        )
        unlinked.push(txnId)
        changed = true
      }

      if (changed) {
        await serviceClient
          .from('statement_uploads')
          .update({ extraction_log: log as unknown as Json })
          .eq('id', statementId)
      }
    }

    if (unlinked.length === 0) {
      return NextResponse.json(
        { error: 'No transaction match found on this item to reject' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      compositeId,
      rejectedTransactionIds: Array.from(new Set(unlinked)),
      sourcesUpdated: emailIds.length + slipIds.length + statementRefs.length,
    })
  } catch (error) {
    console.error('Reject transaction match error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
