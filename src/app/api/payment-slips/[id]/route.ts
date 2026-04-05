import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** Editable fields on a payment slip */
const EDITABLE_FIELDS = [
  'amount', 'fee', 'transaction_date', 'transaction_time',
  'sender_name', 'sender_bank', 'sender_account',
  'recipient_name', 'recipient_bank', 'recipient_account',
  'memo', 'detected_direction',
] as const

/**
 * GET /api/payment-slips/[id]
 *
 * Returns full detail for a single payment slip.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: slip, error: fetchError } = await supabase
      .from('payment_slip_uploads')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !slip) {
      return NextResponse.json({ error: 'Payment slip not found' }, { status: 404 })
    }

    return NextResponse.json(slip)
  } catch (error) {
    console.error('Payment slip GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/payment-slips/[id]
 *
 * Updates extracted fields on a payment slip (user correction).
 * Records corrections in extraction_log and logs an import_activity
 * so the AI learning pipeline can improve future extractions.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch existing slip
    const { data: slip, error: fetchError } = await supabase
      .from('payment_slip_uploads')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !slip) {
      return NextResponse.json({ error: 'Payment slip not found' }, { status: 404 })
    }

    // Build update payload from only allowed fields
    const updates: Record<string, unknown> = {}
    const corrections: Array<{ field: string; original: unknown; corrected: unknown }> = []

    for (const field of EDITABLE_FIELDS) {
      if (field in body) {
        const newVal = body[field]
        const oldVal = slip[field]

        // Only record if actually changed
        if (String(newVal ?? '') !== String(oldVal ?? '')) {
          corrections.push({ field, original: oldVal, corrected: newVal })
        }
        updates[field] = newVal
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Merge corrections into extraction_log
    const existingLog = (slip.extraction_log as Record<string, unknown>) || {}
    const existingCorrections = (existingLog.corrections as unknown[]) || []
    if (corrections.length > 0) {
      updates.extraction_log = {
        ...existingLog,
        corrections: [
          ...existingCorrections,
          {
            corrected_at: new Date().toISOString(),
            fields: corrections,
          },
        ],
      }
    }

    // Apply update
    const { data: updated, error: updateError } = await supabase
      .from('payment_slip_uploads')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single()

    if (updateError) {
      console.error('Payment slip update error:', updateError)
      return NextResponse.json({ error: 'Failed to update payment slip' }, { status: 500 })
    }

    // Log correction activity (fire-and-forget)
    if (corrections.length > 0) {
      const fieldNames = corrections.map(c => c.field).join(', ')
      supabase
        .from('import_activities')
        .insert({
          user_id: user.id,
          activity_type: 'slip_corrected',
          payment_slip_upload_id: id,
          description: `Corrected payment slip fields: ${fieldNames}`,
          metadata: { corrections },
          transactions_affected: 0,
          total_amount: updated.amount,
          currency: updated.currency || 'THB',
        })
        .then(({ error }) => {
          if (error) console.error('Failed to log correction activity:', error)
        })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Payment slip PATCH error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/payment-slips/[id]
 *
 * Deletes a payment slip upload and its associated file from storage.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the slip to verify ownership and get file path
    const { data: slip, error: fetchError } = await supabase
      .from('payment_slip_uploads')
      .select('id, file_path, user_id')
      .eq('id', id)
      .single()

    if (fetchError || !slip) {
      return NextResponse.json({ error: 'Payment slip not found' }, { status: 404 })
    }

    if (slip.user_id !== user.id) {
      return NextResponse.json({ error: 'Payment slip not found' }, { status: 404 })
    }

    // Delete the file from storage
    if (slip.file_path) {
      const { error: storageError } = await supabase.storage
        .from('statement-uploads')
        .remove([slip.file_path])

      if (storageError) {
        console.error('Failed to delete file from storage:', storageError)
        // Continue with database deletion even if storage deletion fails
      }
    }

    // Delete the database record
    const { error: deleteError } = await supabase
      .from('payment_slip_uploads')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Failed to delete payment slip record:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete payment slip' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Payment slip delete API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
