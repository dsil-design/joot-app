import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orderedIds } = await request.json()

    if (!orderedIds || !Array.isArray(orderedIds)) {
      return NextResponse.json({ error: 'Invalid orderedIds' }, { status: 400 })
    }

    // Verify all IDs belong to the user
    const { data: paymentMethods } = await supabase
      .from('payment_methods')
      .select('id')
      .eq('user_id', user.id)
      .in('id', orderedIds)

    if (!paymentMethods || paymentMethods.length !== orderedIds.length) {
      return NextResponse.json({ error: 'Invalid payment method IDs' }, { status: 400 })
    }

    // Update sort_order for each payment method
    const updates = orderedIds.map((id, index) => ({
      id,
      sort_order: index + 1,
    }))

    // Perform updates
    for (const update of updates) {
      const { error } = await supabase
        .from('payment_methods')
        .update({ sort_order: update.sort_order })
        .eq('id', update.id)
        .eq('user_id', user.id)

      if (error) {
        console.error('Error updating payment method order:', error)
        return NextResponse.json({
          error: 'Failed to update order',
          details: error.message
        }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in POST /api/settings/payment_methods/reorder:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
