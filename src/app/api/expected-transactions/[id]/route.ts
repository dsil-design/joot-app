/**
 * Expected Transactions API - Single Transaction Operations
 *
 * GET    /api/expected-transactions/[id] - Get a single expected transaction
 * PATCH  /api/expected-transactions/[id] - Update an expected transaction
 * DELETE /api/expected-transactions/[id] - Delete an expected transaction
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createExpectedTransactionService } from '@/lib/services/expected-transaction-service'
import { UpdateExpectedTransactionSchema } from '@/lib/validations/recurring-transactions'

export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/expected-transactions/[id]
 * Get a single expected transaction by ID
 */
export async function GET(
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

    // Get expected transaction using service
    const expectedTransactionService = await createExpectedTransactionService()
    const { data, error } = await expectedTransactionService.getExpectedTransactionById(
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
      return NextResponse.json({ error }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Unexpected error in GET /api/expected-transactions/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/expected-transactions/[id]
 * Update an expected transaction
 */
export async function PATCH(
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
    const validation = UpdateExpectedTransactionSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    // Update expected transaction using service
    const expectedTransactionService = await createExpectedTransactionService()
    const { data, error } = await expectedTransactionService.updateExpectedTransaction(
      id,
      validation.data,
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
      message: 'Expected transaction updated successfully',
    })
  } catch (error) {
    console.error('Unexpected error in PATCH /api/expected-transactions/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/expected-transactions/[id]
 * Delete an expected transaction
 * Query param: delete_matched (optional boolean) - also delete matched actual transaction
 */
export async function DELETE(
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

    // Parse query parameter
    const searchParams = request.nextUrl.searchParams
    const deleteMatched = searchParams.get('delete_matched') === 'true'

    // Delete expected transaction using service
    const expectedTransactionService = await createExpectedTransactionService()
    const { data, error } = await expectedTransactionService.deleteExpectedTransaction(
      id,
      user.id,
      deleteMatched
    )

    if (error) {
      if (error.includes('not found')) {
        return NextResponse.json(
          { error: 'Expected transaction not found' },
          { status: 404 }
        )
      }
      return NextResponse.json({ error }, { status: 500 })
    }

    return NextResponse.json({
      data: { success: true },
      message: 'Expected transaction deleted successfully',
    })
  } catch (error) {
    console.error('Unexpected error in DELETE /api/expected-transactions/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
