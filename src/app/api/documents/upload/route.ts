import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { uploadDocument } from '@/lib/services/storage-service'
import { enqueueJob, JOB_TYPES } from '@/lib/services/job-queue-service'

export const dynamic = 'force-dynamic'

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'message/rfc822', // .eml email files
]

/**
 * POST /api/documents/upload
 *
 * Upload a document (receipt, invoice, etc.) to storage
 * Creates a database record and uploads file to Supabase Storage
 *
 * Body: multipart/form-data with 'file' field
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: 'File too large',
          message: `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`
        },
        { status: 400 }
      )
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: 'Invalid file type',
          message: 'Only PDF, JPEG, PNG, and EML files are allowed'
        },
        { status: 400 }
      )
    }

    // Generate document ID
    const documentId = crypto.randomUUID()

    // Upload to storage
    const uploadResult = await uploadDocument({
      file,
      userId: user.id,
      documentId,
      compress: true,
    })

    if (!uploadResult.success) {
      console.error('Storage upload failed:', uploadResult.error)
      return NextResponse.json(
        { error: 'Upload failed', message: uploadResult.error },
        { status: 500 }
      )
    }

    // Create database record
    const { data: document, error: dbError } = await supabase
      .from('documents')
      .insert({
        id: documentId,
        user_id: user.id,
        file_name: file.name,
        file_type: getFileType(file.type),
        file_size_bytes: uploadResult.metadata?.compressedSize || file.size,
        mime_type: file.type,
        storage_path: uploadResult.storagePath!,
        thumbnail_path: uploadResult.thumbnailPath || null,
        processing_status: 'pending',
        ocr_confidence: null,
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database insert failed:', dbError)

      // Cleanup: Delete uploaded file if database insert fails
      // Note: In production, you might want to use a cleanup job instead
      // await deleteDocument(uploadResult.storagePath!, uploadResult.thumbnailPath)

      return NextResponse.json(
        { error: 'Database error', message: 'Failed to create document record' },
        { status: 500 }
      )
    }

    // Enqueue OCR processing job (async, non-blocking)
    // Only process images and PDFs (skip emails for now)
    if (file.type.startsWith('image/') || file.type === 'application/pdf') {
      try {
        await enqueueJob(JOB_TYPES.PROCESS_OCR, {
          documentId: documentId,
          userId: user.id,
        })
        console.log(`Enqueued OCR job for document: ${documentId}`)
      } catch (error) {
        // Don't fail the upload if job enqueueing fails
        console.error('Failed to enqueue OCR job:', error)
      }
    }

    // Return success response
    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        fileName: document.file_name,
        fileType: document.file_type,
        fileSizeBytes: document.file_size_bytes,
        storagePath: document.storage_path,
        thumbnailPath: document.thumbnail_path,
        processingStatus: document.processing_status,
        createdAt: document.created_at,
      },
      uploadMetadata: {
        originalSize: file.size,
        compressedSize: uploadResult.metadata?.compressedSize,
        percentSaved: uploadResult.metadata?.percentSaved,
      },
    })
  } catch (error) {
    console.error('Unexpected error in document upload API:', error)
    return NextResponse.json(
      { error: 'Upload failed', message: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

/**
 * Helper function to normalize file types
 */
function getFileType(mimeType: string): string {
  if (mimeType === 'application/pdf') return 'pdf'
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType === 'message/rfc822') return 'email'
  return 'unknown'
}
