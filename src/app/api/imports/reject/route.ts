import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { parseImportId } from '@/lib/utils/import-id'
import { updateStatementReviewStatus } from '@/lib/utils/statement-status'
import { recordDecision } from '@/lib/services/decision-learning'

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

/**
 * POST /api/imports/reject
 *
 * Rejects matches from the review queue.
 * IDs can be:
 * - stmt:<uuid>:<index> (statement items)
 * - email:<uuid> (email items)
 * - <uuid>:<index> (legacy statement format)
 *
 * Request body:
 * - emailId: string - Single ID to reject
 * - emailIds: string[] - Array of IDs to reject (batch)
 * - reason: string (optional)
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    let body: {
      emailId?: string
      emailIds?: string[]
      reason?: string
      nextStatus?: 'pending_review' | 'waiting_for_statement' | 'waiting_for_email' | 'waiting_for_slip' | 'skipped'
    }

    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    const { emailId, emailIds, reason, nextStatus } = body

    // Validate nextStatus if provided
    const validStatuses = ['pending_review', 'waiting_for_statement', 'waiting_for_email', 'waiting_for_slip', 'skipped'] as const
    if (nextStatus && !validStatuses.includes(nextStatus)) {
      return NextResponse.json(
        { error: `nextStatus must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    const effectiveStatus = nextStatus || 'skipped'
    // When re-queueing, items go back to pending for a fresh matching attempt
    // rather than being hard-rejected. Proposals are marked stale (not rejected)
    // so they regenerate — markStaleProposals only touches pending proposals,
    // so rejected proposals would stay dead forever.
    const isRequeue = effectiveStatus === 'pending_review'

    // Support both single and batch rejection
    const idsToReject: string[] = emailIds || (emailId ? [emailId] : [])

    // Validate
    if (idsToReject.length === 0) {
      return NextResponse.json(
        { error: 'emailId or emailIds is required' },
        { status: 400 }
      )
    }

    // Limit batch size
    if (idsToReject.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 items can be rejected at once' },
        { status: 400 }
      )
    }

    // Validate reason if provided
    if (reason !== undefined && typeof reason !== 'string') {
      return NextResponse.json(
        { error: 'reason must be a string' },
        { status: 400 }
      )
    }

    // Parse and separate IDs by type — merged IDs decompose into both statement + email
    const statementIds: { id: string; statementId: string; index: number; fromMerged?: boolean }[] = []
    const emailItemIds: string[] = []
    const paymentSlipIds: string[] = []
    const invalidIds: string[] = []
    // Track statement items that came from merged IDs — these should always be
    // marked 'rejected' even when nextStatus is 'pending_review', so the
    // cross-source pairer doesn't re-pair the same email+statement again.
    const mergedStatementKeys = new Set<string>()

    for (const id of idsToReject) {
      const parsed = parseImportId(id)
      if (!parsed) {
        invalidIds.push(id)
      } else if (parsed.type === 'merged') {
        statementIds.push({ id, statementId: parsed.statementId, index: parsed.index, fromMerged: true })
        mergedStatementKeys.add(`${parsed.statementId}:${parsed.index}`)
        emailItemIds.push(parsed.emailId)
      } else if (parsed.type === 'merged_slip_email') {
        // Decompose: reject both the slip and the email
        paymentSlipIds.push(parsed.slipId)
        emailItemIds.push(parsed.emailId)
      } else if (parsed.type === 'merged_slip_stmt') {
        // Decompose: reject both the slip and the statement suggestion
        paymentSlipIds.push(parsed.slipId)
        statementIds.push({ id, statementId: parsed.statementId, index: parsed.index })
      } else if (parsed.type === 'statement') {
        statementIds.push({ id, statementId: parsed.statementId, index: parsed.index })
      } else if (parsed.type === 'payment_slip') {
        paymentSlipIds.push(parsed.slipId)
      } else if (parsed.type === 'self_transfer') {
        // Self-transfers decompose into two statement suggestions
        statementIds.push({ id, statementId: parsed.debitStatementId, index: parsed.debitIndex })
        statementIds.push({ id, statementId: parsed.creditStatementId, index: parsed.creditIndex })
      } else {
        emailItemIds.push(parsed.emailId)
      }
    }

    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: 'Invalid ID format', invalidIds },
        { status: 400 }
      )
    }

    // Use service role client for updates
    const serviceClient = createServiceRoleClient()

    // Track results
    const results = {
      rejected: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[],
    }

    // --- Process STATEMENT items ---
    if (statementIds.length > 0) {
      // Group by statement ID
      const byStatement = new Map<string, number[]>()
      for (const { statementId, index } of statementIds) {
        const indices = byStatement.get(statementId) || []
        indices.push(index)
        byStatement.set(statementId, indices)
      }

      // Fetch all relevant statements
      const stmtIdList = Array.from(byStatement.keys())
      const { data: statements, error: fetchError } = await serviceClient
        .from('statement_uploads')
        .select('id, user_id, extraction_log')
        .in('id', stmtIdList)
        .eq('user_id', user.id)

      if (fetchError) {
        console.error('Error fetching statements:', fetchError)
        results.errors.push('Failed to fetch statement data')
      } else if (!statements || statements.length === 0) {
        results.errors.push('No matching statements found')
      } else {
        for (const statement of statements) {
          const indices = byStatement.get(statement.id) || []
          const extractionLog = statement.extraction_log as ExtractionLog | null
          const suggestions = extractionLog?.suggestions || []

          let hasChanges = false

          for (const idx of indices) {
            if (idx < 0 || idx >= suggestions.length) {
              results.failed++
              results.errors.push(`Invalid suggestion index ${idx} for statement ${statement.id}`)
              continue
            }

            const suggestion = suggestions[idx]

            if (suggestion.status === 'rejected') {
              results.skipped++
              continue
            }

            // Statement suggestions from merged items should always be rejected,
            // even when nextStatus is 'pending_review'. This prevents the
            // cross-source pairer from re-pairing the same email+statement.
            // Only the email side gets re-queued for fresh matching.
            const isMerged = mergedStatementKeys.has(`${statement.id}:${idx}`)
            suggestion.status = (effectiveStatus === 'pending_review' && !isMerged) ? 'pending' : 'rejected'
            hasChanges = true

            // Learn from this rejection (fire-and-forget)
            recordDecision(serviceClient, {
              userId: user.id,
              decisionType: 'reject',
              sourceType: isMerged ? 'merged' : 'statement',
              compositeId: `stmt:${statement.id}:${idx}`,
              statementUploadId: statement.id,
              suggestionIndex: idx,
              statementDescription: suggestion.description,
              amount: suggestion.amount,
              currency: suggestion.currency,
              matchConfidence: suggestion.confidence,
              rejectedTransactionId: suggestion.matched_transaction_id || undefined,
            }).catch((err) => console.error('Decision learning error:', err))

            results.rejected++
          }

          if (hasChanges) {
            const { error: updateError } = await serviceClient
              .from('statement_uploads')
              .update({
                extraction_log: { ...extractionLog, suggestions } as unknown as import('@/lib/supabase/types').Json,
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

    // --- Process EMAIL items ---
    if (emailItemIds.length > 0) {
      // First, fetch emails that have a matched_transaction_id so we can record the rejected pairing
      const { data: emailsWithMatch } = await serviceClient
        .from('email_transactions')
        .select('id, matched_transaction_id, rejected_transaction_ids, from_address, vendor_name_raw, parser_key, amount, currency, match_confidence')
        .in('id', emailItemIds)
        .eq('user_id', user.id)
        .not('matched_transaction_id', 'is', null)

      // For each email with a match, append the matched_transaction_id to rejected list and clear the match
      if (emailsWithMatch && emailsWithMatch.length > 0) {
        for (const email of emailsWithMatch) {
          const existingRejected = (email.rejected_transaction_ids || []) as string[]
          const matchedId = email.matched_transaction_id as string
          if (!existingRejected.includes(matchedId)) {
            await serviceClient
              .from('email_transactions')
              .update({
                status: effectiveStatus,
                matched_transaction_id: null,
                match_confidence: null,
                match_method: null,
                rejected_transaction_ids: [...existingRejected, matchedId],
              })
              .eq('id', email.id)
              .eq('user_id', user.id)
          } else {
            await serviceClient
              .from('email_transactions')
              .update({
                status: effectiveStatus,
                matched_transaction_id: null,
                match_confidence: null,
                match_method: null,
              })
              .eq('id', email.id)
              .eq('user_id', user.id)
          }

          // Learn from this rejection (fire-and-forget)
          recordDecision(serviceClient, {
            userId: user.id,
            decisionType: 'reject',
            sourceType: 'email',
            compositeId: `email:${email.id}`,
            emailTransactionId: email.id,
            emailFromAddress: email.from_address,
            emailVendorNameRaw: email.vendor_name_raw,
            emailParserKey: email.parser_key,
            amount: email.amount,
            currency: email.currency,
            matchConfidence: email.match_confidence,
            rejectedTransactionId: matchedId,
          }).catch((err) => console.error('Decision learning error:', err))
        }
        results.rejected += emailsWithMatch.length
      }

      // Update any remaining emails without a match (just status change)
      const emailsWithMatchIds = new Set((emailsWithMatch || []).map((e) => e.id))
      const emailsWithoutMatch = emailItemIds.filter((id) => !emailsWithMatchIds.has(id))

      if (emailsWithoutMatch.length > 0) {
        const { data: updated, error: emailUpdateError } = await serviceClient
          .from('email_transactions')
          .update({ status: effectiveStatus })
          .in('id', emailsWithoutMatch)
          .eq('user_id', user.id)
          .select('id')

        if (emailUpdateError) {
          results.errors.push('Failed to update email transactions')
          results.failed += emailsWithoutMatch.length
        } else {
          results.rejected += updated?.length ?? 0
        }
      }

      // Update associated proposals. On terminal rejection, hard-reject so they
      // don't resurface. On re-queue, mark stale so they regenerate on next load.
      const compositeIds = emailItemIds.map((id) => `email:${id}`)
      if (compositeIds.length > 0) {
        await serviceClient
          .from('transaction_proposals')
          .update({ status: isRequeue ? 'stale' : 'rejected' })
          .eq('user_id', user.id)
          .in('composite_id', compositeIds)
          .in('status', ['pending', 'stale'])
      }
    }

    // --- Process PAYMENT SLIP items ---
    if (paymentSlipIds.length > 0) {
      // Fetch slips that have a matched_transaction_id so we can record the rejected pairing
      // Note: rejected_transaction_ids column requires migration 20260323165607
      const { data: slipsWithMatch } = await serviceClient
        .from('payment_slip_uploads')
        .select('id, matched_transaction_id, sender_name, recipient_name, detected_direction, amount, currency, match_confidence')
        .in('id', paymentSlipIds)
        .eq('user_id', user.id)
        .not('matched_transaction_id', 'is', null) as { data: Array<{ id: string; matched_transaction_id: string | null; rejected_transaction_ids?: string[]; sender_name?: string; recipient_name?: string; detected_direction?: string; amount?: number; currency?: string; match_confidence?: number }> | null }

      if (slipsWithMatch && slipsWithMatch.length > 0) {
        for (const slip of slipsWithMatch) {
          const existingRejected = ((slip as any).rejected_transaction_ids || []) as string[]
          const matchedId = slip.matched_transaction_id as string
          const updatedRejected = existingRejected.includes(matchedId)
            ? existingRejected
            : [...existingRejected, matchedId]

          await serviceClient
            .from('payment_slip_uploads')
            .update({
              review_status: isRequeue ? 'pending' : 'rejected',
              matched_transaction_id: null,
              match_confidence: null,
              rejected_transaction_ids: updatedRejected,
            } as any)
            .eq('id', slip.id)
            .eq('user_id', user.id)

          // Learn from this rejection (fire-and-forget)
          const slipCounterparty = slip.detected_direction === 'income'
            ? slip.sender_name : slip.recipient_name
          recordDecision(serviceClient, {
            userId: user.id,
            decisionType: 'reject',
            sourceType: 'payment_slip',
            compositeId: `slip:${slip.id}`,
            paymentSlipId: slip.id,
            slipCounterpartyName: slipCounterparty || undefined,
            amount: slip.amount,
            currency: slip.currency,
            matchConfidence: slip.match_confidence,
            rejectedTransactionId: matchedId,
          }).catch((err) => console.error('Decision learning error:', err))
        }
        results.rejected += slipsWithMatch.length
      }

      // Update remaining slips without a match (just status change)
      const slipsWithMatchIds = new Set((slipsWithMatch || []).map((s) => s.id))
      const slipsWithoutMatch = paymentSlipIds.filter((id) => !slipsWithMatchIds.has(id))

      if (slipsWithoutMatch.length > 0) {
        const { data: updated, error: slipUpdateError } = await serviceClient
          .from('payment_slip_uploads')
          .update({ review_status: isRequeue ? 'pending' : 'rejected' })
          .in('id', slipsWithoutMatch)
          .eq('user_id', user.id)
          .select('id')

        if (slipUpdateError) {
          results.errors.push('Failed to reject payment slips')
          results.failed += slipsWithoutMatch.length
        } else {
          results.rejected += updated?.length ?? 0
        }
      }

      // Update associated proposals. On terminal rejection, hard-reject so they
      // don't resurface. On re-queue, mark stale so they regenerate on next load.
      const slipCompositeIds = paymentSlipIds.map((id) => `slip:${id}`)
      if (slipCompositeIds.length > 0) {
        await serviceClient
          .from('transaction_proposals')
          .update({ status: isRequeue ? 'stale' : 'rejected' })
          .eq('user_id', user.id)
          .in('composite_id', slipCompositeIds)
          .in('status', ['pending', 'stale'])
      }
    }

    // Log activity
    await serviceClient
      .from('import_activities')
      .insert({
        user_id: user.id,
        activity_type: 'transaction_skipped',
        description: results.rejected === 1
          ? 'Rejected match from review queue'
          : `Rejected ${results.rejected} matches from review queue`,
        transactions_affected: results.rejected,
        metadata: {
          compositeIds: idsToReject,
          reason,
          nextStatus: effectiveStatus,
          results,
        },
      })

    // Return appropriate response based on single vs batch
    if (!emailIds && emailId) {
      return NextResponse.json({
        success: results.rejected > 0,
        message: results.rejected > 0 ? 'Match rejected' : 'Failed to reject',
        reason: reason || undefined,
      })
    }

    return NextResponse.json({
      success: true,
      results: {
        rejected: results.rejected,
        failed: results.failed,
        already_skipped: results.skipped,
        errors: results.errors.length > 0 ? results.errors : undefined,
      },
    })

  } catch (error) {
    console.error('Import reject API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
