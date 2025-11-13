/**
 * Email Connection Test API
 * POST /api/email/test-connection - Test IMAP connection for an account
 */

import { createClient } from '@/lib/supabase/server'
import { testEmailConnection } from '@/lib/services/email-sync-service'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { email_account_id } = body

    // Validate required fields
    if (!email_account_id) {
      return NextResponse.json(
        { error: 'email_account_id is required' },
        { status: 400 }
      )
    }

    // Test connection
    const result = await testEmailConnection({
      emailAccountId: email_account_id,
      userId: user.id,
      supabaseClient: supabase
    })

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Connection test failed'
        },
        { status: 200 } // Return 200 with error details
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Connection successful'
    })
  } catch (error) {
    console.error('Connection test error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
