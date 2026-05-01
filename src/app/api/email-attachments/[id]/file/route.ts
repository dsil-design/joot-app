import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/email-attachments/[id]/file
 *
 * Returns a short-lived signed URL for the original PDF attachment so the
 * review-queue UI can preview / download the receipt.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: attachmentId } = await params

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(attachmentId)) {
      return NextResponse.json({ error: 'Invalid attachment ID format' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: attachment, error: fetchError } = await supabase
      .from('email_attachments')
      .select('id, user_id, filename, content_type, storage_path, extraction_status')
      .eq('id', attachmentId)
      .single()

    if (fetchError || !attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })
    }

    if (attachment.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!attachment.storage_path) {
      return NextResponse.json({ error: 'Attachment file is not available' }, { status: 404 })
    }

    const { data: urlData, error: urlError } = await supabase.storage
      .from('email-attachments')
      .createSignedUrl(attachment.storage_path, 3600)

    if (urlError || !urlData) {
      return NextResponse.json({ error: 'Failed to generate file URL' }, { status: 500 })
    }

    return NextResponse.json({
      url: urlData.signedUrl,
      filename: attachment.filename,
      fileType: attachment.content_type,
    })
  } catch (error) {
    console.error('Email attachment file API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
