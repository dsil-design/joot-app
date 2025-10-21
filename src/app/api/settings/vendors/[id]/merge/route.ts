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

    // Verify ownership of both vendors
    const { data: sourceVendor } = await supabase
      .from('vendors')
      .select('id, name')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    const { data: targetVendor } = await supabase
      .from('vendors')
      .select('id, name')
      .eq('id', targetId)
      .eq('user_id', user.id)
      .single()

    if (!sourceVendor || !targetVendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    // Update all transactions to use the target vendor
    const { error: updateError } = await supabase
      .from('transactions')
      .update({ vendor_id: targetId })
      .eq('vendor_id', id)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Error updating transactions:', updateError)
      return NextResponse.json({ error: 'Failed to merge vendors' }, { status: 500 })
    }

    // Delete the source vendor
    const { error: deleteError } = await supabase
      .from('vendors')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Error deleting source vendor:', deleteError)
      return NextResponse.json({ error: 'Failed to delete source vendor' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in POST /api/settings/vendors/[id]/merge:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
