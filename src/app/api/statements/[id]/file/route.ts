import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/statements/[id]/file
 *
 * Returns a signed URL for viewing/downloading the original statement file.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: statementId } = await params

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(statementId)) {
      return NextResponse.json({ error: 'Invalid statement ID format' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: statement, error: fetchError } = await supabase
      .from('statement_uploads')
      .select('id, user_id, file_path, file_type, filename')
      .eq('id', statementId)
      .single()

    if (fetchError || !statement) {
      return NextResponse.json({ error: 'Statement not found' }, { status: 404 })
    }

    if (statement.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: urlData, error: urlError } = await supabase.storage
      .from('statement-uploads')
      .createSignedUrl(statement.file_path, 3600)

    if (urlError || !urlData) {
      return NextResponse.json(
        { error: 'Failed to generate file URL' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      url: urlData.signedUrl,
      filename: statement.filename,
      fileType: statement.file_type,
    })
  } catch (error) {
    console.error('Statement file API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
