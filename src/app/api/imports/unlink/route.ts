import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import type { Json } from '@/lib/supabase/types'
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
 * POST /api/imports/unlink
 *
 * Unlinks a source (email or statement) from a transaction.
 *
 * Request body:
 * - transactionId: string - UUID of the transaction (optional if statementUploadId + suggestionIndex provided)
 * - sourceType: 'email' | 'statement' - Which source to unlink
 * - statementUploadId?: string - Statement upload ID (fallback when transaction is deleted)
 * - suggestionIndex?: number - Suggestion index in extraction_log (fallback when transaction is deleted)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: { transactionId?: string; sourceType?: string; statementUploadId?: string; suggestionIndex?: number }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { transactionId, sourceType, statementUploadId, suggestionIndex } = body

    if (!sourceType) {
      return NextResponse.json(
        { error: 'sourceType is required' },
        { status: 400 }
      )
    }

    if (sourceType !== 'email' && sourceType !== 'statement' && sourceType !== 'payment_slip') {
      return NextResponse.json(
        { error: 'sourceType must be "email", "statement", or "payment_slip"' },
        { status: 400 }
      )
    }

    const serviceClient = createServiceRoleClient()

    // Try to fetch the transaction if we have a transactionId
    let transaction: {
      id: string
      source_email_transaction_id: string | null
      source_statement_upload_id: string | null
      source_statement_suggestion_index: number | null
      source_payment_slip_id: string | null
    } | null = null

    if (transactionId) {
      const { data } = await serviceClient
        .from('transactions')
        .select('id, source_email_transaction_id, source_statement_upload_id, source_statement_suggestion_index, source_payment_slip_id')
        .eq('id', transactionId)
        .eq('user_id', user.id)
        .single()
      transaction = data
    }

    // For email unlinking, we still require the transaction to exist
    if (sourceType === 'email') {
      if (!transaction) {
        return NextResponse.json(
          { error: 'Transaction not found' },
          { status: 404 }
        )
      }

      let emailTxId = transaction.source_email_transaction_id

      // Fallback: look up via reverse FK (email_transactions.matched_transaction_id).
      // The transaction detail page renders the email source card via this reverse
      // lookup, so it's possible for an email_transactions row to be matched to a
      // transaction while the transaction's source_email_transaction_id is null.
      if (!emailTxId) {
        const { data: reverseMatches, error: reverseErr } = await serviceClient
          .from('email_transactions')
          .select('id, user_id, matched_transaction_id')
          .eq('matched_transaction_id', transaction.id)
          .limit(5)
        if (reverseErr) {
          console.error('Error reverse-looking up email_transactions:', reverseErr)
        }
        console.log('[unlink] reverse email_transactions lookup', {
          transactionId: transaction.id,
          found: reverseMatches?.length ?? 0,
          rows: reverseMatches,
        })
        emailTxId = reverseMatches?.[0]?.id ?? null
      }

      if (!emailTxId) {
        return NextResponse.json(
          { error: 'Transaction has no linked email source' },
          { status: 400 }
        )
      }

      // Clear the email source reference on the transaction
      const { error: txUpdateError } = await serviceClient
        .from('transactions')
        .update({ source_email_transaction_id: null })
        .eq('id', transactionId!)

      if (txUpdateError) {
        console.error('Error clearing email source on transaction:', txUpdateError)
        return NextResponse.json(
          { error: 'Failed to unlink email source' },
          { status: 500 }
        )
      }

      // Reset the email_transactions row back to pending
      const { error: emailUpdateError } = await serviceClient
        .from('email_transactions')
        .update({
          matched_transaction_id: null,
          status: 'pending_review',
          match_method: null,
          match_confidence: null,
          matched_at: null,
        })
        .eq('id', emailTxId)
        .eq('user_id', user.id)

      if (emailUpdateError) {
        console.error('Error resetting email transaction:', emailUpdateError)
      }
    } else if (sourceType === 'statement') {
      // Use transaction data if available, otherwise fall back to explicit params
      const stmtId = transaction?.source_statement_upload_id ?? statementUploadId
      const sugIdx = transaction?.source_statement_suggestion_index ?? suggestionIndex

      if (!stmtId) {
        return NextResponse.json(
          { error: 'No statement source to unlink' },
          { status: 400 }
        )
      }

      // Clear statement source references on the transaction (if it still exists)
      if (transaction) {
        const { error: txUpdateError } = await serviceClient
          .from('transactions')
          .update({
            source_statement_upload_id: null,
            source_statement_suggestion_index: null,
            source_statement_match_confidence: null,
          })
          .eq('id', transaction.id)

        if (txUpdateError) {
          console.error('Error clearing statement source on transaction:', txUpdateError)
          return NextResponse.json(
            { error: 'Failed to unlink statement source' },
            { status: 500 }
          )
        }
      }

      // Reset the suggestion in extraction_log back to pending
      if (sugIdx !== null && sugIdx !== undefined) {
        const { data: statement } = await serviceClient
          .from('statement_uploads')
          .select('id, extraction_log')
          .eq('id', stmtId)
          .eq('user_id', user.id)
          .single()

        if (statement) {
          const extractionLog = statement.extraction_log as ExtractionLog | null
          const suggestions = extractionLog?.suggestions || []

          if (sugIdx >= 0 && sugIdx < suggestions.length) {
            suggestions[sugIdx] = {
              ...suggestions[sugIdx],
              matched_transaction_id: undefined,
              status: 'pending',
            }

            await serviceClient
              .from('statement_uploads')
              .update({
                extraction_log: { ...extractionLog, suggestions } as unknown as Json,
              })
              .eq('id', stmtId)
          }

          await updateStatementReviewStatus(serviceClient, stmtId)
        }
      }
    } else if (sourceType === 'payment_slip') {
      if (!transaction) {
        return NextResponse.json(
          { error: 'Transaction not found' },
          { status: 404 }
        )
      }

      const slipId = transaction.source_payment_slip_id
      if (!slipId) {
        return NextResponse.json(
          { error: 'Transaction has no linked payment slip source' },
          { status: 400 }
        )
      }

      // Clear the payment slip source reference on the transaction
      const { error: txUpdateError } = await serviceClient
        .from('transactions')
        .update({ source_payment_slip_id: null })
        .eq('id', transactionId!)

      if (txUpdateError) {
        console.error('Error clearing payment slip source on transaction:', txUpdateError)
        return NextResponse.json(
          { error: 'Failed to unlink payment slip source' },
          { status: 500 }
        )
      }

      // Reset the payment slip back to pending (trigger also handles this via matched_transaction_id)
      await serviceClient
        .from('payment_slip_uploads')
        .update({
          matched_transaction_id: null,
        })
        .eq('id', slipId)
        .eq('user_id', user.id)
    }

    // Log activity
    await serviceClient
      .from('import_activities')
      .insert({
        user_id: user.id,
        activity_type: 'transaction_unlinked',
        description: `Unlinked ${sourceType} source from transaction`,
        transactions_affected: 1,
        metadata: {
          transactionId,
          sourceType,
        },
      })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Import unlink API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
