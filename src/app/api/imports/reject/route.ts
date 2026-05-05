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
      /**
       * For merged composite IDs: when set, only reject that specific source's
       * participation in the grouping. Other sources in the merged item are
       * left completely untouched, and the rejected source's pair-rejection
       * keys are updated so the aggregator won't re-form the same pairing.
       */
      rejectSource?: 'email' | 'statement' | 'slip'
    }

    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    const { emailId, emailIds, reason, nextStatus, rejectSource } = body

    if (rejectSource && !['email', 'statement', 'slip'].includes(rejectSource)) {
      return NextResponse.json(
        { error: `rejectSource must be one of: email, statement, slip` },
        { status: 400 }
      )
    }

    // Validate nextStatus if provided
    const validStatuses = ['pending_review', 'waiting_for_statement', 'waiting_for_email', 'waiting_for_slip', 'skipped'] as const
    if (nextStatus && !validStatuses.includes(nextStatus)) {
      return NextResponse.json(
        { error: `nextStatus must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    const effectiveStatus = nextStatus || 'skipped'
    // When re-queueing OR parking in a waiting_for_* state, items stay live so
    // the queue aggregator's cross-source pairer can still find them a partner.
    // Proposals are marked stale (not rejected) so they regenerate on next load.
    const isRequeue = effectiveStatus === 'pending_review'
    const isWaiting = effectiveStatus.startsWith('waiting_for_')
    const keepAlive = isRequeue || isWaiting

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
    // Track statement items that came from merged IDs. When keeping the email
    // alive (re-queue / waiting_for_*), we leave the statement suggestion
    // pending and instead record the rejected pair key on the email so the
    // cross-source pairer won't re-pair the same email+statement again —
    // while still allowing the statement to stand on its own in the queue.
    const mergedStatementKeys = new Set<string>()
    // Map of emailId → statement pair keys (`${statementId}:${index}`) the
    // user has rejected as a cross-source pairing for that email.
    const emailRejectedPairKeys = new Map<string, string[]>()
    // Map of slipId → counterpart composite keys (email:<id> or stmt:<id>:<idx>)
    // the user has rejected as a pairing for that slip.
    const slipRejectedPairKeys = new Map<string, string[]>()

    const addEmailPairKey = (emailId: string, key: string) => {
      const existing = emailRejectedPairKeys.get(emailId) || []
      if (!existing.includes(key)) existing.push(key)
      emailRejectedPairKeys.set(emailId, existing)
    }
    const addSlipPairKey = (slipId: string, key: string) => {
      const existing = slipRejectedPairKeys.get(slipId) || []
      if (!existing.includes(key)) existing.push(key)
      slipRejectedPairKeys.set(slipId, existing)
    }

    for (const id of idsToReject) {
      const parsed = parseImportId(id)
      if (!parsed) {
        invalidIds.push(id)
      } else if (parsed.type === 'merged') {
        // email + statement pair
        if (rejectSource === 'email' || rejectSource === 'statement') {
          // Surgical: break the pair, but leave both sources alive. Track
          // the rejected pairing on the email side so re-pairing won't happen.
          addEmailPairKey(parsed.emailId, `${parsed.statementId}:${parsed.index}`)
          // We also need to wipe any existing matched_transaction_id on the
          // email side only if rejectSource === 'email' (the user is saying
          // the email side is wrong). Push into emailItemIds only in that
          // case so the status/match reset runs; otherwise touch nothing.
          if (rejectSource === 'email') {
            emailItemIds.push(parsed.emailId)
          }
          // Statement is never touched on surgical reject — leave its pending
          // status + matched transaction intact so it stands on its own.
        } else {
          // Top-level full reject: both sides
          statementIds.push({ id, statementId: parsed.statementId, index: parsed.index, fromMerged: true })
          mergedStatementKeys.add(`${parsed.statementId}:${parsed.index}`)
          emailItemIds.push(parsed.emailId)
          addEmailPairKey(parsed.emailId, `${parsed.statementId}:${parsed.index}`)
        }
      } else if (parsed.type === 'merged_slip_email') {
        if (rejectSource) {
          // Surgical: break slip↔email. Track on slip.
          addSlipPairKey(parsed.slipId, `email:${parsed.emailId}`)
          if (rejectSource === 'slip') paymentSlipIds.push(parsed.slipId)
          else if (rejectSource === 'email') emailItemIds.push(parsed.emailId)
        } else {
          paymentSlipIds.push(parsed.slipId)
          emailItemIds.push(parsed.emailId)
        }
      } else if (parsed.type === 'merged_slip_stmt') {
        if (rejectSource) {
          addSlipPairKey(parsed.slipId, `stmt:${parsed.statementId}:${parsed.index}`)
          if (rejectSource === 'slip') paymentSlipIds.push(parsed.slipId)
          // statement section: leave statement untouched (no ids pushed)
        } else {
          paymentSlipIds.push(parsed.slipId)
          statementIds.push({ id, statementId: parsed.statementId, index: parsed.index })
        }
      } else if (parsed.type === 'merged_slip_email_stmt') {
        if (rejectSource === 'slip') {
          // Remove slip from the 3-way; other two re-merge naturally.
          addSlipPairKey(parsed.slipId, `email:${parsed.emailId}`)
          addSlipPairKey(parsed.slipId, `stmt:${parsed.statementId}:${parsed.index}`)
          paymentSlipIds.push(parsed.slipId)
        } else if (rejectSource === 'email') {
          // Email out of the 3-way: break email↔stmt and slip↔email.
          addEmailPairKey(parsed.emailId, `${parsed.statementId}:${parsed.index}`)
          addSlipPairKey(parsed.slipId, `email:${parsed.emailId}`)
          emailItemIds.push(parsed.emailId)
        } else if (rejectSource === 'statement') {
          // Statement out of the 3-way: break email↔stmt and slip↔stmt.
          addEmailPairKey(parsed.emailId, `${parsed.statementId}:${parsed.index}`)
          addSlipPairKey(parsed.slipId, `stmt:${parsed.statementId}:${parsed.index}`)
        } else {
          // Full reject
          paymentSlipIds.push(parsed.slipId)
          emailItemIds.push(parsed.emailId)
          statementIds.push({ id, statementId: parsed.statementId, index: parsed.index, fromMerged: true })
          mergedStatementKeys.add(`${parsed.statementId}:${parsed.index}`)
          addEmailPairKey(parsed.emailId, `${parsed.statementId}:${parsed.index}`)
        }
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

            // On keepAlive (re-queue / waiting_for_*) the statement suggestion
            // stays pending even for merged rejections. The rejected email↔
            // statement pairing is tracked via email.rejected_pair_keys so the
            // cross-source pairer won't re-pair the same pair, while still
            // letting the statement stand on its own in the queue.
            const isMerged = mergedStatementKeys.has(`${statement.id}:${idx}`)

            // Merged reject of a statement entry that already has its own tx
            // link (status='approved' + matched_transaction_id): only the
            // email↔stmt pairing is being rejected; the statement's own link
            // is independent and must stay intact. Leave the suggestion fully
            // alone — flipping it to 'rejected' here is what produced the
            // drift where reopen later cleared a still-valid match.
            if (isMerged && suggestion.status === 'approved' && suggestion.matched_transaction_id) {
              results.skipped++
              continue
            }

            const keepSuggestionPending = keepAlive
            suggestion.status = keepSuggestionPending ? 'pending' : 'rejected'
            // For non-merged rejects we also clear a stale matched transaction
            // so the next pairing attempt isn't biased. For merged rejects we
            // leave the suggestion's match intact so the statement's own
            // transaction pairing is preserved.
            if (keepSuggestionPending && !isMerged && suggestion.matched_transaction_id) {
              suggestion.matched_transaction_id = undefined
              suggestion.confidence = 0
              suggestion.is_new = true
              suggestion.reasons = []
            }
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
        .select('id, matched_transaction_id, rejected_transaction_ids, rejected_pair_keys, from_address, vendor_name_raw, parser_key, amount, currency, match_confidence')
        .in('id', emailItemIds)
        .eq('user_id', user.id)
        .not('matched_transaction_id', 'is', null)

      // For each email with a match, append the matched_transaction_id to rejected list and clear the match
      if (emailsWithMatch && emailsWithMatch.length > 0) {
        for (const email of emailsWithMatch) {
          const existingRejected = (email.rejected_transaction_ids || []) as string[]
          const matchedId = email.matched_transaction_id as string
          const existingPairKeys = ((email as { rejected_pair_keys?: string[] }).rejected_pair_keys || []) as string[]
          const newPairKeys = emailRejectedPairKeys.get(email.id) || []
          const mergedPairKeys = Array.from(new Set([...existingPairKeys, ...newPairKeys]))
          const updatePayload: Record<string, unknown> = {
            status: effectiveStatus,
            matched_transaction_id: null,
            match_confidence: null,
            match_method: null,
            rejected_pair_keys: mergedPairKeys,
          }
          if (!existingRejected.includes(matchedId)) {
            updatePayload.rejected_transaction_ids = [...existingRejected, matchedId]
          }
          await serviceClient
            .from('email_transactions')
            .update(updatePayload)
            .eq('id', email.id)
            .eq('user_id', user.id)

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
        // Handle rejected_pair_keys for unmatched emails individually (need read-modify-write)
        const emailsNeedingPairKeys = emailsWithoutMatch.filter((id) => emailRejectedPairKeys.has(id))
        const emailsPlainUpdate = emailsWithoutMatch.filter((id) => !emailRejectedPairKeys.has(id))

        if (emailsPlainUpdate.length > 0) {
          const { data: updated, error: emailUpdateError } = await serviceClient
            .from('email_transactions')
            .update({ status: effectiveStatus })
            .in('id', emailsPlainUpdate)
            .eq('user_id', user.id)
            .select('id')

          if (emailUpdateError) {
            results.errors.push('Failed to update email transactions')
            results.failed += emailsPlainUpdate.length
          } else {
            results.rejected += updated?.length ?? 0
          }
        }

        if (emailsNeedingPairKeys.length > 0) {
          const { data: existing } = await serviceClient
            .from('email_transactions')
            .select('id, rejected_pair_keys')
            .in('id', emailsNeedingPairKeys)
            .eq('user_id', user.id) as { data: Array<{ id: string; rejected_pair_keys?: string[] }> | null }

          for (const row of existing || []) {
            const existingPairKeys = (row.rejected_pair_keys || []) as string[]
            const newPairKeys = emailRejectedPairKeys.get(row.id) || []
            const mergedPairKeys = Array.from(new Set([...existingPairKeys, ...newPairKeys]))
            const { error: updErr } = await serviceClient
              .from('email_transactions')
              .update({ status: effectiveStatus, rejected_pair_keys: mergedPairKeys } as Record<string, unknown>)
              .eq('id', row.id)
              .eq('user_id', user.id)
            if (updErr) {
              results.failed++
              results.errors.push(`Failed to update email ${row.id}`)
            } else {
              results.rejected++
            }
          }
        }
      }

      // Update associated proposals. On terminal rejection, hard-reject so they
      // don't resurface. On re-queue, mark stale so they regenerate on next load.
      const compositeIds = emailItemIds.map((id) => `email:${id}`)
      if (compositeIds.length > 0) {
        await serviceClient
          .from('transaction_proposals')
          .update({ status: keepAlive ? 'stale' : 'rejected' })
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
              review_status: keepAlive ? 'pending' : 'rejected',
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
          .update({ review_status: keepAlive ? 'pending' : 'rejected' })
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
          .update({ status: keepAlive ? 'stale' : 'rejected' })
          .eq('user_id', user.id)
          .in('composite_id', slipCompositeIds)
          .in('status', ['pending', 'stale'])
      }
    }

    // --- Flush pair-key updates ---
    // Idempotent read-merge-write of rejected_pair_keys for any emails or
    // slips whose pair-rejection keys were recorded but weren't already
    // processed in the per-source loops (e.g., surgical rejects that only
    // touch the counterpart's tracking).
    if (emailRejectedPairKeys.size > 0) {
      const emailIdsForKeys = Array.from(emailRejectedPairKeys.keys())
      const { data: rows } = await serviceClient
        .from('email_transactions')
        .select('id, rejected_pair_keys')
        .in('id', emailIdsForKeys)
        .eq('user_id', user.id) as { data: Array<{ id: string; rejected_pair_keys?: string[] }> | null }

      for (const row of rows || []) {
        const existing = (row.rejected_pair_keys || []) as string[]
        const newKeys = emailRejectedPairKeys.get(row.id) || []
        const merged = Array.from(new Set([...existing, ...newKeys]))
        if (merged.length === existing.length) continue
        await serviceClient
          .from('email_transactions')
          .update({ rejected_pair_keys: merged } as Record<string, unknown>)
          .eq('id', row.id)
          .eq('user_id', user.id)
      }
    }

    if (slipRejectedPairKeys.size > 0) {
      const slipIdsForKeys = Array.from(slipRejectedPairKeys.keys())
      const { data: rows } = await serviceClient
        .from('payment_slip_uploads')
        .select('id, rejected_pair_keys')
        .in('id', slipIdsForKeys)
        .eq('user_id', user.id) as { data: Array<{ id: string; rejected_pair_keys?: string[] }> | null }

      for (const row of rows || []) {
        const existing = (row.rejected_pair_keys || []) as string[]
        const newKeys = slipRejectedPairKeys.get(row.id) || []
        const merged = Array.from(new Set([...existing, ...newKeys]))
        if (merged.length === existing.length) continue
        await serviceClient
          .from('payment_slip_uploads')
          .update({ rejected_pair_keys: merged } as Record<string, unknown>)
          .eq('id', row.id)
          .eq('user_id', user.id)
      }
      // Bump results.rejected if nothing else was processed (surgical-only path)
      if (results.rejected === 0 && slipRejectedPairKeys.size > 0) {
        results.rejected += slipRejectedPairKeys.size
      }
    }
    if (emailRejectedPairKeys.size > 0 && results.rejected === 0) {
      results.rejected += emailRejectedPairKeys.size
    }

    // Also mark any affected proposals stale so they regenerate on next load
    // (covers the surgical case where item ids weren't processed above).
    {
      const staleCompositeIds: string[] = []
      for (const emailIdKey of emailRejectedPairKeys.keys()) staleCompositeIds.push(`email:${emailIdKey}`)
      for (const slipIdKey of slipRejectedPairKeys.keys()) staleCompositeIds.push(`slip:${slipIdKey}`)
      if (staleCompositeIds.length > 0) {
        await serviceClient
          .from('transaction_proposals')
          .update({ status: 'stale' })
          .eq('user_id', user.id)
          .in('composite_id', staleCompositeIds)
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
