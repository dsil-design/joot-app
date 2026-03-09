import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { createServiceRoleClient } from '../supabase/server';
import type { EmailInsertData, SyncResult, ImapConfig, EmailContent, EmailAttachment } from './email-types';
import type { BatchProcessingResult } from '../email/types';
import { getEarliestTransactionDate } from '../email/date-cutoff';

/**
 * Extended sync result that includes extraction statistics
 */
export interface SyncWithExtractionResult extends SyncResult {
  /** Extraction processing result */
  extraction?: {
    processed: number;
    extracted: number;
    failed: number;
    skipped: number;
  };
}

/**
 * iCloud IMAP configuration
 */
const ICLOUD_IMAP_CONFIG: Omit<ImapConfig, 'auth'> = {
  host: 'imap.mail.me.com',
  port: 993,
  secure: true,
};

/**
 * Service for syncing emails from iCloud via IMAP
 *
 * Features:
 * - Connects to iCloud IMAP using app-specific password
 * - Syncs email metadata (not body) from specified folder
 * - Incremental sync using IMAP UID
 * - On-demand email content fetching
 */
export class EmailSyncService {
  private client: ImapFlow | null = null;
  private connected = false;

  /**
   * Get IMAP configuration from environment variables
   */
  private getImapConfig(): ImapConfig {
    const email = process.env.ICLOUD_EMAIL;
    const password = process.env.ICLOUD_APP_PASSWORD;

    if (!email || !password) {
      throw new Error('Missing iCloud credentials. Set ICLOUD_EMAIL and ICLOUD_APP_PASSWORD environment variables.');
    }

    return {
      ...ICLOUD_IMAP_CONFIG,
      auth: {
        user: email,
        pass: password,
      },
    };
  }

  /**
   * Get the folder name to sync from environment or use default
   */
  private getFolder(): string {
    return process.env.ICLOUD_FOLDER || 'Transactions';
  }

  /**
   * Establish connection to iCloud IMAP server
   */
  async connect(): Promise<void> {
    // Always create a fresh connection — in serverless environments,
    // a previous connection may be stale after function freeze/thaw
    if (this.client) {
      try { await this.client.logout(); } catch { /* ignore */ }
      this.client = null;
      this.connected = false;
    }

    const config = this.getImapConfig();

    console.log(`Connecting to iCloud IMAP server (${config.host}:${config.port})...`);

    this.client = new ImapFlow({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
      logger: false, // Disable verbose logging
    });

    try {
      await this.client.connect();
      this.connected = true;
      console.log('Successfully connected to iCloud IMAP server');
    } catch (error) {
      this.client = null;
      this.connected = false;
      throw new Error(`Failed to connect to iCloud IMAP: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Disconnect from IMAP server
   */
  async disconnect(): Promise<void> {
    if (this.client && this.connected) {
      try {
        await this.client.logout();
        console.log('Disconnected from iCloud IMAP server');
      } catch (error) {
        console.warn('Error during IMAP disconnect:', error);
      } finally {
        this.client = null;
        this.connected = false;
      }
    }
  }

  /**
   * Sync emails from specified folder
   *
   * @param folder - IMAP folder name
   * @param userId - User ID to associate emails with
   * @returns Sync result with statistics
   */
  async syncFolder(folder: string, userId: string): Promise<SyncResult> {
    if (!this.client || !this.connected) {
      throw new Error('Not connected to IMAP server. Call connect() first.');
    }

    const startTime = Date.now();
    const result: SyncResult = {
      success: true,
      synced: 0,
      errors: 0,
      lastUid: 0,
      message: '',
    };

    try {
      console.log(`Syncing folder: ${folder}`);

      // Get current sync state
      const lastUid = await this.getLastSyncedUid(userId, folder);
      console.log(`Last synced UID: ${lastUid}`);

      // Open the mailbox
      const mailbox = await this.client.mailboxOpen(folder);
      console.log(`Mailbox opened: ${mailbox.exists} messages, UID validity: ${mailbox.uidValidity}`);

      if (mailbox.exists === 0) {
        result.message = 'Folder is empty';
        return result;
      }

      // Determine the UID range to fetch
      // For initial sync (lastUid = 0), use SINCE filter based on earliest transaction date
      // For incremental sync, fetch messages newer than last synced UID
      const emails: EmailInsertData[] = [];
      let uidsToFetch: number[];

      if (lastUid > 0) {
        // Incremental sync: fetch messages newer than last synced UID
        const searchQuery = `${lastUid + 1}:*`;
        uidsToFetch = await this.client.search({ uid: searchQuery }, { uid: true });
      } else {
        // Initial sync: use SINCE filter based on earliest transaction date
        const earliestDate = await getEarliestTransactionDate(userId);
        if (earliestDate) {
          // IMAP SINCE uses date only (no time), and is inclusive
          const sinceDate = earliestDate.toISOString().split('T')[0];
          console.log(`Initial sync: using SINCE ${sinceDate} (earliest transaction date)`);
          uidsToFetch = await this.client.search({ since: sinceDate }, { uid: true });
        } else {
          // No transactions exist — fall back to last 500 messages
          const startSeq = Math.max(1, mailbox.exists - 499);
          const searchQuery = `${startSeq}:*`;
          console.log(`Initial sync: no transactions found, fetching last 500 messages`);
          uidsToFetch = await this.client.search({ uid: searchQuery }, { uid: true });
        }
      }

      if (!uidsToFetch || uidsToFetch.length === 0) {
        result.message = 'No new emails to sync';
        console.log(result.message);
        return result;
      }

      console.log(`Found ${uidsToFetch.length} messages to fetch, UIDs: ${uidsToFetch.slice(0, 5).join(', ')}${uidsToFetch.length > 5 ? '...' : ''}`);

      // Fetch message envelopes and source (for body parsing)
      // Pass { uid: true } as third param to indicate we're using UIDs not sequence numbers
      for await (const message of this.client.fetch(uidsToFetch, {
        uid: true,
        envelope: true,
        flags: true,
        bodyStructure: true,
        source: true,
      }, { uid: true })) {
        try {
          // Skip if this is the same UID we already have (edge case)
          if (message.uid <= lastUid) {
            continue;
          }

          const envelope = message.envelope;
          if (!envelope) {
            console.warn(`No envelope for message UID ${message.uid}`);
            continue;
          }
          const fromAddress = envelope.from?.[0];

          // Parse body from source
          let text_body: string | null = null;
          let html_body: string | null = null;
          if (message.source) {
            const parsed = await this.parseEmailBody(message.source);
            text_body = parsed.text ?? '';
            html_body = parsed.html ?? '';
          }

          emails.push({
            user_id: userId,
            message_id: envelope.messageId || `uid-${message.uid}`,
            uid: message.uid,
            folder,
            subject: envelope.subject || null,
            from_address: fromAddress?.address || null,
            from_name: fromAddress?.name || null,
            date: envelope.date?.toISOString() || null,
            seen: message.flags?.has('\\Seen') || false,
            has_attachments: this.hasAttachments(message.bodyStructure),
            text_body,
            html_body,
          });

          result.lastUid = Math.max(result.lastUid, message.uid);
        } catch (parseError) {
          console.error(`Error parsing message UID ${message.uid}:`, parseError);
          result.errors++;
        }
      }

      console.log(`Fetched ${emails.length} new emails`);

      // Insert emails into database
      if (emails.length > 0) {
        const insertedCount = await this.insertEmails(emails, userId);
        result.synced = insertedCount;
      }

      // Update sync state
      if (result.lastUid > lastUid) {
        await this.updateSyncState(userId, folder, result.lastUid);
      }

      const duration = Date.now() - startTime;
      result.message = `Synced ${result.synced} emails in ${duration}ms`;
      console.log(result.message);

    } catch (error) {
      result.success = false;
      result.message = `Sync failed: ${error instanceof Error ? error.message : String(error)}`;
      console.error(result.message);
    }

    return result;
  }

  /**
   * Fetch full email content on demand
   *
   * @param folder - IMAP folder name
   * @param uid - IMAP UID of the message
   * @returns Email content including body
   */
  async fetchEmailContent(folder: string, uid: number): Promise<EmailContent | null> {
    // Check DB first for stored bodies
    try {
      const supabase = createServiceRoleClient();
      const { data: dbEmail } = await supabase
        .from('emails')
        .select('text_body, html_body, subject, from_address, from_name, date')
        .eq('folder', folder)
        .eq('uid', uid)
        .single();

      if (dbEmail && (dbEmail.text_body !== null || dbEmail.html_body !== null)) {
        return {
          uid,
          subject: dbEmail.subject || null,
          from: {
            address: dbEmail.from_address || null,
            name: dbEmail.from_name || null,
          },
          date: dbEmail.date ? new Date(dbEmail.date) : null,
          text: dbEmail.text_body,
          html: dbEmail.html_body,
          attachments: [],
        };
      }
    } catch {
      // Fall through to IMAP fetch
    }

    if (!this.client || !this.connected) {
      throw new Error('Not connected to IMAP server. Call connect() first.');
    }

    try {
      await this.client.mailboxOpen(folder);

      const message = await this.client.fetchOne(uid.toString(), {
        uid: true,
        envelope: true,
        source: true,
        bodyStructure: true,
      });

      if (!message || !message.envelope) {
        return null;
      }

      const envelope = message.envelope;
      const fromAddress = envelope.from?.[0];

      // Parse email body from source using mailparser
      const source = message.source || Buffer.alloc(0);
      const { text, html } = await this.parseEmailBody(source);

      return {
        uid,
        subject: envelope.subject || null,
        from: {
          address: fromAddress?.address || null,
          name: fromAddress?.name || null,
        },
        date: envelope.date || null,
        text,
        html,
        attachments: this.parseAttachments(message.bodyStructure),
      };
    } catch (error) {
      console.error(`Error fetching email content for UID ${uid}:`, error);
      return null;
    }
  }

  /**
   * Check if message has attachments based on body structure
   */
  private hasAttachments(bodyStructure: unknown): boolean {
    if (!bodyStructure || typeof bodyStructure !== 'object') {
      return false;
    }

    const structure = bodyStructure as Record<string, unknown>;

    // Check for multipart with attachments
    if (structure.type === 'multipart') {
      const childNodes = structure.childNodes as unknown[];
      if (Array.isArray(childNodes)) {
        return childNodes.some((child) => {
          const childObj = child as Record<string, unknown>;
          return childObj.disposition === 'attachment' ||
                 this.hasAttachments(child);
        });
      }
    }

    return structure.disposition === 'attachment';
  }

  /**
   * Parse attachments from body structure
   */
  private parseAttachments(bodyStructure: unknown): EmailAttachment[] {
    const attachments: EmailAttachment[] = [];

    if (!bodyStructure || typeof bodyStructure !== 'object') {
      return attachments;
    }

    const structure = bodyStructure as Record<string, unknown>;

    if (structure.disposition === 'attachment') {
      attachments.push({
        filename: (structure.dispositionParameters as Record<string, string>)?.filename || 'unknown',
        contentType: `${structure.type}/${structure.subtype}`,
        size: (structure.size as number) || 0,
      });
    }

    if (structure.childNodes && Array.isArray(structure.childNodes)) {
      for (const child of structure.childNodes) {
        attachments.push(...this.parseAttachments(child));
      }
    }

    return attachments;
  }

  /**
   * Parse email body from raw source using mailparser
   * Handles base64, quoted-printable, charset encoding, and multipart MIME
   */
  private async parseEmailBody(source: Buffer | string): Promise<{ text: string | null; html: string | null }> {
    try {
      const parsed = await simpleParser(source);
      return {
        text: parsed.text || null,
        html: typeof parsed.html === 'string' ? parsed.html : null,
      };
    } catch (error) {
      console.error('Error parsing email body:', error);
      return { text: null, html: null };
    }
  }

  /**
   * Get last synced UID for folder from database
   */
  private async getLastSyncedUid(userId: string, folder: string): Promise<number> {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from('email_sync_state')
      .select('last_uid')
      .eq('user_id', userId)
      .eq('folder', folder)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error fetching sync state:', error);
      throw error;
    }

    return data?.last_uid || 0;
  }

  /**
   * Update sync state in database
   */
  private async updateSyncState(userId: string, folder: string, lastUid: number): Promise<void> {
    const supabase = createServiceRoleClient();

    const { error } = await supabase
      .from('email_sync_state')
      .upsert({
        user_id: userId,
        folder,
        last_uid: lastUid,
        last_sync_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,folder',
      });

    if (error) {
      console.error('Error updating sync state:', error);
      throw error;
    }

    console.log(`Updated sync state: folder=${folder}, lastUid=${lastUid}`);
  }

  /**
   * Insert emails into database
   */
  private async insertEmails(emails: EmailInsertData[], _userId: string): Promise<number> {
    const supabase = createServiceRoleClient();

    // Use upsert to handle duplicates gracefully
    const { data, error } = await supabase
      .from('emails')
      .upsert(emails, {
        onConflict: 'user_id,message_id',
        ignoreDuplicates: true,
      })
      .select('id');

    if (error) {
      console.error('Error inserting emails:', error);
      throw error;
    }

    return data?.length || 0;
  }

  /**
   * Get sync statistics for a user
   */
  async getSyncStats(userId: string): Promise<{
    totalEmails: number;
    lastSyncAt: string | null;
    folders: Array<{ folder: string; count: number; lastUid: number }>;
  }> {
    const supabase = createServiceRoleClient();

    // Get total email count
    const { count: totalEmails } = await supabase
      .from('emails')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Get sync state for all folders
    const { data: syncStates } = await supabase
      .from('email_sync_state')
      .select('folder, last_uid, last_sync_at')
      .eq('user_id', userId);

    // Get email count per folder
    const { data: folderCounts } = await supabase
      .from('emails')
      .select('folder')
      .eq('user_id', userId);

    const folderCountMap = new Map<string, number>();
    folderCounts?.forEach(email => {
      const count = folderCountMap.get(email.folder) || 0;
      folderCountMap.set(email.folder, count + 1);
    });

    const folders = syncStates?.map(state => ({
      folder: state.folder,
      count: folderCountMap.get(state.folder) || 0,
      lastUid: state.last_uid ?? 0,
    })) || [];

    // Find most recent sync
    const lastSyncAt = syncStates?.reduce((latest, state) => {
      if (!state.last_sync_at) return latest;
      if (!latest) return state.last_sync_at;
      return state.last_sync_at > latest ? state.last_sync_at : latest;
    }, null as string | null) || null;

    return {
      totalEmails: totalEmails || 0,
      lastSyncAt,
      folders,
    };
  }

  /**
   * Execute a full sync with automatic connect/disconnect
   */
  async executeSync(userId: string): Promise<SyncResult> {
    const folder = this.getFolder();

    try {
      await this.connect();
      return await this.syncFolder(folder, userId);
    } finally {
      await this.disconnect();
    }
  }

  /**
   * Execute full sync with extraction processing
   *
   * This is the main entry point for email sync that:
   * 1. Syncs email metadata from IMAP
   * 2. Processes each email through the appropriate parser
   * 3. Stores extracted transaction data in email_transactions table
   *
   * @param userId - User ID to sync for
   * @returns Combined sync and extraction result
   */
  async executeSyncWithExtraction(userId: string): Promise<SyncWithExtractionResult> {
    // First, sync emails from IMAP
    const syncResult = await this.executeSync(userId);

    // If sync failed or no new emails, return early
    if (!syncResult.success || syncResult.synced === 0) {
      return {
        ...syncResult,
        extraction: {
          processed: 0,
          extracted: 0,
          failed: 0,
          skipped: 0,
        },
      };
    }

    // Import extraction service lazily to avoid circular dependencies
    const { extractionService } = await import('../email/extraction-service');

    // Process newly synced emails through extraction
    let extractionResult: BatchProcessingResult;
    try {
      extractionResult = await extractionService.processNewEmails(userId);
    } catch (error) {
      console.error('Extraction processing failed:', error);
      // Return sync success but note extraction failure
      return {
        ...syncResult,
        message: `${syncResult.message}. Extraction failed: ${error instanceof Error ? error.message : String(error)}`,
        extraction: {
          processed: 0,
          extracted: 0,
          failed: 0,
          skipped: 0,
        },
      };
    }

    // Combine results
    const message = `${syncResult.message}. Extracted: ${extractionResult.extracted}, Failed: ${extractionResult.failed}`;
    console.log(message);

    return {
      ...syncResult,
      message,
      extraction: {
        processed: extractionResult.processed,
        extracted: extractionResult.extracted,
        failed: extractionResult.failed,
        skipped: extractionResult.skipped,
      },
    };
  }
}

// Singleton instance
export const emailSyncService = new EmailSyncService();
