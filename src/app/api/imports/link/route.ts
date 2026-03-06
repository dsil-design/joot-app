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
 * POST /api/imports/link
 *
 * Links a queue item to an existing transaction.
 * Supports both statement and email items.
 *
 * Request body:
 * - compositeId: string - Import ID (stmt:<uuid>:<index>, email:<uuid>, or legacy <uuid>:<index>)
 * - transactionId: string - UUID of the existing transaction to link to
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

    if (!compositeId || !transactionId) {
      return NextResponse.json(
        { error: 'compositeId and transactionId are required' },
        { status: 400 }
      )
    }

    const parsed = parseImportId(compositeId)
    if (!parsed) {
      return NextResponse.json(
        { error: 'Invalid compositeId format' },
        { status: 400 }
      )
    }

    const serviceClient = createServiceRoleClient()

    // Verify the transaction belongs to this user
    const { data: transaction, error: txError } = await serviceClient
      .from('transactions')
      .select('id')
      .eq('id', transactionId)
      .eq('user_id', user.id)
      .single()

    if (txError || !transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      )
    }

    if (parsed.type === 'merged') {
      // --- MERGED link: link both statement + email to same transaction ---
      const { data: statement, error: stmtFetchError } = await serviceClient
        .from('statement_uploads')
        .select('id, extraction_log')
        .eq('id', parsed.statementId)
        .eq('user_id', user.id)
        .single()

      if (stmtFetchError || !statement) {
        return NextResponse.json(
          { error: 'Statement not found' },
          { status: 404 }
        )
      }

      const extractionLog = statement.extraction_log as ExtractionLog | null
      const suggestions = extractionLog?.suggestions || []

      if (parsed.index < 0 || parsed.index >= suggestions.length) {
        return NextResponse.json(
          { error: 'Invalid suggestion index' },
          { status: 400 }
        )
      }

      suggestions[parsed.index] = {
        ...suggestions[parsed.index],
        matched_transaction_id: transactionId,
        status: 'approved',
        is_new: false,
      }

      const { error: stmtUpdateError } = await serviceClient
        .from('statement_uploads')
        .update({
          extraction_log: { ...extractionLog, suggestions } as unknown as Json,
        })
        .eq('id', statement.id)

      if (stmtUpdateError) {
        console.error('Error updating statement for merged link:', stmtUpdateError)
        return NextResponse.json(
          { error: 'Failed to save statement link' },
          { status: 500 }
        )
      }

      const { error: emailUpdateError } = await serviceClient
        .from('email_transactions')
        .update({
          matched_transaction_id: transactionId,
          status: 'matched',
          match_method: 'manual',
          matched_at: new Date().toISOString(),
        })
        .eq('id', parsed.emailId)
        .eq('user_id', user.id)

      if (emailUpdateError) {
        console.error('Error updating email transaction for merged link:', emailUpdateError)
        return NextResponse.json(
          { error: 'Failed to save email link' },
          { status: 500 }
        )
      }

      // Set source references on the transaction (both email and statement)
      const { error: txUpdateError } = await serviceClient
        .from('transactions')
        .update({
          source_email_transaction_id: parsed.emailId,
          source_statement_upload_id: parsed.statementId,
          source_statement_suggestion_index: parsed.index,
          source_statement_match_confidence: suggestions[parsed.index].confidence ?? null,
        })
        .eq('id', transactionId)

      if (txUpdateError) {
        console.error('Error setting source references on transaction (merged):', txUpdateError)
        return NextResponse.json(
          { error: 'Failed to set source references on transaction' },
          { status: 500 }
        )
      }
    } else if (parsed.type === 'statement') {
      // --- STATEMENT link ---
      const { data: statement, error: fetchError } = await serviceClient
        .from('statement_uploads')
        .select('id, extraction_log')
        .eq('id', parsed.statementId)
        .eq('user_id', user.id)
        .single()

      if (fetchError || !statement) {
        return NextResponse.json(
          { error: 'Statement not found' },
          { status: 404 }
        )
      }

      const extractionLog = statement.extraction_log as ExtractionLog | null
      const suggestions = extractionLog?.suggestions || []

      if (parsed.index < 0 || parsed.index >= suggestions.length) {
        return NextResponse.json(
          { error: 'Invalid suggestion index' },
          { status: 400 }
        )
      }

      suggestions[parsed.index] = {
        ...suggestions[parsed.index],
        matched_transaction_id: transactionId,
        status: 'approved',
        is_new: false,
      }

      const { error: updateError } = await serviceClient
        .from('statement_uploads')
        .update({
          extraction_log: { ...extractionLog, suggestions } as unknown as Json,
        })
        .eq('id', statement.id)

      if (updateError) {
        console.error('Error updating statement:', updateError)
        return NextResponse.json(
          { error: 'Failed to save link' },
          { status: 500 }
        )
      }

      // Set statement source reference on the transaction
      const { error: txUpdateError } = await serviceClient
        .from('transactions')
        .update({
          source_statement_upload_id: parsed.statementId,
          source_statement_suggestion_index: parsed.index,
          source_statement_match_confidence: suggestions[parsed.index].confidence ?? null,
        })
        .eq('id', transactionId)

      if (txUpdateError) {
        console.error('Error setting statement source on transaction:', txUpdateError)
        return NextResponse.json(
          { error: 'Failed to set source reference on transaction' },
          { status: 500 }
        )
      }
    } else {
      // --- EMAIL link ---
      const { error: updateError } = await serviceClient
        .from('email_transactions')
        .update({
          matched_transaction_id: transactionId,
          status: 'matched',
          match_method: 'manual',
          matched_at: new Date().toISOString(),
        })
        .eq('id', parsed.emailId)
        .eq('user_id', user.id)

      if (updateError) {
        console.error('Error updating email transaction:', updateError)
        return NextResponse.json(
          { error: 'Failed to save link' },
          { status: 500 }
        )
      }

      // Set source reference on the transaction (non-fatal — link is already established)
      const { error: txUpdateError } = await serviceClient
        .from('transactions')
        .update({ source_email_transaction_id: parsed.emailId })
        .eq('id', transactionId)

      if (txUpdateError) {
        console.error('Error setting email source on transaction (non-fatal):', JSON.stringify(txUpdateError))
      }
    }

    // Log activity
    await serviceClient
      .from('import_activities')
      .insert({
        user_id: user.id,
        activity_type: 'transaction_matched',
        description: `Linked ${parsed.type} entry to existing transaction`,
        transactions_affected: 1,
        metadata: {
          compositeId,
          transactionId,
          source: parsed.type,
        },
      })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Import link API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
