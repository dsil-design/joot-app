import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getProposalsForItems, transformProposalRow } from '@/lib/proposals/proposal-service'

/**
 * GET /api/imports/proposals?compositeIds=id1,id2,...
 *
 * Bulk fetch proposals for queue items.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const compositeIdsParam = request.nextUrl.searchParams.get('compositeIds')
    if (!compositeIdsParam) {
      return NextResponse.json({ error: 'compositeIds required' }, { status: 400 })
    }

    const compositeIds = compositeIdsParam.split(',').filter(Boolean)
    const proposalRows = await getProposalsForItems(supabase, user.id, compositeIds)

    // Fetch name lookups for vendors, PMs, tags
    const [vendorData, pmData, tagData] = await Promise.all([
      supabase.from('vendors').select('id, name').eq('user_id', user.id),
      supabase.from('payment_methods').select('id, name').eq('user_id', user.id),
      supabase.from('tags').select('id, name').eq('user_id', user.id),
    ])

    const vendors = new Map((vendorData.data || []).map((v) => [v.id, v.name]))
    const paymentMethods = new Map((pmData.data || []).map((pm) => [pm.id, pm.name]))
    const tags = new Map((tagData.data || []).map((t) => [t.id, t.name]))

    const context = { vendors, paymentMethods, tags }

    const proposals: Record<string, ReturnType<typeof transformProposalRow> & { isStale: boolean }> = {}
    for (const [compositeId, row] of proposalRows) {
      proposals[compositeId] = {
        ...transformProposalRow(row, context),
        isStale: row.status === 'stale',
      }
    }

    return NextResponse.json({ proposals })
  } catch (error) {
    console.error('Proposal fetch API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
