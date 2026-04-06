import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import type { Json } from '@/lib/supabase/types'
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
  status?: 'pending' | 'approved' | 'rejected' | 'ignored'
}

interface ExtractionLog {
  suggestions?: Suggestion[]
  [key: string]: unknown
}

/**
 * POST /api/imports/ignore
 *
 * Marks statement transactions as ignored (e.g. balance summaries erroneously parsed).
 *
 * Request body:
 * - ids: string[] - Array of composite IDs (stmt:<uuid>:<index>)
 * - undo: boolean (optional) - If true, un-ignores the items (resets to no status)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: { ids?: string[]; undo?: boolean }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { ids, undo = false } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids is required and must be a non-empty array' }, { status: 400 })
    }

    if (ids.length > 100) {
      return NextResponse.json({ error: 'Maximum 100 items at once' }, { status: 400 })
    }

    // Parse IDs — only statement items supported for ignore
    const statementIds: { statementId: string; index: number }[] = []
    const invalidIds: string[] = []

    for (const id of ids) {
      const parsed = parseImportId(id)
      if (!parsed || parsed.type === 'email') {
        invalidIds.push(id)
      } else if (parsed.type === 'merged' || parsed.type === 'merged_slip_stmt' || parsed.type === 'merged_slip_email_stmt' || parsed.type === 'statement') {
        statementIds.push({ statementId: parsed.statementId, index: parsed.index })
      } else {
        invalidIds.push(id)
      }
    }

    if (invalidIds.length > 0) {
      return NextResponse.json({ error: 'Invalid or unsupported ID format', invalidIds }, { status: 400 })
    }

    const serviceClient = createServiceRoleClient()

    const results = {
      updated: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[],
    }

    // Group by statement ID
    const byStatement = new Map<string, number[]>()
    for (const { statementId, index } of statementIds) {
      const indices = byStatement.get(statementId) || []
      indices.push(index)
      byStatement.set(statementId, indices)
    }

    const stmtIdList = Array.from(byStatement.keys())
    const { data: statements, error: fetchError } = await serviceClient
      .from('statement_uploads')
      .select('id, user_id, extraction_log')
      .in('id', stmtIdList)
      .eq('user_id', user.id)

    if (fetchError) {
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

          if (undo) {
            if (suggestion.status !== 'ignored') {
              results.skipped++
              continue
            }
            delete suggestion.status
          } else {
            if (suggestion.status === 'ignored') {
              results.skipped++
              continue
            }
            // Don't allow ignoring already-approved/linked items
            if (suggestion.status === 'approved') {
              results.skipped++
              continue
            }
            suggestion.status = 'ignored'
          }

          hasChanges = true
          results.updated++
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

    return NextResponse.json({
      success: true,
      results: {
        updated: results.updated,
        failed: results.failed,
        skipped: results.skipped,
        errors: results.errors.length > 0 ? results.errors : undefined,
      },
    })
  } catch (error) {
    console.error('Import ignore API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
