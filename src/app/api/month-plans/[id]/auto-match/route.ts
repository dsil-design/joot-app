/**
 * Month Plans API - Auto Match Transactions
 *
 * POST /api/month-plans/[id]/auto-match - Automatically match expected to actual transactions
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createTransactionMatchingService } from '@/lib/services/transaction-matching-service'
import { AutoMatchSchema } from '@/lib/validations/recurring-transactions'

export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * POST /api/month-plans/[id]/auto-match
 * Automatically match expected transactions to actual transactions
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
    const validation = AutoMatchSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    // Auto-match transactions using service
    const matchingService = await createTransactionMatchingService()
    const { data, error } = await matchingService.autoMatchTransactions(
      id,
      user.id,
      validation.data
    )

    if (error) {
      if (error.includes('not found')) {
        return NextResponse.json({ error: 'Month plan not found' }, { status: 404 })
      }
      return NextResponse.json({ error }, { status: 400 })
    }

    return NextResponse.json({
      data,
      message: data?.message || 'Auto-match completed successfully',
    })
  } catch (error) {
    console.error('Unexpected error in POST /api/month-plans/[id]/auto-match:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
