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

    // Check if vendor already exists for this user
    const { data: existing } = await supabase
      .from('vendors')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', name.trim())
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'A vendor with this name already exists' },
        { status: 409 }
      )
    }

    // Create vendor
    const { data, error } = await supabase
      .from('vendors')
      .insert({
        name: name.trim(),
        user_id: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating vendor:', error)
      return NextResponse.json({ error: 'Failed to create vendor' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in POST /api/settings/vendors:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
