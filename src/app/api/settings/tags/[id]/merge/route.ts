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

    // Verify ownership of both tags
    const { data: sourceTag } = await supabase
      .from('tags')
      .select('id, name')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    const { data: targetTag } = await supabase
      .from('tags')
      .select('id, name')
      .eq('id', targetId)
      .eq('user_id', user.id)
      .single()

    if (!sourceTag || !targetTag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
    }

    // Get all transaction IDs that have the source tag
    const { data: transactionTags } = await supabase
      .from('transaction_tags')
      .select('transaction_id')
      .eq('tag_id', id)

    if (transactionTags && transactionTags.length > 0) {
      // For each transaction, check if it already has the target tag
      for (const { transaction_id } of transactionTags) {
        const { data: existingTargetTag } = await supabase
          .from('transaction_tags')
          .select('id')
          .eq('transaction_id', transaction_id)
          .eq('tag_id', targetId)
          .single()

        if (!existingTargetTag) {
          // Add the target tag to this transaction
          await supabase
            .from('transaction_tags')
            .insert({
              transaction_id,
              tag_id: targetId,
            })
        }
      }

      // Delete all source tag associations
      await supabase
        .from('transaction_tags')
        .delete()
        .eq('tag_id', id)
    }

    // Delete the source tag
    const { error: deleteError } = await supabase
      .from('tags')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Error deleting source tag:', deleteError)
      return NextResponse.json({ error: 'Failed to delete source tag' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in POST /api/settings/tags/[id]/merge:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
