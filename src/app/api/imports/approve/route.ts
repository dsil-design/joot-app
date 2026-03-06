import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import type { Json } from '@/lib/supabase/types'
import { parseImportId } from '@/lib/utils/import-id'

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
 * POST /api/imports/approve
 *
 * Approves matches from the review queue.
 * IDs can be:
 * - stmt:<uuid>:<index> (statement items)
 * - email:<uuid> (email items)
 * - <uuid>:<index> (legacy statement format)
 *
 * Request body:
 * - emailIds: string[] - Array of IDs to approve
 * - createTransactions: boolean - Whether to create transaction records
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
      emailIds?: string[]
      createTransactions?: boolean
      scope?: 'high-confidence-pending'
      minConfidence?: number
    }

    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    let { emailIds, createTransactions = false } = body

    // Scope-based approval: fetch all qualifying IDs server-side
    if (body.scope === 'high-confidence-pending' && !emailIds) {
      const minConf = body.minConfidence ?? 90
      // Fetch IDs from the queue API logic
      const { fetchStatementQueueItems } = await import('@/lib/imports/statement-queue-builder')
      const { fetchEmailQueueItems } = await import('@/lib/imports/email-queue-builder')
      const { aggregateQueueItems } = await import('@/lib/imports/queue-aggregator')

      const [stmtItems, emailItemsList] = await Promise.all([
        fetchStatementQueueItems(supabase, user.id, {}),
        fetchEmailQueueItems(supabase, user.id, {}),
      ])

      const result = await aggregateQueueItems(supabase, stmtItems, emailItemsList, {
        statusFilter: 'pending',
        currencyFilter: 'all',
        confidenceFilter: 'all',
        sourceFilter: 'all',
        searchQuery: '',
      })

      emailIds = result.items
        .filter(item => item.status === 'pending' && item.confidence >= minConf)
        .map(item => item.id)

      if (emailIds.length === 0) {
        return NextResponse.json({
          success: true,
          results: { approved: 0, failed: 0, skipped: 0, transactions_created: 0, total_amount: 0, scopeIds: [] },
        })
      }
    }

    // Validate emailIds
    if (!emailIds || !Array.isArray(emailIds) || emailIds.length === 0) {
      return NextResponse.json(
        { error: 'emailIds is required and must be a non-empty array' },
        { status: 400 }
      )
    }

    // Limit batch size
    if (emailIds.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 items can be approved at once' },
        { status: 400 }
      )
    }

    // Parse and separate IDs by type
    const statementIds: { id: string; statementId: string; index: number }[] = []
    const emailItemIds: string[] = []
    const mergedIds: { id: string; emailId: string; statementId: string; index: number }[] = []
    const invalidIds: string[] = []

    for (const id of emailIds) {
      const parsed = parseImportId(id)
      if (!parsed) {
        invalidIds.push(id)
      } else if (parsed.type === 'merged') {
        mergedIds.push({ id, emailId: parsed.emailId, statementId: parsed.statementId, index: parsed.index })
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

    // Use service role client for batch operations
    const serviceClient = createServiceRoleClient()

    // Track results
    const results = {
      success: 0,
      failed: 0,
      skipped: 0,
      totalAmount: 0,
      transactionsCreated: 0,
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

            if (suggestion.status === 'approved') {
              results.skipped++
              continue
            }

            suggestion.status = 'approved'
            hasChanges = true

            // If suggestion already has a matched transaction (pre-matched), set the FK on it
            if (!createTransactions && suggestion.matched_transaction_id) {
              const { error: fkError } = await serviceClient
                .from('transactions')
                .update({
                  source_statement_upload_id: statement.id,
                  source_statement_suggestion_index: idx,
                  source_statement_match_confidence: suggestion.confidence ?? null,
                })
                .eq('id', suggestion.matched_transaction_id)
                .eq('user_id', user.id)

              if (fkError) {
                console.error('Error setting statement FK on matched transaction:', fkError)
                results.errors.push(`Failed to set source reference: ${fkError.message}`)
              }
            }

            if (createTransactions && suggestion.amount && suggestion.transaction_date) {
              const { error: insertError } = await serviceClient
                .from('transactions')
                .insert({
                  user_id: user.id,
                  amount: suggestion.amount,
                  original_currency: (suggestion.currency || 'USD') as 'USD' | 'THB',
                  transaction_type: 'expense' as const,
                  transaction_date: suggestion.transaction_date,
                  description: suggestion.description || 'Imported from statement',
                  source_statement_upload_id: statement.id,
                  source_statement_suggestion_index: idx,
                  source_statement_match_confidence: suggestion.confidence ?? null,
                })

              if (insertError) {
                results.errors.push(`Failed to create transaction: ${insertError.message}`)
              } else {
                results.transactionsCreated++
                results.totalAmount += Math.abs(suggestion.amount)
              }
            }

            results.success++
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
            }
          }
        }
      }
    }

    // --- Process EMAIL items ---
    if (emailItemIds.length > 0) {
      if (createTransactions) {
        // Fetch email rows to create transactions from them
        const { data: emailRows, error: emailFetchError } = await serviceClient
          .from('email_transactions')
          .select('id, amount, currency, transaction_date, email_date, description, subject, status')
          .in('id', emailItemIds)
          .eq('user_id', user.id)

        if (emailFetchError) {
          results.errors.push('Failed to fetch email transactions')
        } else if (emailRows) {
          for (const row of emailRows) {
            if (row.status === 'imported' || row.status === 'matched') {
              results.skipped++
              continue
            }

            // Create transaction
            const { data: newTx, error: insertError } = await serviceClient
              .from('transactions')
              .insert({
                user_id: user.id,
                amount: row.amount ?? 0,
                original_currency: (row.currency || 'USD') as 'USD' | 'THB',
                transaction_type: 'expense' as const,
                transaction_date: row.transaction_date ?? row.email_date?.split('T')[0] ?? new Date().toISOString().split('T')[0],
                description: row.description || row.subject || 'Imported from email',
                source_email_transaction_id: row.id,
              })
              .select('id')
              .single()

            if (insertError) {
              results.failed++
              results.errors.push(`Failed to create transaction for email ${row.id}: ${insertError.message}`)
              continue
            }

            // Update email_transactions status
            const { error: emailStatusError } = await serviceClient
              .from('email_transactions')
              .update({
                status: 'imported',
                matched_transaction_id: newTx.id,
                match_method: 'auto',
                matched_at: new Date().toISOString(),
              })
              .eq('id', row.id)

            if (emailStatusError) {
              console.error('Error updating email_transaction status:', emailStatusError)
              results.errors.push(`Failed to update email status for ${row.id}: ${emailStatusError.message}`)
            }

            results.success++
            results.transactionsCreated++
            results.totalAmount += Math.abs(row.amount ?? 0)
          }
        }
      } else {
        // Just mark as matched (approve without creating transactions)
        const { data: updated, error: emailUpdateError } = await serviceClient
          .from('email_transactions')
          .update({
            status: 'matched',
            matched_at: new Date().toISOString(),
          })
          .in('id', emailItemIds)
          .eq('user_id', user.id)
          .select('id')

        if (emailUpdateError) {
          results.errors.push('Failed to update email transactions')
          results.failed += emailItemIds.length
        } else {
          results.success += updated?.length ?? 0
        }
      }
    }

    // --- Process MERGED items (cross-source pairs) ---
    if (mergedIds.length > 0) {
      for (const merged of mergedIds) {
        // Fetch the statement to get suggestion data
        const { data: statement, error: stmtFetchError } = await serviceClient
          .from('statement_uploads')
          .select('id, extraction_log')
          .eq('id', merged.statementId)
          .eq('user_id', user.id)
          .single()

        if (stmtFetchError || !statement) {
          results.failed++
          results.errors.push(`Statement not found for merged ID ${merged.id}`)
          continue
        }

        const extractionLog = statement.extraction_log as ExtractionLog | null
        const suggestions = extractionLog?.suggestions || []

        if (merged.index < 0 || merged.index >= suggestions.length) {
          results.failed++
          results.errors.push(`Invalid suggestion index for merged ID ${merged.id}`)
          continue
        }

        const suggestion = suggestions[merged.index]

        if (suggestion.status === 'approved') {
          results.skipped++
          continue
        }

        // Create ONE transaction from statement data (USD = primary)
        const { data: newTx, error: txError } = await serviceClient
          .from('transactions')
          .insert({
            user_id: user.id,
            amount: suggestion.amount,
            original_currency: (suggestion.currency || 'USD') as 'USD' | 'THB',
            transaction_type: 'expense' as const,
            transaction_date: suggestion.transaction_date,
            description: suggestion.description || 'Imported from cross-source match',
            source_email_transaction_id: merged.emailId,
            source_statement_upload_id: merged.statementId,
            source_statement_suggestion_index: merged.index,
            source_statement_match_confidence: suggestion.confidence ?? null,
          })
          .select('id')
          .single()

        if (txError || !newTx) {
          results.failed++
          results.errors.push(`Failed to create transaction for merged ID ${merged.id}: ${txError?.message}`)
          continue
        }

        // Update statement suggestion
        suggestions[merged.index] = {
          ...suggestion,
          status: 'approved',
          matched_transaction_id: newTx.id,
        }

        const { error: stmtUpdateError } = await serviceClient
          .from('statement_uploads')
          .update({
            extraction_log: { ...extractionLog, suggestions } as unknown as Json,
          })
          .eq('id', statement.id)

        if (stmtUpdateError) {
          console.error('Error updating statement suggestion (merged):', stmtUpdateError)
          results.errors.push(`Failed to update statement for merged ID ${merged.id}: ${stmtUpdateError.message}`)
        }

        // Update email_transaction
        const { error: emailUpdateError } = await serviceClient
          .from('email_transactions')
          .update({
            matched_transaction_id: newTx.id,
            status: 'imported',
            match_method: 'cross_source',
            matched_at: new Date().toISOString(),
          })
          .eq('id', merged.emailId)
          .eq('user_id', user.id)

        if (emailUpdateError) {
          console.error('Error updating email_transaction (merged):', emailUpdateError)
          results.errors.push(`Failed to update email for merged ID ${merged.id}: ${emailUpdateError.message}`)
        }

        results.success++
        results.transactionsCreated++
        results.totalAmount += Math.abs(suggestion.amount)
      }
    }

    // Log activity
    await serviceClient
      .from('import_activities')
      .insert({
        user_id: user.id,
        activity_type: 'batch_import',
        description: `Approved ${results.success} matches from review queue`,
        transactions_affected: results.success,
        total_amount: results.totalAmount > 0 ? results.totalAmount : null,
        metadata: {
          compositeIds: emailIds,
          createTransactions,
          results,
        },
      })

    return NextResponse.json({
      success: true,
      results: {
        approved: results.success,
        failed: results.failed,
        skipped: results.skipped,
        transactions_created: results.transactionsCreated,
        total_amount: results.totalAmount,
        errors: results.errors.length > 0 ? results.errors : undefined,
      },
    })

  } catch (error) {
    console.error('Import approve API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
