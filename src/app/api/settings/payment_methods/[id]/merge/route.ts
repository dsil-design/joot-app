import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { targetId } = await request.json()

    if (!targetId) {
      return NextResponse.json({ error: 'Target ID is required' }, { status: 400 })
    }

    if (id === targetId) {
      return NextResponse.json({ error: 'Cannot merge into itself' }, { status: 400 })
    }

    // Verify ownership of both payment methods
    const { data: sourceMethod } = await supabase
      .from('payment_methods')
      .select('id, name')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    const { data: targetMethod } = await supabase
      .from('payment_methods')
      .select('id, name')
      .eq('id', targetId)
      .eq('user_id', user.id)
      .single()

    if (!sourceMethod || !targetMethod) {
      return NextResponse.json({ error: 'Payment method not found' }, { status: 404 })
    }

    // Update all transactions to use the target payment method
    const { error: updateError } = await supabase
      .from('transactions')
      .update({ payment_method_id: targetId })
      .eq('payment_method_id', id)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Error updating transactions:', updateError)
      return NextResponse.json({ error: 'Failed to merge payment methods' }, { status: 500 })
    }

    // Delete the source payment method
    const { error: deleteError } = await supabase
      .from('payment_methods')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Error deleting source payment method:', deleteError)
      return NextResponse.json({ error: 'Failed to delete source payment method' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in POST /api/settings/payment_methods/[id]/merge:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
