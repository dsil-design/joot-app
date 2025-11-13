/**
 * Expected Transactions API - Unmatch Action
 *
 * POST /api/expected-transactions/[id]/unmatch - Unmatch from actual transaction
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createExpectedTransactionService } from '@/lib/services/expected-transaction-service'

export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * POST /api/expected-transactions/[id]/unmatch
 * Unmatch an expected transaction from its actual transaction
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

    // Unmatch transaction using service
    const expectedTransactionService = await createExpectedTransactionService()
    const { data, error } = await expectedTransactionService.unmatchTransaction(
      id,
      user.id
    )

    if (error) {
      if (error.includes('not found')) {
        return NextResponse.json(
          { error: 'Expected transaction not found' },
          { status: 404 }
        )
      }
      if (error.includes('not matched')) {
        return NextResponse.json(
          { error: 'Expected transaction is not matched' },
          { status: 400 }
        )
      }
      return NextResponse.json({ error }, { status: 400 })
    }

    return NextResponse.json({
      data,
      message: 'Transaction unmatched successfully',
    })
  } catch (error) {
    console.error('Unexpected error in POST /api/expected-transactions/[id]/unmatch:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
