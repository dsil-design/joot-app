import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import type { Json } from '@/lib/supabase/types'
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
      const { fetchPaymentSlipQueueItems } = await import('@/lib/imports/payment-slip-queue-builder')
      const { aggregateQueueItems } = await import('@/lib/imports/queue-aggregator')

      const [stmtItems, emailItemsList, slipItems] = await Promise.all([
        fetchStatementQueueItems(supabase, user.id, {}),
        fetchEmailQueueItems(supabase, user.id, {}),
        fetchPaymentSlipQueueItems(supabase, user.id, {}),
      ])

      const result = await aggregateQueueItems(supabase, stmtItems, emailItemsList, {
        statusFilter: 'pending',
        currencyFilter: 'all',
        confidenceFilter: 'all',
        sourceFilter: 'all',
        searchQuery: '',
      }, slipItems)

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
    const paymentSlipIds: string[] = []
    const mergedSlipEmailIds: { id: string; slipId: string; emailId: string }[] = []
    const mergedSlipStmtIds: { id: string; slipId: string; statementId: string; index: number }[] = []
    const selfTransferIds: { id: string; debitStatementId: string; debitIndex: number; creditStatementId: string; creditIndex: number }[] = []
    const invalidIds: string[] = []

    for (const id of emailIds) {
      const parsed = parseImportId(id)
      if (!parsed) {
        invalidIds.push(id)
      } else if (parsed.type === 'self_transfer') {
        selfTransferIds.push({ id, debitStatementId: parsed.debitStatementId, debitIndex: parsed.debitIndex, creditStatementId: parsed.creditStatementId, creditIndex: parsed.creditIndex })
      } else if (parsed.type === 'merged') {
        mergedIds.push({ id, emailId: parsed.emailId, statementId: parsed.statementId, index: parsed.index })
      } else if (parsed.type === 'merged_slip_email') {
        mergedSlipEmailIds.push({ id, slipId: parsed.slipId, emailId: parsed.emailId })
      } else if (parsed.type === 'merged_slip_stmt') {
        mergedSlipStmtIds.push({ id, slipId: parsed.slipId, statementId: parsed.statementId, index: parsed.index })
      } else if (parsed.type === 'statement') {
        statementIds.push({ id, statementId: parsed.statementId, index: parsed.index })
      } else if (parsed.type === 'payment_slip') {
        paymentSlipIds.push(parsed.slipId)
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
            let stmtTransactionId: string | undefined
            if (!createTransactions && suggestion.matched_transaction_id) {
              stmtTransactionId = suggestion.matched_transaction_id
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
              const { data: newStmtTx, error: insertError } = await serviceClient
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
                .select('id')
                .single()

              if (insertError) {
                results.errors.push(`Failed to create transaction: ${insertError.message}`)
              } else {
                stmtTransactionId = newStmtTx?.id
                results.transactionsCreated++
                results.totalAmount += Math.abs(suggestion.amount)
              }
            }

            // Learn from this decision (fire-and-forget)
            if (stmtTransactionId) {
              const { data: stmtTxData } = await serviceClient
                .from('transactions')
                .select('vendor_id, payment_method_id')
                .eq('id', stmtTransactionId)
                .single()

              recordDecision(serviceClient, {
                userId: user.id,
                decisionType: createTransactions ? 'approve_create' : 'approve_match',
                sourceType: 'statement',
                compositeId: `stmt:${statement.id}:${idx}`,
                statementUploadId: statement.id,
                suggestionIndex: idx,
                transactionId: stmtTransactionId,
                vendorId: stmtTxData?.vendor_id || undefined,
                paymentMethodId: stmtTxData?.payment_method_id || undefined,
                statementDescription: suggestion.description,
                amount: suggestion.amount,
                currency: suggestion.currency,
                matchConfidence: suggestion.confidence,
                wasAutoMatched: !createTransactions,
              }).catch((err) => console.error('Decision learning error:', err))
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
            } else {
              await updateStatementReviewStatus(serviceClient, statement.id)
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
          .select('id, amount, currency, transaction_date, email_date, description, subject, status, from_address, vendor_name_raw, parser_key')
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

            // Learn from this decision (fire-and-forget)
            recordDecision(serviceClient, {
              userId: user.id,
              decisionType: 'approve_create',
              sourceType: 'email',
              compositeId: `email:${row.id}`,
              emailTransactionId: row.id,
              transactionId: newTx.id,
              emailFromAddress: row.from_address,
              emailVendorNameRaw: row.vendor_name_raw,
              emailParserKey: row.parser_key,
              amount: row.amount,
              currency: row.currency,
            }).catch((err) => console.error('Decision learning error:', err))

            results.success++
            results.transactionsCreated++
            results.totalAmount += Math.abs(row.amount ?? 0)
          }
        }
      } else {
        // Just mark as matched (approve without creating transactions)
        // Fetch email details for learning before updating
        const { data: emailDetailsForLearning } = await serviceClient
          .from('email_transactions')
          .select('id, from_address, vendor_name_raw, parser_key, amount, currency, matched_transaction_id, match_confidence')
          .in('id', emailItemIds)
          .eq('user_id', user.id)

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

          // Learn from each approved email (fire-and-forget)
          if (emailDetailsForLearning) {
            for (const emailDetail of emailDetailsForLearning) {
              if (emailDetail.matched_transaction_id) {
                const { data: matchedTx } = await serviceClient
                  .from('transactions')
                  .select('vendor_id')
                  .eq('id', emailDetail.matched_transaction_id)
                  .single()

                recordDecision(serviceClient, {
                  userId: user.id,
                  decisionType: 'approve_match',
                  sourceType: 'email',
                  compositeId: `email:${emailDetail.id}`,
                  emailTransactionId: emailDetail.id,
                  transactionId: emailDetail.matched_transaction_id,
                  vendorId: matchedTx?.vendor_id || undefined,
                  emailFromAddress: emailDetail.from_address,
                  emailVendorNameRaw: emailDetail.vendor_name_raw,
                  emailParserKey: emailDetail.parser_key,
                  amount: emailDetail.amount,
                  currency: emailDetail.currency,
                  matchConfidence: emailDetail.match_confidence,
                  wasAutoMatched: true,
                }).catch((err) => console.error('Decision learning error:', err))
              }
            }
          }
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
        const alreadyApproved = suggestion.status === 'approved'

        // Determine the transaction ID to link to:
        // - If the suggestion already has a matched transaction, link to it (avoid duplicates)
        // - Otherwise, create a new transaction
        let transactionId: string | null = suggestion.matched_transaction_id ?? null
        let createdNewTransaction = false

        if (!alreadyApproved) {
          if (transactionId) {
            // Link existing transaction to this cross-source match
            const { error: fkError } = await serviceClient
              .from('transactions')
              .update({
                source_email_transaction_id: merged.emailId,
                source_statement_upload_id: merged.statementId,
                source_statement_suggestion_index: merged.index,
                source_statement_match_confidence: suggestion.confidence ?? null,
              })
              .eq('id', transactionId)
              .eq('user_id', user.id)

            if (fkError) {
              console.error('Error linking existing transaction for merged item:', fkError)
              results.errors.push(`Failed to link existing transaction for merged ID ${merged.id}: ${fkError.message}`)
            }
          } else {
            // Create ONE transaction from statement data
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
              console.error('Error creating transaction for merged item:', txError)
              results.errors.push(`Failed to create transaction for merged ID ${merged.id}: ${txError?.message}`)
              // Continue to update statuses anyway so items don't reappear in the queue
            } else {
              transactionId = newTx.id
              createdNewTransaction = true
            }
          }

          // Update statement suggestion status to 'approved'
          suggestions[merged.index] = {
            ...suggestion,
            status: 'approved',
            ...(transactionId ? { matched_transaction_id: transactionId } : {}),
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
          } else {
            await updateStatementReviewStatus(serviceClient, statement.id)
          }
        }

        // Always update email_transaction status (even if statement was already approved —
        // the email may not have been updated in a previous partial approval)
        const { error: emailUpdateError } = await serviceClient
          .from('email_transactions')
          .update({
            ...(transactionId ? { matched_transaction_id: transactionId } : {}),
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

        // Also approve any pending payment slips that match the same transaction.
        // The dedup consolidation may group 3+ sources (email + statement + payment slip)
        // but the merged ID only encodes email + statement. Without this, the slip
        // remains pending and the consolidated item keeps reappearing.
        if (transactionId) {
          const { data: linkedSlips } = await serviceClient
            .from('payment_slip_uploads')
            .select('id')
            .eq('user_id', user.id)
            .eq('matched_transaction_id', transactionId)
            .eq('review_status', 'pending')

          if (linkedSlips && linkedSlips.length > 0) {
            const slipIds = linkedSlips.map(s => s.id)
            const { error: slipUpdateError } = await serviceClient
              .from('payment_slip_uploads')
              .update({ review_status: 'approved', status: 'done' })
              .in('id', slipIds)
              .eq('user_id', user.id)

            if (slipUpdateError) {
              console.error('Error approving linked payment slips:', slipUpdateError)
              results.errors.push(`Failed to approve linked payment slips: ${slipUpdateError.message}`)
            }
          }
        }

        // Learn from this merged decision (fire-and-forget)
        if (transactionId) {
          const { data: mergedTxData } = await serviceClient
            .from('transactions')
            .select('vendor_id, payment_method_id')
            .eq('id', transactionId)
            .single()

          recordDecision(serviceClient, {
            userId: user.id,
            decisionType: createdNewTransaction ? 'approve_create' : 'approve_match',
            sourceType: 'merged',
            compositeId: merged.id,
            statementUploadId: merged.statementId,
            suggestionIndex: merged.index,
            emailTransactionId: merged.emailId,
            transactionId,
            vendorId: mergedTxData?.vendor_id || undefined,
            paymentMethodId: mergedTxData?.payment_method_id || undefined,
            statementDescription: suggestion.description,
            amount: suggestion.amount,
            currency: suggestion.currency,
            matchConfidence: suggestion.confidence,
            wasAutoMatched: !createdNewTransaction,
          }).catch((err) => console.error('Decision learning error:', err))
        }

        results.success++
        if (createdNewTransaction) {
          results.transactionsCreated++
        }
        results.totalAmount += Math.abs(suggestion.amount)
      }
    }

    // --- Process PAYMENT SLIP items ---
    if (paymentSlipIds.length > 0) {
      const { data: slips, error: slipFetchError } = await serviceClient
        .from('payment_slip_uploads')
        .select('id, amount, currency, transaction_date, memo, sender_name, recipient_name, detected_direction, review_status, matched_transaction_id, match_confidence, payment_method_id')
        .in('id', paymentSlipIds)
        .eq('user_id', user.id)

      if (slipFetchError) {
        results.errors.push('Failed to fetch payment slips')
      } else if (slips) {
        for (const slip of slips) {
          if (slip.review_status === 'approved') {
            results.skipped++
            continue
          }

          if (createTransactions && slip.amount && slip.transaction_date) {
            const defaultTxType = slip.detected_direction === 'income' ? 'income' : 'expense'
            const direction = slip.detected_direction === 'income' ? 'From' : 'To'
            const counterparty = slip.detected_direction === 'income'
              ? slip.sender_name
              : slip.recipient_name
            const defaultDescription = slip.memo || `${direction} ${counterparty || 'unknown'}`

            // Look up existing proposal to enrich with vendor/tags/payment method
            const slipCompositeId = `slip:${slip.id}`
            const { data: proposal } = await serviceClient
              .from('transaction_proposals')
              .select('id, proposed_vendor_id, proposed_tag_ids, proposed_payment_method_id, proposed_transaction_type, proposed_description')
              .eq('composite_id', slipCompositeId)
              .eq('user_id', user.id)
              .in('status', ['pending', 'stale'])
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()

            const { data: newTx, error: insertError } = await serviceClient
              .from('transactions')
              .insert({
                user_id: user.id,
                amount: slip.amount,
                original_currency: (slip.currency || 'THB') as 'USD' | 'THB',
                transaction_type: (proposal?.proposed_transaction_type || defaultTxType) as 'expense' | 'income' | 'transfer',
                transaction_date: slip.transaction_date,
                description: proposal?.proposed_description || defaultDescription,
                vendor_id: proposal?.proposed_vendor_id || null,
                payment_method_id: proposal?.proposed_payment_method_id || slip.payment_method_id || null,
                source_payment_slip_id: slip.id,
              })
              .select('id')
              .single()

            if (insertError || !newTx) {
              results.failed++
              results.errors.push(`Failed to create transaction for slip ${slip.id}: ${insertError?.message}`)
              continue
            }

            // Apply proposal tags if available
            const tagIds = proposal?.proposed_tag_ids as string[] | null
            if (tagIds && tagIds.length > 0) {
              await serviceClient
                .from('transaction_tags')
                .insert(tagIds.map((tagId) => ({
                  transaction_id: newTx.id,
                  tag_id: tagId,
                })))
            }

            // Mark proposal as accepted
            if (proposal) {
              await serviceClient
                .from('transaction_proposals')
                .update({
                  status: 'accepted',
                  created_transaction_id: newTx.id,
                })
                .eq('id', proposal.id)
            }

            // Learn from this decision (fire-and-forget)
            const slipCounterparty = slip.detected_direction === 'income'
              ? slip.sender_name : slip.recipient_name
            recordDecision(serviceClient, {
              userId: user.id,
              decisionType: 'approve_create',
              sourceType: 'payment_slip',
              compositeId: `slip:${slip.id}`,
              paymentSlipId: slip.id,
              transactionId: newTx.id,
              vendorId: proposal?.proposed_vendor_id || undefined,
              paymentMethodId: proposal?.proposed_payment_method_id || slip.payment_method_id || undefined,
              tagIds: (proposal?.proposed_tag_ids as string[] | null) || undefined,
              slipCounterpartyName: slipCounterparty || undefined,
              amount: Number(slip.amount),
              currency: slip.currency,
            }).catch((err) => console.error('Decision learning error:', err))

            results.transactionsCreated++
            results.totalAmount += Math.abs(Number(slip.amount))
          } else if (!createTransactions && slip.matched_transaction_id) {
            // Link existing transaction
            const { error: fkError } = await serviceClient
              .from('transactions')
              .update({ source_payment_slip_id: slip.id })
              .eq('id', slip.matched_transaction_id)
              .eq('user_id', user.id)

            if (fkError) {
              results.errors.push(`Failed to link transaction for slip ${slip.id}: ${fkError.message}`)
            } else {
              const { data: matchedSlipTx } = await serviceClient
                .from('transactions')
                .select('vendor_id')
                .eq('id', slip.matched_transaction_id)
                .single()

              const matchSlipCounterparty = slip.detected_direction === 'income'
                ? slip.sender_name : slip.recipient_name
              recordDecision(serviceClient, {
                userId: user.id,
                decisionType: 'approve_match',
                sourceType: 'payment_slip',
                compositeId: `slip:${slip.id}`,
                paymentSlipId: slip.id,
                transactionId: slip.matched_transaction_id,
                vendorId: matchedSlipTx?.vendor_id || undefined,
                paymentMethodId: slip.payment_method_id || undefined,
                slipCounterpartyName: matchSlipCounterparty || undefined,
                amount: Number(slip.amount),
                currency: slip.currency,
                matchConfidence: slip.match_confidence,
                wasAutoMatched: true,
              }).catch((err) => console.error('Decision learning error:', err))
            }
          }

          // Update slip review status
          await serviceClient
            .from('payment_slip_uploads')
            .update({ review_status: 'approved', status: 'done' })
            .eq('id', slip.id)

          results.success++
        }
      }
    }

    // --- Process MERGED SLIP+EMAIL items ---
    if (mergedSlipEmailIds.length > 0) {
      for (const merged of mergedSlipEmailIds) {
        // Fetch the slip data
        const { data: slip } = await serviceClient
          .from('payment_slip_uploads')
          .select('id, amount, currency, transaction_date, memo, sender_name, recipient_name, detected_direction, payment_method_id')
          .eq('id', merged.slipId)
          .eq('user_id', user.id)
          .single()

        if (!slip || !slip.amount || !slip.transaction_date) {
          results.failed++
          results.errors.push(`Slip not found for merged ID ${merged.id}`)
          continue
        }

        const transactionType = slip.detected_direction === 'income' ? 'income' : 'expense'
        const direction = slip.detected_direction === 'income' ? 'From' : 'To'
        const counterparty = slip.detected_direction === 'income' ? slip.sender_name : slip.recipient_name
        const description = slip.memo || `${direction} ${counterparty || 'unknown'}`

        // Create one transaction from the slip (authoritative amount)
        const { data: newTx, error: txError } = await serviceClient
          .from('transactions')
          .insert({
            user_id: user.id,
            amount: slip.amount,
            original_currency: (slip.currency || 'THB') as 'USD' | 'THB',
            transaction_type: transactionType as 'expense' | 'income' | 'transfer',
            transaction_date: slip.transaction_date,
            description,
            payment_method_id: slip.payment_method_id || null,
            source_payment_slip_id: merged.slipId,
            source_email_transaction_id: merged.emailId,
          })
          .select('id')
          .single()

        if (txError || !newTx) {
          results.failed++
          results.errors.push(`Failed to create transaction for ${merged.id}: ${txError?.message}`)
          continue
        }

        // Update slip
        await serviceClient
          .from('payment_slip_uploads')
          .update({ review_status: 'approved', status: 'done' })
          .eq('id', merged.slipId)

        // Update email
        await serviceClient
          .from('email_transactions')
          .update({
            status: 'imported',
            matched_transaction_id: newTx.id,
            match_method: 'cross_source',
            matched_at: new Date().toISOString(),
          })
          .eq('id', merged.emailId)
          .eq('user_id', user.id)

        // Learn from this decision (fire-and-forget)
        recordDecision(serviceClient, {
          userId: user.id,
          decisionType: 'approve_create',
          sourceType: 'merged_slip_email',
          compositeId: merged.id,
          paymentSlipId: merged.slipId,
          emailTransactionId: merged.emailId,
          transactionId: newTx.id,
          paymentMethodId: slip.payment_method_id || undefined,
          slipCounterpartyName: counterparty || undefined,
          amount: Number(slip.amount),
          currency: slip.currency,
        }).catch((err) => console.error('Decision learning error:', err))

        results.success++
        results.transactionsCreated++
        results.totalAmount += Math.abs(Number(slip.amount))
      }
    }

    // --- Process MERGED SLIP+STATEMENT items ---
    if (mergedSlipStmtIds.length > 0) {
      for (const merged of mergedSlipStmtIds) {
        const { data: slip } = await serviceClient
          .from('payment_slip_uploads')
          .select('id, amount, currency, transaction_date, memo, sender_name, recipient_name, detected_direction, payment_method_id')
          .eq('id', merged.slipId)
          .eq('user_id', user.id)
          .single()

        if (!slip || !slip.amount || !slip.transaction_date) {
          results.failed++
          results.errors.push(`Slip not found for merged ID ${merged.id}`)
          continue
        }

        const transactionType = slip.detected_direction === 'income' ? 'income' : 'expense'
        const direction = slip.detected_direction === 'income' ? 'From' : 'To'
        const counterparty = slip.detected_direction === 'income' ? slip.sender_name : slip.recipient_name
        const description = slip.memo || `${direction} ${counterparty || 'unknown'}`

        const { data: newTx, error: txError } = await serviceClient
          .from('transactions')
          .insert({
            user_id: user.id,
            amount: slip.amount,
            original_currency: (slip.currency || 'THB') as 'USD' | 'THB',
            transaction_type: transactionType as 'expense' | 'income' | 'transfer',
            transaction_date: slip.transaction_date,
            description,
            payment_method_id: slip.payment_method_id || null,
            source_payment_slip_id: merged.slipId,
            source_statement_upload_id: merged.statementId,
            source_statement_suggestion_index: merged.index,
          })
          .select('id')
          .single()

        if (txError || !newTx) {
          results.failed++
          results.errors.push(`Failed to create transaction for ${merged.id}: ${txError?.message}`)
          continue
        }

        // Update slip
        await serviceClient
          .from('payment_slip_uploads')
          .update({ review_status: 'approved', status: 'done' })
          .eq('id', merged.slipId)

        // Update statement suggestion status
        const { data: statement } = await serviceClient
          .from('statement_uploads')
          .select('id, extraction_log')
          .eq('id', merged.statementId)
          .eq('user_id', user.id)
          .single()

        if (statement) {
          const extractionLog = statement.extraction_log as ExtractionLog | null
          const suggestions = extractionLog?.suggestions || []
          if (merged.index >= 0 && merged.index < suggestions.length) {
            suggestions[merged.index] = {
              ...suggestions[merged.index],
              status: 'approved',
              matched_transaction_id: newTx.id,
            }
            await serviceClient
              .from('statement_uploads')
              .update({ extraction_log: { ...extractionLog, suggestions } as unknown as Json })
              .eq('id', statement.id)
          }
        }

        // Learn from this decision (fire-and-forget)
        // Get the statement description for learning
        const mergedStmtSuggestions = (statement?.extraction_log as ExtractionLog | null)?.suggestions
        const mergedStmtDesc = mergedStmtSuggestions?.[merged.index]?.description

        recordDecision(serviceClient, {
          userId: user.id,
          decisionType: 'approve_create',
          sourceType: 'merged_slip_stmt',
          compositeId: merged.id,
          paymentSlipId: merged.slipId,
          statementUploadId: merged.statementId,
          suggestionIndex: merged.index,
          transactionId: newTx.id,
          paymentMethodId: slip.payment_method_id || undefined,
          slipCounterpartyName: counterparty || undefined,
          statementDescription: mergedStmtDesc,
          amount: Number(slip.amount),
          currency: slip.currency,
        }).catch((err) => console.error('Decision learning error:', err))

        results.success++
        results.transactionsCreated++
        results.totalAmount += Math.abs(Number(slip.amount))
      }
    }

    // --- Process SELF-TRANSFER items ---
    if (selfTransferIds.length > 0) {
      for (const st of selfTransferIds) {
        // Fetch both statement suggestions to get amount, date, payment methods
        const { data: debitStmt } = await serviceClient
          .from('statement_uploads')
          .select('id, extraction_log, payment_method_id')
          .eq('id', st.debitStatementId)
          .eq('user_id', user.id)
          .single()

        const { data: creditStmt } = await serviceClient
          .from('statement_uploads')
          .select('id, extraction_log, payment_method_id')
          .eq('id', st.creditStatementId)
          .eq('user_id', user.id)
          .single()

        if (!debitStmt || !creditStmt) {
          results.failed++
          results.errors.push(`Statement not found for self-transfer ${st.id}`)
          continue
        }

        const debitLog = debitStmt.extraction_log as ExtractionLog | null
        const creditLog = creditStmt.extraction_log as ExtractionLog | null
        const debitSuggestion = debitLog?.suggestions?.[st.debitIndex]
        const creditSuggestion = creditLog?.suggestions?.[st.creditIndex]

        if (!debitSuggestion || !creditSuggestion) {
          results.failed++
          results.errors.push(`Suggestion not found for self-transfer ${st.id}`)
          continue
        }

        // Look up payment method names for from/to account labels
        let fromAccountName = 'Unknown'
        let toAccountName = 'Unknown'

        if (debitStmt.payment_method_id) {
          const { data: pm } = await serviceClient
            .from('payment_methods')
            .select('name')
            .eq('id', debitStmt.payment_method_id)
            .single()
          if (pm) fromAccountName = pm.name
        }

        if (creditStmt.payment_method_id) {
          const { data: pm } = await serviceClient
            .from('payment_methods')
            .select('name')
            .eq('id', creditStmt.payment_method_id)
            .single()
          if (pm) toAccountName = pm.name
        }

        // Create ONE transfer transaction from the debit side data
        const { data: newTx, error: txError } = await serviceClient
          .from('transactions')
          .insert({
            user_id: user.id,
            amount: Math.abs(debitSuggestion.amount),
            original_currency: (debitSuggestion.currency || 'THB') as 'USD' | 'THB',
            transaction_type: 'transfer' as const,
            transaction_date: debitSuggestion.transaction_date,
            description: `Transfer: ${fromAccountName} → ${toAccountName}`,
            payment_method_id: debitStmt.payment_method_id || null,
            source_statement_upload_id: st.debitStatementId,
            source_statement_suggestion_index: st.debitIndex,
            transfer_from_account: fromAccountName,
            transfer_to_account: toAccountName,
          })
          .select('id')
          .single()

        if (txError || !newTx) {
          results.failed++
          results.errors.push(`Failed to create self-transfer for ${st.id}: ${txError?.message}`)
          continue
        }

        // Mark both statement suggestions as approved
        const updateSuggestion = async (stmtData: typeof debitStmt, log: ExtractionLog | null, index: number) => {
          const suggestions = log?.suggestions || []
          if (index >= 0 && index < suggestions.length) {
            suggestions[index] = {
              ...suggestions[index],
              status: 'approved',
              matched_transaction_id: newTx.id,
            }
            await serviceClient
              .from('statement_uploads')
              .update({ extraction_log: { ...log, suggestions } as unknown as Json })
              .eq('id', stmtData.id)
          }
        }

        await updateSuggestion(debitStmt, debitLog, st.debitIndex)
        await updateSuggestion(creditStmt, creditLog, st.creditIndex)

        // Learn from this self-transfer decision (fire-and-forget)
        recordDecision(serviceClient, {
          userId: user.id,
          decisionType: 'approve_create',
          sourceType: 'self_transfer',
          compositeId: st.id,
          statementUploadId: st.debitStatementId,
          suggestionIndex: st.debitIndex,
          transactionId: newTx.id,
          paymentMethodId: debitStmt.payment_method_id || undefined,
          statementDescription: debitSuggestion.description,
          amount: Math.abs(debitSuggestion.amount),
          currency: debitSuggestion.currency,
        }).catch((err) => console.error('Decision learning error:', err))

        results.success++
        results.transactionsCreated++
        results.totalAmount += Math.abs(Number(debitSuggestion.amount))
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
