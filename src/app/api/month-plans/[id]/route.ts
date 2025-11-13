/**
 * Month Plans API - Single Month Plan Operations
 *
 * GET   /api/month-plans/[id] - Get a single month plan
 * PATCH /api/month-plans/[id] - Update a month plan
 * DELETE /api/month-plans/[id] - Not implemented (month plans are not deleted)
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createMonthPlanService } from '@/lib/services/month-plan-service'
import { UpdateMonthPlanSchema } from '@/lib/validations/recurring-transactions'

export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/month-plans/[id]
 * Get a single month plan by ID with full statistics
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

    // Get month plan using service
    const monthPlanService = await createMonthPlanService()
    const { data, error } = await monthPlanService.getMonthPlan(id, user.id)

    if (error) {
      if (error.includes('not found')) {
        return NextResponse.json({ error: 'Month plan not found' }, { status: 404 })
      }
      return NextResponse.json({ error }, { status: 500 })
    }

    // Get statistics for the month plan
    const statsResult = await monthPlanService.getMonthPlanStats(id, user.id)

    return NextResponse.json({
      data: {
        ...data,
        stats: statsResult.data || undefined,
      },
    })
  } catch (error) {
    console.error('Unexpected error in GET /api/month-plans/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/month-plans/[id]
 * Update a month plan
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
    const validation = UpdateMonthPlanSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const monthPlanService = await createMonthPlanService()

    // If updating status, use the status-specific method
    if (validation.data.status) {
      const { data, error } = await monthPlanService.updateMonthPlanStatus(
        id,
        validation.data.status,
        user.id
      )

      if (error) {
        if (error.includes('not found')) {
          return NextResponse.json({ error: 'Month plan not found' }, { status: 404 })
        }
        return NextResponse.json({ error }, { status: 400 })
      }

      // If there are other fields to update, update them separately
      if (validation.data.notes !== undefined) {
        const updateResult = await monthPlanService.updateMonthPlan(
          id,
          { notes: validation.data.notes },
          user.id
        )
        if (updateResult.data) {
          return NextResponse.json({
            data: updateResult.data,
            message: 'Month plan updated successfully',
          })
        }
      }

      return NextResponse.json({
        data,
        message: 'Month plan updated successfully',
      })
    }

    // Update month plan using service
    const { data, error } = await monthPlanService.updateMonthPlan(
      id,
      validation.data,
      user.id
    )

    if (error) {
      if (error.includes('not found')) {
        return NextResponse.json({ error: 'Month plan not found' }, { status: 404 })
      }
      return NextResponse.json({ error }, { status: 400 })
    }

    return NextResponse.json({
      data,
      message: 'Month plan updated successfully',
    })
  } catch (error) {
    console.error('Unexpected error in PATCH /api/month-plans/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
