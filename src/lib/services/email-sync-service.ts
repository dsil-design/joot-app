/**
 * Email Sync Service
 *
 * Orchestrates the complete email synchronization process:
 * 1. Connect to IMAP server
 * 2. Fetch emails from specified folder
 * 3. Store .eml files in Supabase Storage
 * 4. Index emails in database with metadata
 * 5. Track sync progress in email_sync_jobs table
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { IMAPConnection, createIMAPConfig, type EmailAccount } from './imap-connection'
import { storeEmail, calculateEmailHash } from './email-storage-service'
import { simpleParser } from 'mailparser'

export interface SyncOptions {
  emailAccountId: string
  userId: string
  folderName?: string
  syncType?: 'full' | 'incremental'
  limit?: number
  supabaseClient: SupabaseClient
}

export interface SyncResult {
  success: boolean
  jobId?: string
  emailsIndexed: number
  emailsSkipped: number
  receiptsDetected: number
  error?: string
}

export interface SyncProgress {
  current: number
  total: number
  percentage: number
  emailsIndexed: number
  emailsSkipped: number
  receiptsDetected: number
}

/**
 * Simple receipt detection heuristic
 * Returns true if email appears to be a receipt
 */
function isReceiptCandidate(subject: string, senderEmail: string, body: string): boolean {
  const receiptKeywords = [
    'receipt',
    'invoice',
    'order confirmation',
    'payment received',
    'purchase',
    'transaction',
    'bill',
    'statement'
  ]

  const subjectLower = subject.toLowerCase()
  const bodyLower = body.toLowerCase()

  // Check subject for receipt keywords
  const hasReceiptKeyword = receiptKeywords.some(keyword =>
    subjectLower.includes(keyword) || bodyLower.includes(keyword)
  )

  // Check sender domain for common vendors
  const commonVendorDomains = [
    'amazon.com',
    'apple.com',
    'paypal.com',
    'stripe.com',
    'square.com',
    'shopify.com',
    'etsy.com',
    'ebay.com'
  ]

  const senderDomain = senderEmail.split('@')[1]?.toLowerCase() || ''
  const isFromVendor = commonVendorDomains.some(domain => senderDomain.includes(domain))

  return hasReceiptKeyword || isFromVendor
}

/**
 * Calculate detection score (0-100) for receipt likelihood
 */
function calculateDetectionScore(subject: string, senderEmail: string, body: string): number {
  let score = 0

  const subjectLower = subject.toLowerCase()
  const bodyLower = body.toLowerCase()

  // Receipt keywords in subject (+20)
  if (/(receipt|invoice|order|purchase|payment)/.test(subjectLower)) {
    score += 20
  }

  // Transaction/money keywords (+15)
  if (/(transaction|total|amount|paid|charge|billing)/.test(bodyLower)) {
    score += 15
  }

  // Has dollar/currency symbols (+10)
  if (/[\$€£¥]/.test(body) || /\d+\.\d{2}/.test(body)) {
    score += 10
  }

  // From known vendor (+25)
  const senderDomain = senderEmail.split('@')[1]?.toLowerCase() || ''
  const knownVendors = ['amazon', 'apple', 'paypal', 'stripe', 'shopify', 'square']
  if (knownVendors.some(vendor => senderDomain.includes(vendor))) {
    score += 25
  }

  // Has order number pattern (+15)
  if (/(order|invoice|transaction)\s*(#|number|id|no\.?)[\s:]*\w+/i.test(body)) {
    score += 15
  }

  // Has date (+10)
  if (/\d{1,2}\/\d{1,2}\/\d{2,4}/.test(body) || /\d{4}-\d{2}-\d{2}/.test(body)) {
    score += 10
  }

  // Has vendor address/contact (+5)
  if (/(www\.|https?:\/\/|@|phone|tel)/.test(bodyLower)) {
    score += 5
  }

  return Math.min(score, 100)
}

/**
 * Sync emails from an IMAP account
 *
 * @param options - Sync configuration
 * @returns Sync result with statistics
 *
 * @example
 * const result = await syncEmails({
 *   emailAccountId: account.id,
 *   userId: user.id,
 *   folderName: 'INBOX',
 *   syncType: 'incremental',
 *   supabaseClient: supabase
 * })
 */
export async function syncEmails(options: SyncOptions): Promise<SyncResult> {
  const {
    emailAccountId,
    userId,
    folderName = 'INBOX',
    syncType = 'incremental',
    limit,
    supabaseClient
  } = options

  let jobId: string | null = null
  let conn: IMAPConnection | null = null

  try {
    // 1. Fetch email account from database
    const { data: account, error: accountError } = await supabaseClient
      .from('email_accounts')
      .select('*')
      .eq('id', emailAccountId)
      .eq('user_id', userId)
      .single()

    if (accountError || !account) {
      return {
        success: false,
        emailsIndexed: 0,
        emailsSkipped: 0,
        receiptsDetected: 0,
        error: 'Email account not found or access denied'
      }
    }

    // 2. Create sync job in database
    const { data: job, error: jobError } = await supabaseClient
      .from('email_sync_jobs')
      .insert({
        email_account_id: emailAccountId,
        user_id: userId,
        sync_type: syncType,
        job_status: 'running',
        folder_name: folderName,
        started_at: new Date().toISOString()
      })
      .select()
      .single()

    if (jobError || !job) {
      return {
        success: false,
        emailsIndexed: 0,
        emailsSkipped: 0,
        receiptsDetected: 0,
        error: 'Failed to create sync job'
      }
    }

    jobId = job.id

    // 3. Connect to IMAP server
    console.log('[SYNC] Creating IMAP config...')
    const config = createIMAPConfig(account as unknown as EmailAccount)
    conn = new IMAPConnection(config)
    console.log('[SYNC] Connecting to IMAP...')
    await conn.connect()
    console.log('[SYNC] IMAP connected')

    // 4. Open mailbox
    console.log(`[SYNC] Opening mailbox: ${folderName}`)
    const box = await conn.openBox(folderName, true)
    console.log(`[SYNC] Mailbox opened, ${box.messages.total} total messages`)

    // 5. Determine which messages to fetch
    let searchCriteria: any[]

    if (syncType === 'full') {
      // Fetch all messages
      searchCriteria = ['ALL']
    } else {
      // Incremental: fetch messages since last sync
      const lastSyncDate = account.last_sync_at
        ? new Date(account.last_sync_at)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days

      // Format date for IMAP (DD-MMM-YYYY format, e.g., "01-Jan-2025")
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const formattedDate = `${lastSyncDate.getDate()}-${months[lastSyncDate.getMonth()]}-${lastSyncDate.getFullYear()}`

      searchCriteria = ['SINCE', formattedDate]
    }

    console.log(`[SYNC] Search criteria:`, searchCriteria)

    // 6. Search for messages
    const uids = await conn.searchMessages(searchCriteria)
    console.log(`[SYNC] Found ${uids.length} messages matching criteria`)

    // Apply limit if specified
    const uidsToFetch = limit ? uids.slice(0, limit) : uids
    console.log(`[SYNC] Will fetch ${uidsToFetch.length} emails (limit: ${limit || 'none'})`)

    // Update job with total count
    await supabaseClient
      .from('email_sync_jobs')
      .update({
        progress_total: uidsToFetch.length
      })
      .eq('id', jobId)

    // 7. Fetch and process messages
    let emailsIndexed = 0
    let emailsSkipped = 0
    let receiptsDetected = 0

    // Process in batches of 10
    const batchSize = 10
    for (let i = 0; i < uidsToFetch.length; i += batchSize) {
      const batchUids = uidsToFetch.slice(i, i + batchSize)
      console.log(`[SYNC] Fetching batch ${Math.floor(i / batchSize) + 1}: UIDs ${batchUids[0]} to ${batchUids[batchUids.length - 1]}`)

      const messages = await conn.fetchMessages(batchUids, {
        bodies: '',
        struct: true,
        envelope: true
      })
      console.log(`[SYNC] Retrieved ${messages.length} messages from batch`)

      for (const message of messages) {
        try {
          // Calculate email hash for deduplication
          const emailHash = calculateEmailHash(message.body)

          // Check if email already exists
          const { data: existing } = await supabaseClient
            .from('email_messages')
            .select('id')
            .eq('email_hash', emailHash)
            .single()

          if (existing) {
            emailsSkipped++
            continue
          }

          // Parse email content
          const parsed = await simpleParser(message.body)

          const subject = parsed.subject || message.subject || ''
          const senderEmail = parsed.from?.value[0]?.address || message.from[0]?.address || ''
          const senderName = parsed.from?.value[0]?.name || message.from[0]?.name || ''
          const senderDomain = senderEmail.split('@')[1] || ''
          const textContent = parsed.text || ''

          // Detect if it's a receipt
          const isReceipt = isReceiptCandidate(subject, senderEmail, textContent)
          const detectionScore = isReceipt ? calculateDetectionScore(subject, senderEmail, textContent) : 0

          // Store .eml file in storage
          const storageResult = await storeEmail({
            userId,
            emailAccountId,
            messageUid: String(message.uid),
            emlContent: message.body,
            supabaseClient
          })

          if (!storageResult.success) {
            console.error('Failed to store email:', storageResult.error)
            continue
          }

          // Insert email record into database
          await supabaseClient.from('email_messages').insert({
            email_account_id: emailAccountId,
            user_id: userId,
            message_uid: String(message.uid),
            email_hash: emailHash,
            subject,
            sender_name: senderName,
            sender_email: senderEmail,
            sender_domain: senderDomain,
            received_date: message.date.toISOString(),
            storage_path: storageResult.storagePath!,
            has_attachments: (parsed.attachments?.length || 0) > 0,
            attachment_count: parsed.attachments?.length || 0,
            is_receipt_candidate: isReceipt,
            detection_score: detectionScore,
            processing_status: 'completed',
            raw_text_content: textContent.substring(0, 10000) // Limit to 10KB
          })

          emailsIndexed++
          if (isReceipt) {
            receiptsDetected++
          }

          // Update progress
          await supabaseClient
            .from('email_sync_jobs')
            .update({
              progress_current: i + messages.indexOf(message) + 1,
              progress_percentage: ((i + messages.indexOf(message) + 1) / uidsToFetch.length) * 100,
              emails_indexed: emailsIndexed,
              emails_skipped: emailsSkipped,
              receipts_detected: receiptsDetected
            })
            .eq('id', jobId)
        } catch (error) {
          console.error('Failed to process message:', error)
          emailsSkipped++
        }
      }
    }

    // 8. Update job status
    await supabaseClient
      .from('email_sync_jobs')
      .update({
        job_status: 'completed',
        completed_at: new Date().toISOString(),
        emails_indexed: emailsIndexed,
        emails_skipped: emailsSkipped,
        receipts_detected: receiptsDetected
      })
      .eq('id', jobId)

    // 9. Update email account stats
    await supabaseClient
      .from('email_accounts')
      .update({
        last_sync_at: new Date().toISOString(),
        total_emails_synced: account.total_emails_synced + emailsIndexed,
        total_receipts_found: account.total_receipts_found + receiptsDetected
      })
      .eq('id', emailAccountId)

    // 10. Disconnect
    if (conn) {
      await conn.disconnect()
    }

    return {
      success: true,
      jobId,
      emailsIndexed,
      emailsSkipped,
      receiptsDetected
    }
  } catch (error) {
    // Update job status to failed
    if (jobId) {
      await supabaseClient
        .from('email_sync_jobs')
        .update({
          job_status: 'failed',
          error_message: error instanceof Error ? error.message : String(error),
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId)
    }

    // Disconnect if connected
    if (conn) {
      try {
        await conn.disconnect()
      } catch (e) {
        // Ignore disconnect errors
      }
    }

    return {
      success: false,
      jobId: jobId || undefined,
      emailsIndexed: 0,
      emailsSkipped: 0,
      receiptsDetected: 0,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

/**
 * Test IMAP connection for an email account
 *
 * @param options - Test options
 * @returns Connection test result
 */
export async function testEmailConnection(options: {
  emailAccountId: string
  userId: string
  supabaseClient: SupabaseClient
}): Promise<{ success: boolean; error?: string }> {
  const { emailAccountId, userId, supabaseClient } = options

  try {
    // Fetch email account
    const { data: account, error: accountError } = await supabaseClient
      .from('email_accounts')
      .select('*')
      .eq('id', emailAccountId)
      .eq('user_id', userId)
      .single()

    if (accountError || !account) {
      return {
        success: false,
        error: 'Email account not found'
      }
    }

    // Create config and test connection
    const config = createIMAPConfig(account as unknown as EmailAccount)
    const conn = new IMAPConnection(config)

    await conn.connect()
    await conn.disconnect()

    // Update account status
    await supabaseClient
      .from('email_accounts')
      .update({
        connection_status: 'connected',
        last_connection_test_at: new Date().toISOString()
      })
      .eq('id', emailAccountId)

    return {
      success: true
    }
  } catch (error) {
    // Update account status
    await supabaseClient
      .from('email_accounts')
      .update({
        connection_status: 'failed',
        last_connection_test_at: new Date().toISOString()
      })
      .eq('id', emailAccountId)

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}
