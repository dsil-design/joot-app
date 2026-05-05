import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { parseImportId } from '@/lib/utils/import-id'
import { updateStatementReviewStatus } from '@/lib/utils/statement-status'
import type { Json } from '@/lib/supabase/types'

/**
 * POST /api/imports/reopen
 *
 * Moves previously-rejected items (payment slips, email transactions, and
 * statement suggestions) back to a pending state so they re-appear in the
 * review queue. Match fields are cleared, but `rejected_transaction_ids`
 * is preserved — the user's prior rejection of a specific transaction is
 * still respected by batch rematch. Associated proposals are marked
 * `stale` so they regenerate on next load.
 *
 * Request body:
 * - compositeIds: string[] — prefixed import IDs to reopen
 *
 * Supported ID types: slip, email, stmt. Other types return an error.
 */

interface Suggestion {
  transaction_date: string
  description: string
  amount: number
  currency: string
  matched_transaction_id?: string
  confidence: number
  reasons: string[]
  is_new: boolean
  status?: 'pending' | 'approved' | 'rejected'
}

interface ExtractionLog {
  suggestions?: Suggestion[]
  [key: string]: unknown
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: { compositeIds?: string[] }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const compositeIds = body.compositeIds || []
    if (!Array.isArray(compositeIds) || compositeIds.length === 0) {
      return NextResponse.json(
        { error: 'compositeIds is required and must be a non-empty array' },
        { status: 400 }
      )
    }
    if (compositeIds.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 items can be reopened at once' },
        { status: 400 }
      )
    }

    const slipIds: string[] = []
    const emailIds: string[] = []
    const statementItems: Array<{ statementId: string; index: number }> = []
    const invalidIds: string[] = []

    for (const id of compositeIds) {
      const parsed = parseImportId(id)
      if (!parsed) {
        invalidIds.push(id)
      } else if (parsed.type === 'payment_slip') {
        slipIds.push(parsed.slipId)
      } else if (parsed.type === 'email') {
        emailIds.push(parsed.emailId)
      } else if (parsed.type === 'statement') {
        statementItems.push({ statementId: parsed.statementId, index: parsed.index })
      } else {
        invalidIds.push(id)
      }
    }

    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: 'Invalid or unsupported ID format', invalidIds },
        { status: 400 }
      )
    }

    const serviceClient = createServiceRoleClient()
    const results = { reopened: 0, failed: 0, errors: [] as string[] }

    // --- Payment slips ---
    if (slipIds.length > 0) {
      const { data: updated, error } = await serviceClient
        .from('payment_slip_uploads')
        .update({
          review_status: 'pending',
          matched_transaction_id: null,
          match_confidence: null,
        })
        .in('id', slipIds)
        .eq('user_id', user.id)
        .eq('review_status', 'rejected')
        .select('id')

      if (error) {
        console.error('Error reopening slips:', error)
        results.errors.push('Failed to reopen payment slips')
        results.failed += slipIds.length
      } else {
        results.reopened += updated?.length ?? 0
      }
    }

    // --- Email transactions ---
    if (emailIds.length > 0) {
      const { data: updated, error } = await serviceClient
        .from('email_transactions')
        .update({
          status: 'pending_review',
          matched_transaction_id: null,
          match_confidence: null,
          match_method: null,
        })
        .in('id', emailIds)
        .eq('user_id', user.id)
        .eq('status', 'skipped')
        .select('id')

      if (error) {
        console.error('Error reopening emails:', error)
        results.errors.push('Failed to reopen email transactions')
        results.failed += emailIds.length
      } else {
        results.reopened += updated?.length ?? 0
      }
    }

    // --- Statement suggestions ---
    if (statementItems.length > 0) {
      const byStatement = new Map<string, number[]>()
      for (const { statementId, index } of statementItems) {
        const indices = byStatement.get(statementId) || []
        indices.push(index)
        byStatement.set(statementId, indices)
      }

      const stmtIdList = Array.from(byStatement.keys())
      const { data: statements, error: fetchError } = await serviceClient
        .from('statement_uploads')
        .select('id, extraction_log')
        .in('id', stmtIdList)
        .eq('user_id', user.id)

      if (fetchError || !statements) {
        results.errors.push('Failed to fetch statements')
      } else {
        for (const statement of statements) {
          const indices = byStatement.get(statement.id) || []
          const extractionLog = statement.extraction_log as ExtractionLog | null
          const suggestions = extractionLog?.suggestions || []
          let hasChanges = false

          // A suggestion can be in 'rejected' state while a real transaction
          // still references it (e.g. a merged-reject left the statement's own
          // link intact in matched_transaction_id but flipped status). Look up
          // those transactions up front so we can heal the drift instead of
          // clobbering a valid match.
          const linkedByIdx = new Map<number, string>()
          const { data: linkedTxs } = await serviceClient
            .from('transactions')
            .select('id, source_statement_suggestion_index')
            .eq('user_id', user.id)
            .eq('source_statement_upload_id', statement.id)
            .in('source_statement_suggestion_index', indices)
          for (const tx of linkedTxs || []) {
            const i = (tx as { source_statement_suggestion_index: number | null }).source_statement_suggestion_index
            if (i != null) linkedByIdx.set(i, (tx as { id: string }).id)
          }

          for (const idx of indices) {
            if (idx < 0 || idx >= suggestions.length) {
              results.failed++
              results.errors.push(`Invalid suggestion index ${idx} for statement ${statement.id}`)
              continue
            }
            const suggestion = suggestions[idx]
            if (suggestion.status !== 'rejected') continue

            const linkedTxId = linkedByIdx.get(idx)
            if (linkedTxId) {
              // Restore the existing link instead of clearing it. The user's
              // "reopen" intent collapses to a no-op for the statement side
              // because the underlying tx pairing is still valid.
              suggestion.status = 'approved'
              suggestion.matched_transaction_id = linkedTxId
              suggestion.is_new = false
            } else {
              // Clear the match so batch rematch can propose something new.
              // rejected_transaction_ids on the slip/email side is honored there;
              // for statement suggestions, we also clear matched_transaction_id.
              suggestion.status = 'pending'
              suggestion.matched_transaction_id = undefined
              suggestion.confidence = 0
              suggestion.reasons = []
              suggestion.is_new = true
            }
            hasChanges = true
            results.reopened++
          }

          if (hasChanges) {
            const { error: updateError } = await serviceClient
              .from('statement_uploads')
              .update({
                extraction_log: { ...extractionLog, suggestions } as unknown as Json,
              })
              .eq('id', statement.id)

            if (updateError) {
              console.error('Error updating statement:', updateError)
              results.errors.push(`Failed to save changes to statement ${statement.id}`)
            } else {
              await updateStatementReviewStatus(serviceClient, statement.id)
            }
          }
        }
      }
    }

    // --- Mark associated proposals as stale so they regenerate ---
    const allCompositeIds = [
      ...slipIds.map((id) => `slip:${id}`),
      ...emailIds.map((id) => `email:${id}`),
      ...statementItems.map(({ statementId, index }) => `stmt:${statementId}:${index}`),
    ]
    if (allCompositeIds.length > 0) {
      await serviceClient
        .from('transaction_proposals')
        .update({ status: 'stale' })
        .eq('user_id', user.id)
        .in('composite_id', allCompositeIds)
        .in('status', ['pending', 'rejected'])
    }

    // --- Activity log ---
    await serviceClient
      .from('import_activities')
      .insert({
        user_id: user.id,
        activity_type: 'transaction_skipped',
        description: results.reopened === 1
          ? 'Reopened rejected item for review'
          : `Reopened ${results.reopened} rejected items for review`,
        transactions_affected: results.reopened,
        metadata: { compositeIds, results },
      })

    return NextResponse.json({
      success: results.reopened > 0,
      results,
    })
  } catch (error) {
    console.error('Import reopen API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
