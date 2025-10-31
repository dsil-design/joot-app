import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/documents
 *
 * Fetch all documents for the authenticated user
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch documents for the user
    const { data: documents, error: dbError } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (dbError) {
      console.error('Failed to fetch documents:', dbError)
      return NextResponse.json(
        { error: 'Failed to fetch documents', message: dbError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ documents })
  } catch (error) {
    console.error('Unexpected error fetching documents:', error)
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    )
  }
}
