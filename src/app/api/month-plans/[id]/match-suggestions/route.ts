/**
 * Month Plans API - Get Match Suggestions
 *
 * GET /api/month-plans/[id]/match-suggestions - Get automatic transaction matching suggestions
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createTransactionMatchingService } from '@/lib/services/transaction-matching-service'

export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/month-plans/[id]/match-suggestions
 * Get match suggestions for unmatched expected transactions
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

    // Get match suggestions using service
    const matchingService = await createTransactionMatchingService()
    const { data, error } = await matchingService.findMatchSuggestions(id, user.id)

    if (error) {
      if (error.includes('not found')) {
        return NextResponse.json({ error: 'Month plan not found' }, { status: 404 })
      }
      return NextResponse.json({ error }, { status: 500 })
    }

    return NextResponse.json({
      data,
      message: `Found ${data?.length || 0} potential matches`,
    })
  } catch (error) {
    console.error('Unexpected error in GET /api/month-plans/[id]/match-suggestions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
