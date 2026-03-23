import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/payment-slips/[id]/file
 *
 * Returns a signed URL for viewing the original payment slip image.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: slipId } = await params

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(slipId)) {
      return NextResponse.json({ error: 'Invalid payment slip ID format' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: slip, error: fetchError } = await supabase
      .from('payment_slip_uploads')
      .select('id, user_id, file_path, file_type, filename')
      .eq('id', slipId)
      .single()

    if (fetchError || !slip) {
      return NextResponse.json({ error: 'Payment slip not found' }, { status: 404 })
    }

    if (slip.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: urlData, error: urlError } = await supabase.storage
      .from('statement-uploads')
      .createSignedUrl(slip.file_path, 3600)

    if (urlError || !urlData) {
      return NextResponse.json({ error: 'Failed to generate file URL' }, { status: 500 })
    }

    return NextResponse.json({
      url: urlData.signedUrl,
      filename: slip.filename,
      fileType: slip.file_type,
    })
  } catch (error) {
    console.error('Payment slip file API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
