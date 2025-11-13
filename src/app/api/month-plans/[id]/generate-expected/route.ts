/**
 * Month Plans API - Generate Expected Transactions
 *
 * POST /api/month-plans/[id]/generate-expected - Generate expected transactions from templates
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createMonthPlanService } from '@/lib/services/month-plan-service'
import { GenerateExpectedSchema } from '@/lib/validations/recurring-transactions'

export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * POST /api/month-plans/[id]/generate-expected
 * Generate expected transactions for a month from templates
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
    const validation = GenerateExpectedSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    // Generate expected transactions using service
    const monthPlanService = await createMonthPlanService()
    const { data, error } = await monthPlanService.generateExpectedTransactions(
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
      message: data?.message || 'Expected transactions generated successfully',
    })
  } catch (error) {
    console.error('Unexpected error in POST /api/month-plans/[id]/generate-expected:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
