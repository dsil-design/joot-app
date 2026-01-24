import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * DELETE /api/statements/[id]
 *
 * Deletes a statement upload and its associated file from storage.
 *
 * Returns:
 * - 200: Deleted successfully
 * - 401: Unauthorized
 * - 404: Statement not found or not owned by user
 * - 500: Internal server error
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get the statement upload to verify ownership and get file path
    const { data: upload, error: fetchError } = await supabase
      .from('statement_uploads')
      .select('id, file_path, user_id')
      .eq('id', id)
      .single()

    if (fetchError || !upload) {
      return NextResponse.json(
        { error: 'Statement not found' },
        { status: 404 }
      )
    }

    // Verify ownership
    if (upload.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Statement not found' },
        { status: 404 }
      )
    }

    // Delete the file from storage (if it exists)
    if (upload.file_path) {
      const { error: storageError } = await supabase.storage
        .from('statement-uploads')
        .remove([upload.file_path])

      if (storageError) {
        console.error('Failed to delete file from storage:', storageError)
        // Continue with database deletion even if storage deletion fails
      }
    }

    // Delete the database record
    const { error: deleteError } = await supabase
      .from('statement_uploads')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Failed to delete statement record:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete statement' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Statement delete API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
