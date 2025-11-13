/**
 * Month Plans API - Variance Report
 *
 * GET /api/month-plans/[id]/variance-report - Get comprehensive variance report
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createVarianceReportService } from '@/lib/services/variance-report-service'

export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/month-plans/[id]/variance-report
 * Get comprehensive variance report for a month
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

    // Generate variance report using service
    const varianceService = await createVarianceReportService()
    const { data, error } = await varianceService.generateMonthVarianceReport(id, user.id)

    if (error) {
      if (error.includes('not found')) {
        return NextResponse.json({ error: 'Month plan not found' }, { status: 404 })
      }
      return NextResponse.json({ error }, { status: 500 })
    }

    return NextResponse.json({
      data,
      message: 'Variance report generated successfully',
    })
  } catch (error) {
    console.error('Unexpected error in GET /api/month-plans/[id]/variance-report:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
