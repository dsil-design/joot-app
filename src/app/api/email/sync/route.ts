/**
 * Email Sync API
 * POST /api/email/sync - Trigger email sync for an account
 */

import { createClient } from '@/lib/supabase/server'
import { syncEmails } from '@/lib/services/email-sync-service'
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
    const { email_account_id, folder_name, sync_type, limit } = body

    // Validate required fields
    if (!email_account_id) {
      return NextResponse.json(
        { error: 'email_account_id is required' },
        { status: 400 }
      )
    }

    // Verify account belongs to user
    const { data: account, error: accountError } = await supabase
      .from('email_accounts')
      .select('id')
      .eq('id', email_account_id)
      .eq('user_id', user.id)
      .single()

    if (accountError || !account) {
      return NextResponse.json(
        { error: 'Email account not found or access denied' },
        { status: 404 }
      )
    }

    // Trigger sync (in background for production, but synchronous for now)
    const result = await syncEmails({
      emailAccountId: email_account_id,
      userId: user.id,
      folderName: folder_name || 'INBOX',
      syncType: sync_type || 'incremental',
      limit: limit ? parseInt(limit) : undefined,
      supabaseClient: supabase
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Sync failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      job_id: result.jobId,
      emails_indexed: result.emailsIndexed,
      emails_skipped: result.emailsSkipped,
      receipts_detected: result.receiptsDetected
    })
  } catch (error) {
    console.error('Email sync error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
