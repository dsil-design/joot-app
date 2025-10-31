/**
 * Document Detail API Endpoint
 *
 * GET /api/documents/[id]
 * - Fetch document with all related data (extractions, matches)
 *
 * DELETE /api/documents/[id]
 * - Delete document from database and storage
 */

import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{
    id: string
  }>
}

/**
 * GET /api/documents/[id]
 *
 * Fetch document by ID with all related data
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const supabase = await createClient()
    const { id } = await context.params

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch document with related data
    // Note: document_extractions uses 'merchant_name' field (not 'vendor_name')
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select(
        `
        *,
        extraction:document_extractions(*),
        matches:transaction_document_matches(
          *,
          transaction:transactions(
            *,
            vendor:vendors(*),
            payment_method:payment_methods(*)
          )
        )
      `
      )
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (docError) {
      if (docError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 })
      }
      console.error('Database error fetching document:', docError)
      return NextResponse.json({ error: 'Failed to fetch document' }, { status: 500 })
    }

    // Generate signed URL for the document file (valid for 1 hour)
    // Use service role client to bypass RLS for storage access
    const serviceRoleClient = createServiceRoleClient()
    const { data: urlData, error: urlError } = await serviceRoleClient.storage
      .from('documents')
      .createSignedUrl(document.storage_path, 3600)

    if (urlError) {
      console.error('Error generating signed URL:', urlError)
    }

    // Generate signed URL for thumbnail if it exists
    let thumbnailUrl = null
    if (document.thumbnail_path) {
      const { data: thumbData, error: thumbError } = await serviceRoleClient.storage
        .from('documents')
        .createSignedUrl(document.thumbnail_path, 3600)

      if (thumbError) {
        console.error('Error generating thumbnail URL:', thumbError)
      }

      thumbnailUrl = thumbData?.signedUrl || null
    }

    return NextResponse.json({
      document: {
        ...document,
        file_url: urlData?.signedUrl || null,
        thumbnail_url: thumbnailUrl,
      },
    })
  } catch (error) {
    console.error('Unexpected error fetching document:', error)
    return NextResponse.json(
      { error: 'Failed to fetch document' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/documents/[id]
 *
 * Delete document from database and storage
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const supabase = await createClient()
    const { id } = await context.params

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // First, get the document to retrieve storage paths
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('storage_path, thumbnail_path')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 })
      }
      console.error('Error fetching document for deletion:', fetchError)
      return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
    }

    // Delete from database (cascade will delete related records)
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Error deleting document from database:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete document' },
        { status: 500 }
      )
    }

    // Delete files from storage using service role client
    const serviceRoleClient = createServiceRoleClient()
    const filesToDelete = [document.storage_path]
    if (document.thumbnail_path) {
      filesToDelete.push(document.thumbnail_path)
    }

    const { error: storageError } = await serviceRoleClient.storage
      .from('documents')
      .remove(filesToDelete)

    if (storageError) {
      // Log error but don't fail the request since DB record is already deleted
      console.error('Error deleting files from storage:', storageError)
      console.error('Files that failed to delete:', filesToDelete)
    }

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully',
    })
  } catch (error) {
    console.error('Unexpected error deleting document:', error)
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    )
  }
}
