import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { parseRulePayload, type AutoTagRulePayload } from '../validate'

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

    const body = await request.json()

    // The list view toggles `enabled` on its own; that shouldn't require
    // resending the whole rule through full validation.
    const isToggleOnly =
      body && typeof body === 'object' &&
      Object.keys(body).length === 1 &&
      typeof body.enabled === 'boolean'

    let updateData: { enabled: boolean } | AutoTagRulePayload
    if (isToggleOnly) {
      updateData = { enabled: body.enabled as boolean }
    } else {
      const parsed = parseRulePayload(body)
      if (!parsed.ok) {
        return NextResponse.json({ error: parsed.error }, { status: 400 })
      }
      updateData = parsed.value
    }

    const { data, error } = await supabase
      .from('auto_tag_rules')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating auto-tag rule:', error)
      return NextResponse.json({ error: 'Failed to update rule' }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in PATCH /api/settings/auto-tag-rules/[id]:', error)
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

    const { error } = await supabase
      .from('auto_tag_rules')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting auto-tag rule:', error)
      return NextResponse.json({ error: 'Failed to delete rule' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/settings/auto-tag-rules/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
