/**
 * Expected Transactions API - List and Create
 *
 * GET  /api/expected-transactions - Get all expected transactions with filters
 * POST /api/expected-transactions - Create a manual expected transaction
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createExpectedTransactionService } from '@/lib/services/expected-transaction-service'
import { CreateExpectedTransactionSchema } from '@/lib/validations/recurring-transactions'

export const dynamic = 'force-dynamic'

/**
 * GET /api/expected-transactions
 * Get all expected transactions for a month plan with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams

    // month_plan_id is required
    const monthPlanId = searchParams.get('month_plan_id')
    if (!monthPlanId) {
      return NextResponse.json(
        { error: 'month_plan_id query parameter is required' },
        { status: 400 }
      )
    }

    const filters: {
      month_plan_id: string
      status?: string | string[]
      transaction_type?: 'expense' | 'income'
      vendor_ids?: string[]
      include_matched?: boolean
    } = {
      month_plan_id: monthPlanId,
    }

    // status filter (can be array)
    const status = searchParams.get('status')
    if (status) {
      if (status.includes(',')) {
        filters.status = status.split(',').filter(Boolean)
      } else {
        filters.status = status
      }
    }

    // transaction_type filter
    const transactionType = searchParams.get('transaction_type')
    if (transactionType && ['expense', 'income'].includes(transactionType)) {
      filters.transaction_type = transactionType as 'expense' | 'income'
    }

    // vendor_ids filter
    const vendorIds = searchParams.get('vendor_ids')
    if (vendorIds) {
      filters.vendor_ids = vendorIds.split(',').filter(Boolean)
    }

    // include_matched filter
    const includeMatched = searchParams.get('include_matched')
    if (includeMatched !== null) {
      filters.include_matched = includeMatched === 'true'
    }

    // Get expected transactions using service
    const expectedTransactionService = await createExpectedTransactionService()
    const { data, error } = await expectedTransactionService.getExpectedTransactions(
      filters,
      user.id
    )

    if (error) {
      console.error('Error fetching expected transactions:', error)
      return NextResponse.json(
        { error: 'Failed to fetch expected transactions' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Unexpected error in GET /api/expected-transactions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/expected-transactions
 * Create a manual expected transaction (not from template)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = CreateExpectedTransactionSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    // Create expected transaction using service
    const expectedTransactionService = await createExpectedTransactionService()
    const { data, error } = await expectedTransactionService.createExpectedTransaction(
      validation.data,
      user.id
    )

    if (error) {
      console.error('Error creating expected transaction:', error)
      return NextResponse.json({ error }, { status: 400 })
    }

    return NextResponse.json(
      { data, message: 'Expected transaction created successfully' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Unexpected error in POST /api/expected-transactions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
