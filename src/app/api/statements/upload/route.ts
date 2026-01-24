import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkForDuplicates, getDuplicateMessage } from '@/lib/statements/duplicate-detector'

/**
 * POST /api/statements/upload
 *
 * Creates a database record for an uploaded statement file.
 * The file should already be uploaded to Supabase Storage before calling this endpoint.
 *
 * Request body:
 * - file_path: string (required) - The path in Supabase Storage
 * - payment_method_id: string (required) - UUID of the payment method
 * - filename: string (optional) - Original filename
 * - file_size: number (optional) - File size in bytes
 * - file_type: string (optional) - MIME type
 * - file_hash: string (optional) - SHA256 hash for duplicate detection
 * - force_upload: boolean (optional) - Skip duplicate check and force upload
 *
 * Note: Statement period is automatically extracted from the PDF during processing.
 *
 * Returns:
 * - 201: Record created successfully with upload ID
 * - 400: Missing required fields or validation error
 * - 401: Unauthorized
 * - 404: Payment method not found
 * - 409: Duplicate detected (includes duplicate info and previous upload link)
 * - 500: Internal server error
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    let body: {
      file_path?: string
      payment_method_id?: string
      filename?: string
      file_size?: number
      file_type?: string
      file_hash?: string
      force_upload?: boolean
    }

    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    // Validate required fields
    const { file_path, payment_method_id } = body

    if (!file_path || typeof file_path !== 'string') {
      return NextResponse.json(
        { error: 'file_path is required and must be a string' },
        { status: 400 }
      )
    }

    if (!payment_method_id || typeof payment_method_id !== 'string') {
      return NextResponse.json(
        { error: 'payment_method_id is required and must be a string' },
        { status: 400 }
      )
    }

    // Validate UUID format for payment_method_id
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(payment_method_id)) {
      return NextResponse.json(
        { error: 'payment_method_id must be a valid UUID' },
        { status: 400 }
      )
    }

    // Validate payment_method_id exists and belongs to user
    const { data: paymentMethod, error: pmError } = await supabase
      .from('payment_methods')
      .select('id')
      .eq('id', payment_method_id)
      .eq('user_id', user.id)
      .single()

    if (pmError || !paymentMethod) {
      return NextResponse.json(
        { error: 'Payment method not found' },
        { status: 404 }
      )
    }

    // Check for duplicates by file hash (unless force_upload is true)
    // Note: Period-based duplicate detection happens after processing when we know the actual period
    if (body.file_hash && !body.force_upload) {
      const duplicateResult = await checkForDuplicates(
        supabase,
        user.id,
        body.file_hash,
        payment_method_id
      )

      if (duplicateResult.hasDuplicate) {
        const message = getDuplicateMessage(duplicateResult)
        const firstDuplicate = duplicateResult.duplicates[0]

        return NextResponse.json(
          {
            error: 'Duplicate statement detected',
            message,
            duplicate_type: firstDuplicate.type,
            existing_upload: firstDuplicate.existingUpload,
            duplicates: duplicateResult.duplicates,
            can_force: duplicateResult.canProceed,
          },
          { status: 409 }
        )
      }
    }

    // Create statement_uploads record
    // Note: statement_period_start and statement_period_end will be set after PDF processing
    const { data: upload, error: insertError } = await supabase
      .from('statement_uploads')
      .insert({
        user_id: user.id,
        filename: body.filename || file_path.split('/').pop() || 'unknown',
        file_path,
        file_size: body.file_size ?? null,
        file_type: body.file_type ?? null,
        file_hash: body.file_hash ?? null,
        payment_method_id,
        status: 'pending',
      })
      .select('id, filename, file_path, status, created_at')
      .single()

    if (insertError) {
      console.error('Failed to create statement upload record:', insertError)
      return NextResponse.json(
        { error: 'Failed to create upload record' },
        { status: 500 }
      )
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
    console.error('Statement upload API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
