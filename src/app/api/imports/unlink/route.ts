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
 * - transactionId: string - UUID of the transaction
 * - sourceType: 'email' | 'statement' - Which source to unlink
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: { transactionId?: string; sourceType?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { transactionId, sourceType } = body

    if (!transactionId || !sourceType) {
      return NextResponse.json(
        { error: 'transactionId and sourceType are required' },
        { status: 400 }
      )
    }

    if (sourceType !== 'email' && sourceType !== 'statement') {
      return NextResponse.json(
        { error: 'sourceType must be "email" or "statement"' },
        { status: 400 }
      )
    }

    const serviceClient = createServiceRoleClient()

    // Fetch the transaction and verify ownership
    const { data: transaction, error: txError } = await serviceClient
      .from('transactions')
      .select('id, source_email_transaction_id, source_statement_upload_id, source_statement_suggestion_index')
      .eq('id', transactionId)
      .eq('user_id', user.id)
      .single()

    if (txError || !transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      )
    }

    if (sourceType === 'email') {
      const emailTxId = transaction.source_email_transaction_id
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
        .eq('id', transactionId)

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
    } else {
      // sourceType === 'statement'
      const statementId = transaction.source_statement_upload_id
      const suggestionIndex = transaction.source_statement_suggestion_index

      if (!statementId) {
        return NextResponse.json(
          { error: 'Transaction has no linked statement source' },
          { status: 400 }
        )
      }

      // Clear statement source references on the transaction
      const { error: txUpdateError } = await serviceClient
        .from('transactions')
        .update({
          source_statement_upload_id: null,
          source_statement_suggestion_index: null,
          source_statement_match_confidence: null,
        })
        .eq('id', transactionId)

      if (txUpdateError) {
        console.error('Error clearing statement source on transaction:', txUpdateError)
        return NextResponse.json(
          { error: 'Failed to unlink statement source' },
          { status: 500 }
        )
      }

      // Reset the suggestion in extraction_log back to pending
      if (suggestionIndex !== null && suggestionIndex !== undefined) {
        const { data: statement } = await serviceClient
          .from('statement_uploads')
          .select('id, extraction_log')
          .eq('id', statementId)
          .eq('user_id', user.id)
          .single()

        if (statement) {
          const extractionLog = statement.extraction_log as ExtractionLog | null
          const suggestions = extractionLog?.suggestions || []

          if (suggestionIndex >= 0 && suggestionIndex < suggestions.length) {
            suggestions[suggestionIndex] = {
              ...suggestions[suggestionIndex],
              matched_transaction_id: undefined,
              status: 'pending',
            }

            await serviceClient
              .from('statement_uploads')
              .update({
                extraction_log: { ...extractionLog, suggestions } as unknown as Json,
              })
              .eq('id', statementId)
          }

          await updateStatementReviewStatus(serviceClient, statementId)
        }
      }
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
