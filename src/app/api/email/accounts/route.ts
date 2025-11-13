/**
 * Email Accounts API
 * POST /api/email/accounts - Add new email account
 * GET /api/email/accounts - List email accounts
 */

import { createClient } from '@/lib/supabase/server'
import { encryptString } from '@/lib/utils/encryption'
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
    const { email_address, provider, imap_host, imap_port, imap_password, selected_folder_name } = body

    // Validate required fields
    if (!email_address || !provider || !imap_host || !imap_port || !imap_password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Encrypt password
    const { encrypted, iv } = encryptString(imap_password)

    // Insert email account
    const { data: account, error: insertError } = await supabase
      .from('email_accounts')
      .insert({
        user_id: user.id,
        email_address,
        provider,
        imap_host,
        imap_port: parseInt(imap_port),
        imap_password_encrypted: encrypted,
        encryption_iv: iv,
        selected_folder_name: selected_folder_name || null,
        connection_status: 'pending'
      })
      .select()
      .single()

    if (insertError) {
      console.error('Failed to insert email account:', insertError)
      return NextResponse.json(
        { error: 'Failed to create email account' },
        { status: 500 }
      )
    }

    return NextResponse.json({ account }, { status: 201 })
  } catch (error) {
    console.error('Email account creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
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

    // Fetch user's email accounts (excluding encrypted password)
    const { data: accounts, error: fetchError } = await supabase
      .from('email_accounts')
      .select('id, email_address, provider, imap_host, imap_port, selected_folder_name, connection_status, last_sync_at, total_emails_synced, total_receipts_found, sync_enabled, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error('Failed to fetch email accounts:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch email accounts' },
        { status: 500 }
      )
    }

    return NextResponse.json({ accounts })
  } catch (error) {
    console.error('Email accounts fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
