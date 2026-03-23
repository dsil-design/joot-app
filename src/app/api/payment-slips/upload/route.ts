import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/payment-slips/upload
 *
 * Creates a database record for an uploaded payment slip image.
 * The file should already be uploaded to Supabase Storage (statement-uploads bucket).
 *
 * Request body:
 * - file_path: string (required)
 * - filename: string (optional)
 * - file_size: number (optional)
 * - file_type: string (optional)
 * - file_hash: string (optional) - SHA256 for duplicate detection
 * - force_upload: boolean (optional) - Skip duplicate check
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: {
      file_path?: string
      filename?: string
      file_size?: number
      file_type?: string
      file_hash?: string
      force_upload?: boolean
    }

    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { file_path } = body

    if (!file_path || typeof file_path !== 'string') {
      return NextResponse.json(
        { error: 'file_path is required and must be a string' },
        { status: 400 }
      )
    }

    // Duplicate check by file hash
    if (body.file_hash && !body.force_upload) {
      const { data: existing } = await supabase
        .from('payment_slip_uploads')
        .select('id, filename, uploaded_at')
        .eq('user_id', user.id)
        .eq('file_hash', body.file_hash)
        .limit(1)
        .single()

      if (existing) {
        return NextResponse.json(
          {
            error: 'Duplicate payment slip detected',
            existing_upload: existing,
            can_force: true,
          },
          { status: 409 }
        )
      }
    }

    // Create record
    const { data: upload, error: insertError } = await supabase
      .from('payment_slip_uploads')
      .insert({
        user_id: user.id,
        filename: body.filename || file_path.split('/').pop() || 'unknown',
        file_path,
        file_size: body.file_size ?? null,
        file_type: body.file_type ?? null,
        file_hash: body.file_hash ?? null,
        status: 'pending',
        review_status: 'pending',
      })
      .select('id, filename, file_path, status, created_at')
      .single()

    if (insertError) {
      console.error('Failed to create payment slip upload record:', insertError)
      return NextResponse.json({ error: 'Failed to create upload record' }, { status: 500 })
    }

    return NextResponse.json(
      {
        success: true,
        upload_id: upload.id,
        filename: upload.filename,
        file_path: upload.file_path,
        status: upload.status,
        created_at: upload.created_at,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Payment slip upload API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
