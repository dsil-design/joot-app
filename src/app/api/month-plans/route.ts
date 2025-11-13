/**
 * Month Plans API - List and Create
 *
 * GET  /api/month-plans - Get all month plans with optional filters
 * POST /api/month-plans - Create or get a month plan
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createMonthPlanService } from '@/lib/services/month-plan-service'
import { CreateMonthPlanSchema } from '@/lib/validations/recurring-transactions'

export const dynamic = 'force-dynamic'

/**
 * GET /api/month-plans
 * Get all month plans for the authenticated user with optional filters
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
    const filters: {
      year?: number
      status?: 'draft' | 'active' | 'closed'
      limit?: number
    } = {}

    // year filter
    const year = searchParams.get('year')
    if (year) {
      const yearNum = parseInt(year, 10)
      if (!isNaN(yearNum) && yearNum > 1900 && yearNum < 3000) {
        filters.year = yearNum
      }
    }

    // status filter
    const status = searchParams.get('status')
    if (status && ['draft', 'active', 'closed'].includes(status)) {
      filters.status = status as 'draft' | 'active' | 'closed'
    }

    // limit filter
    const limit = searchParams.get('limit')
    if (limit) {
      const limitNum = parseInt(limit, 10)
      if (!isNaN(limitNum) && limitNum > 0 && limitNum <= 100) {
        filters.limit = limitNum
      }
    }

    // Get month plans using service
    const monthPlanService = await createMonthPlanService()
    const { data, error } = await monthPlanService.getMonthPlans(user.id, filters)

    if (error) {
      console.error('Error fetching month plans:', error)
      return NextResponse.json(
        { error: 'Failed to fetch month plans' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Unexpected error in GET /api/month-plans:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/month-plans
 * Create or get a month plan for a specific month
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
    const validation = CreateMonthPlanSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    // Get or create month plan using service
    const monthPlanService = await createMonthPlanService()
    const { data, error } = await monthPlanService.getOrCreateMonthPlan(
      user.id,
      validation.data.month_year
    )

    if (error) {
      console.error('Error creating month plan:', error)
      return NextResponse.json({ error }, { status: 400 })
    }

    // If notes were provided, update the month plan
    if (validation.data.notes && data) {
      const updateResult = await monthPlanService.updateMonthPlan(
        data.id,
        { notes: validation.data.notes },
        user.id
      )
      if (updateResult.data) {
        return NextResponse.json(
          { data: updateResult.data, message: 'Month plan created successfully' },
          { status: 201 }
        )
      }
    }

    return NextResponse.json(
      { data, message: 'Month plan created successfully' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Unexpected error in POST /api/month-plans:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
