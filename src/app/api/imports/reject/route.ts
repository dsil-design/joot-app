import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { parseImportId } from '@/lib/utils/import-id'
import { updateStatementReviewStatus } from '@/lib/utils/statement-status'

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
      nextStatus?: 'pending_review' | 'waiting_for_statement' | 'skipped'
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
    const validStatuses = ['pending_review', 'waiting_for_statement', 'skipped'] as const
    if (nextStatus && !validStatuses.includes(nextStatus)) {
      return NextResponse.json(
        { error: `nextStatus must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    const effectiveStatus = nextStatus || 'skipped'

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
    const statementIds: { id: string; statementId: string; index: number }[] = []
    const emailItemIds: string[] = []
    const invalidIds: string[] = []

    for (const id of idsToReject) {
      const parsed = parseImportId(id)
      if (!parsed) {
        invalidIds.push(id)
      } else if (parsed.type === 'merged') {
        // Decompose merged into both statement rejection + email rejection
        statementIds.push({ id, statementId: parsed.statementId, index: parsed.index })
        emailItemIds.push(parsed.emailId)
      } else if (parsed.type === 'statement') {
        statementIds.push({ id, statementId: parsed.statementId, index: parsed.index })
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

            suggestion.status = effectiveStatus === 'pending_review' ? 'pending' : 'rejected'
            hasChanges = true
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
        .select('id, matched_transaction_id, rejected_transaction_ids')
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
