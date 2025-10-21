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

    const { name } = await request.json()

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Check if payment method already exists for this user
    const { data: existing } = await supabase
      .from('payment_methods')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', name.trim())
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'A payment method with this name already exists' },
        { status: 409 }
      )
    }

    // Get the current max sort_order for this user
    const { data: maxOrderData } = await supabase
      .from('payment_methods')
      .select('sort_order')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single()

    const nextSortOrder = maxOrderData ? maxOrderData.sort_order + 1 : 1

    // Create payment method
    const { data, error } = await supabase
      .from('payment_methods')
      .insert({
        name: name.trim(),
        user_id: user.id,
        sort_order: nextSortOrder,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating payment method:', error)
      return NextResponse.json({ error: 'Failed to create payment method' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in POST /api/settings/payment_methods:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
