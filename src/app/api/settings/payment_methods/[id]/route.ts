import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(
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

    const { name, preferred_currency } = await request.json()

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Verify ownership
    const { data: paymentMethod } = await supabase
      .from('payment_methods')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!paymentMethod) {
      return NextResponse.json({ error: 'Payment method not found' }, { status: 404 })
    }

    // Check if another payment method with this name already exists
    const { data: existing } = await supabase
      .from('payment_methods')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', name.trim())
      .neq('id', id)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'A payment method with this name already exists' },
        { status: 409 }
      )
    }

    // Update payment method
    const { data, error } = await supabase
      .from('payment_methods')
      .update({
        name: name.trim(),
        preferred_currency: preferred_currency || null,
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating payment method:', error)
      return NextResponse.json({ error: 'Failed to update payment method' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in PATCH /api/settings/payment_methods/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
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

    // Verify ownership
    const { data: paymentMethod } = await supabase
      .from('payment_methods')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!paymentMethod) {
      return NextResponse.json({ error: 'Payment method not found' }, { status: 404 })
    }

    // Check if payment method is used in any transactions
    const { count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('payment_method_id', id)
      .eq('user_id', user.id)

    if (count && count > 0) {
      return NextResponse.json(
        { error: 'Cannot delete payment method that is used in transactions' },
        { status: 409 }
      )
    }

    // Delete payment method
    const { error } = await supabase
      .from('payment_methods')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting payment method:', error)
      return NextResponse.json({ error: 'Failed to delete payment method' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/settings/payment_methods/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
