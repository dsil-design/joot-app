/**
 * Expected Transactions API - Skip Action
 *
 * POST /api/expected-transactions/[id]/skip - Mark as skipped
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createExpectedTransactionService } from '@/lib/services/expected-transaction-service'
import { SkipTransactionSchema } from '@/lib/validations/recurring-transactions'

export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * POST /api/expected-transactions/[id]/skip
 * Mark an expected transaction as skipped
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params

    // Parse and validate request body
    const body = await request.json()
    const validation = SkipTransactionSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    // Skip transaction using service
    const expectedTransactionService = await createExpectedTransactionService()
    const { data, error } = await expectedTransactionService.skipExpectedTransaction(
      id,
      validation.data.notes,
      user.id
    )

    if (error) {
      if (error.includes('not found')) {
        return NextResponse.json(
          { error: 'Expected transaction not found' },
          { status: 404 }
        )
      }
      return NextResponse.json({ error }, { status: 400 })
    }

    return NextResponse.json({
      data,
      message: 'Expected transaction marked as skipped',
    })
  } catch (error) {
    console.error('Unexpected error in POST /api/expected-transactions/[id]/skip:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
