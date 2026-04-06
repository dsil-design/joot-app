import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import type { Json } from '@/lib/supabase/types'
import { updateStatementReviewStatus } from '@/lib/utils/statement-status'

/**
 * POST /api/transactions/[id]/attach-source
 *
 * Manually attach a source (email, payment slip, or statement row) to an existing
 * transaction. Used by the "Attach a source" affordance on the transaction detail
 * page to enrich a transaction's context with additional sources.
 *
 * If the source is already linked to a different transaction, returns 409 with
 * { conflictTransactionId } so the UI can suggest unlinking first.
 *
 * Body:
 *   sourceType:       'email' | 'payment_slip' | 'statement'
 *   sourceId:         uuid of the source row
 *   suggestionIndex?: number (required for statement)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: transactionId } = await params

    let body: { sourceType?: string; sourceId?: string; suggestionIndex?: number }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { sourceType, sourceId, suggestionIndex } = body
    if (!sourceType || !sourceId) {
      return NextResponse.json({ error: 'sourceType and sourceId are required' }, { status: 400 })
    }
    if (!['email', 'payment_slip', 'statement'].includes(sourceType)) {
      return NextResponse.json({ error: 'Invalid sourceType' }, { status: 400 })
    }
    if (sourceType === 'statement' && (suggestionIndex == null || suggestionIndex < 0)) {
      return NextResponse.json({ error: 'suggestionIndex is required for statement sources' }, { status: 400 })
    }

    const service = createServiceRoleClient()

    // Verify transaction ownership and that the FK column for this source type is empty.
    const { data: tx, error: txError } = await service
      .from('transactions')
      .select('id, source_email_transaction_id, source_payment_slip_id, source_statement_upload_id')
      .eq('id', transactionId)
      .eq('user_id', user.id)
      .single()

    if (txError || !tx) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    // Email and payment slip sources are many-to-one — multiple sources can
    // point at the same transaction (e.g. multi-item Lazada orders where each
    // item produces its own email receipt but the credit card aggregates them).
    // The singular `source_email_transaction_id` / `source_payment_slip_id`
    // FKs on `transactions` act as a "primary source" pointer; the real
    // linking lives on the source rows' `matched_transaction_id`.
    //
    // Statement sources remain 1:1 because the statement viewer modal needs a
    // specific (statement_upload_id, suggestion_index) tuple to render.
    if (sourceType === 'statement' && tx.source_statement_upload_id) {
      return NextResponse.json(
        { error: 'Transaction already has a statement source. Unlink it first.' },
        { status: 400 }
      )
    }

    // Per source type: verify the source belongs to this user, check matched state,
    // then perform the link.
    if (sourceType === 'email') {
      const { data: email, error } = await service
        .from('email_transactions')
        .select('id, matched_transaction_id')
        .eq('id', sourceId)
        .eq('user_id', user.id)
        .single()
      if (error || !email) {
        return NextResponse.json({ error: 'Email source not found' }, { status: 404 })
      }
      if (email.matched_transaction_id && email.matched_transaction_id !== transactionId) {
        return NextResponse.json(
          {
            error: 'Email is already linked to another transaction',
            conflictTransactionId: email.matched_transaction_id,
          },
          { status: 409 }
        )
      }

      const { error: emailUpdateErr } = await service
        .from('email_transactions')
        .update({
          matched_transaction_id: transactionId,
          status: 'matched',
          match_method: 'manual',
          matched_at: new Date().toISOString(),
        })
        .eq('id', sourceId)
      if (emailUpdateErr) throw emailUpdateErr

      // Only set the singular "primary source" pointer if it's empty — leave
      // the existing primary in place when this is a secondary attach.
      if (!tx.source_email_transaction_id) {
        const { error: txUpdateErr } = await service
          .from('transactions')
          .update({ source_email_transaction_id: sourceId })
          .eq('id', transactionId)
        if (txUpdateErr) throw txUpdateErr
      }
    } else if (sourceType === 'payment_slip') {
      const { data: slip, error } = await service
        .from('payment_slip_uploads')
        .select('id, matched_transaction_id')
        .eq('id', sourceId)
        .eq('user_id', user.id)
        .single()
      if (error || !slip) {
        return NextResponse.json({ error: 'Payment slip source not found' }, { status: 404 })
      }
      if (slip.matched_transaction_id && slip.matched_transaction_id !== transactionId) {
        return NextResponse.json(
          {
            error: 'Payment slip is already linked to another transaction',
            conflictTransactionId: slip.matched_transaction_id,
          },
          { status: 409 }
        )
      }

      const { error: slipUpdateErr } = await service
        .from('payment_slip_uploads')
        .update({
          matched_transaction_id: transactionId,
          review_status: 'approved',
          status: 'done',
        })
        .eq('id', sourceId)
      if (slipUpdateErr) throw slipUpdateErr

      if (!tx.source_payment_slip_id) {
        const { error: txUpdateErr } = await service
          .from('transactions')
          .update({ source_payment_slip_id: sourceId })
          .eq('id', transactionId)
        if (txUpdateErr) throw txUpdateErr
      }
    } else {
      // statement
      const idx = suggestionIndex as number
      const { data: stmt, error } = await service
        .from('statement_uploads')
        .select('id, extraction_log')
        .eq('id', sourceId)
        .eq('user_id', user.id)
        .single()
      if (error || !stmt) {
        return NextResponse.json({ error: 'Statement source not found' }, { status: 404 })
      }

      const extractionLog = (stmt.extraction_log as {
        suggestions?: Array<Record<string, unknown>>
        [k: string]: unknown
      } | null) || {}
      const suggestions = (extractionLog.suggestions || []) as Array<Record<string, unknown>>

      if (idx < 0 || idx >= suggestions.length) {
        return NextResponse.json({ error: 'Invalid suggestionIndex' }, { status: 400 })
      }

      const existingMatch = suggestions[idx].matched_transaction_id as string | undefined
      if (existingMatch && existingMatch !== transactionId) {
        return NextResponse.json(
          {
            error: 'Statement row is already linked to another transaction',
            conflictTransactionId: existingMatch,
          },
          { status: 409 }
        )
      }

      suggestions[idx] = {
        ...suggestions[idx],
        matched_transaction_id: transactionId,
        status: 'approved',
        is_new: false,
      }

      const { error: stmtUpdateErr } = await service
        .from('statement_uploads')
        .update({ extraction_log: { ...extractionLog, suggestions } as unknown as Json })
        .eq('id', sourceId)
      if (stmtUpdateErr) throw stmtUpdateErr

      const confidence = (suggestions[idx].confidence as number | undefined) ?? null

      const { error: txUpdateErr } = await service
        .from('transactions')
        .update({
          source_statement_upload_id: sourceId,
          source_statement_suggestion_index: idx,
          source_statement_match_confidence: confidence,
        })
        .eq('id', transactionId)
      if (txUpdateErr) throw txUpdateErr

      await updateStatementReviewStatus(service, sourceId)
    }

    // Activity log (best effort)
    await service.from('import_activities').insert({
      user_id: user.id,
      activity_type: 'transaction_matched',
      description: `Manually attached ${sourceType} source to transaction`,
      transactions_affected: 1,
      metadata: { transactionId, sourceType, sourceId, suggestionIndex },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Attach source API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
