/**
 * Email Transaction Extraction Service
 *
 * Orchestrates email parsing, extraction, and storage into email_transactions table.
 * This service extends the existing emailSyncService by adding transaction extraction.
 *
 * Key responsibilities:
 * 1. Classify incoming emails (receipt, order confirmation, bank transfer, etc.)
 * 2. Route emails to appropriate parsers (Grab, Bolt, Bangkok Bank, etc.)
 * 3. Extract transaction data with confidence scoring
 * 4. Store extracted data in email_transactions table
 * 5. Log extraction activities for audit trail
 */

import { createServiceRoleClient } from '../supabase/server';
import { emailSyncService } from '../services/email-sync-service';
import {
  EMAIL_TRANSACTION_STATUS,
  EMAIL_CLASSIFICATION,
  IMPORT_ACTIVITY_TYPE,
} from '../types/email-imports';
import type {
  RawEmailData,
  ExtractionResult,
  ClassificationResult,
  BatchProcessingResult,
  EmailTransactionData,
  EmailParser,
  ExtractionServiceConfig,
} from './types';

/**
 * Registry of available email parsers
 *
 * Parsers are registered here and selected based on email classification.
 * Each parser implements the EmailParser interface.
 */
class ParserRegistry {
  private parsers: Map<string, EmailParser> = new Map();

  /**
   * Register a new parser
   */
  register(parser: EmailParser): void {
    this.parsers.set(parser.key, parser);
  }

  /**
   * Get parser by key
   */
  get(key: string): EmailParser | undefined {
    return this.parsers.get(key);
  }

  /**
   * Find the first parser that can handle this email
   */
  findParser(email: RawEmailData): EmailParser | null {
    const parsers = Array.from(this.parsers.values());
    for (const parser of parsers) {
      if (parser.canParse(email)) {
        return parser;
      }
    }
    return null;
  }

  /**
   * Get all registered parsers
   */
  getAll(): EmailParser[] {
    return Array.from(this.parsers.values());
  }

  /**
   * Get count of registered parsers
   */
  get count(): number {
    return this.parsers.size;
  }
}

/**
 * Email Extraction Service
 *
 * Main service class that orchestrates email extraction workflow.
 */
export class EmailExtractionService {
  private parserRegistry: ParserRegistry;
  private config: ExtractionServiceConfig;

  constructor(config: Partial<ExtractionServiceConfig> = {}) {
    this.parserRegistry = new ParserRegistry();
    this.config = {
      minAutoClassifyConfidence: config.minAutoClassifyConfidence ?? 55,
      processUnknownEmails: config.processUnknownEmails ?? true,
      batchSize: config.batchSize ?? 100,
    };
  }

  /**
   * Register a parser with the service
   */
  registerParser(parser: EmailParser): void {
    this.parserRegistry.register(parser);
    console.log(`Registered parser: ${parser.name} (${parser.key})`);
  }

  /**
   * Get parser registry for testing/introspection
   */
  getParserRegistry(): ParserRegistry {
    return this.parserRegistry;
  }

  /**
   * Classify an email to determine its type and appropriate parser
   */
  classifyEmail(email: RawEmailData): ClassificationResult {
    const fromAddress = email.from_address?.toLowerCase() || '';
    const subject = email.subject?.toLowerCase() || '';

    // Find matching parser
    const parser = this.parserRegistry.findParser(email);

    if (parser) {
      // Parser found - determine classification based on parser type
      const classification = this.getClassificationForParser(parser.key);
      const status = this.getInitialStatusForClassification(classification, parser.key);

      return {
        classification,
        status,
        parserKey: parser.key,
        confidence: 90, // High confidence when parser matches
      };
    }

    // No parser found - try basic classification
    return this.classifyUnknownEmail(email);
  }

  /**
   * Get classification type for a parser
   */
  private getClassificationForParser(parserKey: string): typeof EMAIL_CLASSIFICATION[keyof typeof EMAIL_CLASSIFICATION] {
    switch (parserKey) {
      case 'grab':
      case 'bolt':
        return EMAIL_CLASSIFICATION.RECEIPT;
      case 'bangkok-bank':
      case 'kasikorn':
        return EMAIL_CLASSIFICATION.BANK_TRANSFER;
      case 'lazada':
        return EMAIL_CLASSIFICATION.ORDER_CONFIRMATION;
      default:
        return EMAIL_CLASSIFICATION.UNKNOWN;
    }
  }

  /**
   * Get initial status based on classification and parser
   *
   * THB receipts from Grab/Bolt typically need USD statement matching.
   * Bank transfers are ready for import directly.
   */
  private getInitialStatusForClassification(
    classification: typeof EMAIL_CLASSIFICATION[keyof typeof EMAIL_CLASSIFICATION],
    parserKey: string | null
  ): typeof EMAIL_TRANSACTION_STATUS[keyof typeof EMAIL_TRANSACTION_STATUS] {
    // THB receipts from ride-hailing apps typically paid via USD credit card
    // These need to wait for statement to match the USD charge
    if (parserKey === 'grab' || parserKey === 'bolt') {
      return EMAIL_TRANSACTION_STATUS.WAITING_FOR_STATEMENT;
    }

    // Bank transfers are direct THB transactions, ready to import
    if (classification === EMAIL_CLASSIFICATION.BANK_TRANSFER) {
      return EMAIL_TRANSACTION_STATUS.READY_TO_IMPORT;
    }

    // Default: needs user review
    return EMAIL_TRANSACTION_STATUS.PENDING_REVIEW;
  }

  /**
   * Classify email that doesn't match any parser
   */
  private classifyUnknownEmail(email: RawEmailData): ClassificationResult {
    const fromAddress = email.from_address?.toLowerCase() || '';
    const subject = email.subject?.toLowerCase() || '';

    // Look for common patterns
    if (subject.includes('receipt') || subject.includes('payment confirmation')) {
      return {
        classification: EMAIL_CLASSIFICATION.RECEIPT,
        status: EMAIL_TRANSACTION_STATUS.PENDING_REVIEW,
        parserKey: null,
        confidence: 40,
      };
    }

    if (subject.includes('order') || subject.includes('confirmation')) {
      return {
        classification: EMAIL_CLASSIFICATION.ORDER_CONFIRMATION,
        status: EMAIL_TRANSACTION_STATUS.PENDING_REVIEW,
        parserKey: null,
        confidence: 30,
      };
    }

    if (fromAddress.includes('bank') || subject.includes('transfer')) {
      return {
        classification: EMAIL_CLASSIFICATION.BANK_TRANSFER,
        status: EMAIL_TRANSACTION_STATUS.PENDING_REVIEW,
        parserKey: null,
        confidence: 30,
      };
    }

    // Default: unknown
    return {
      classification: EMAIL_CLASSIFICATION.UNKNOWN,
      status: EMAIL_TRANSACTION_STATUS.PENDING_REVIEW,
      parserKey: null,
      confidence: 0,
    };
  }

  /**
   * Extract transaction data from a single email
   */
  extractFromEmail(email: RawEmailData): ExtractionResult {
    // Find appropriate parser
    const parser = this.parserRegistry.findParser(email);

    if (!parser) {
      return {
        success: false,
        confidence: 0,
        errors: ['No parser found for this email'],
        notes: `From: ${email.from_address}, Subject: ${email.subject}`,
      };
    }

    try {
      const result = parser.extract(email);
      return result;
    } catch (error) {
      console.error(`Parser error (${parser.key}):`, error);
      return {
        success: false,
        confidence: 0,
        errors: [`Parser error: ${error instanceof Error ? error.message : String(error)}`],
      };
    }
  }

  /**
   * Calculate overall extraction confidence score
   *
   * Scoring breakdown (0-100):
   * - All required fields present: +40 points
   * - Amount parsed correctly: +20 points
   * - Date parsed correctly: +20 points
   * - Vendor identified: +10 points
   * - Order ID found: +10 points
   */
  calculateConfidence(result: ExtractionResult): number {
    if (!result.success || !result.data) {
      return 0;
    }

    let score = 0;
    const data = result.data;

    // Required fields present (vendor, amount, currency, date)
    if (data.vendor_name_raw && data.amount && data.currency && data.transaction_date) {
      score += 40;
    }

    // Amount parsed correctly (positive number)
    if (data.amount && data.amount > 0) {
      score += 20;
    }

    // Date parsed correctly (valid date)
    if (data.transaction_date && !isNaN(data.transaction_date.getTime())) {
      score += 20;
    }

    // Vendor identified
    if (data.vendor_name_raw && data.vendor_name_raw.length > 0) {
      score += 10;
    }

    // Order ID found
    if (data.order_id) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  /**
   * Process new emails from the emails table and extract transaction data
   *
   * This is called after email sync to process newly synced emails.
   */
  async processNewEmails(userId: string): Promise<BatchProcessingResult> {
    const result: BatchProcessingResult = {
      processed: 0,
      extracted: 0,
      failed: 0,
      skipped: 0,
      results: new Map(),
      errors: [],
    };

    const supabase = createServiceRoleClient();

    try {
      // Get unprocessed emails (emails that don't have a corresponding email_transaction)
      const { data: emails, error: fetchError } = await supabase
        .from('emails')
        .select('*')
        .eq('user_id', userId)
        .order('uid', { ascending: true })
        .limit(this.config.batchSize);

      if (fetchError) {
        result.errors.push(`Failed to fetch emails: ${fetchError.message}`);
        return result;
      }

      if (!emails || emails.length === 0) {
        return result;
      }

      // Check which emails already have email_transactions
      const messageIds = emails.map(e => e.message_id);
      const { data: existingTransactions } = await supabase
        .from('email_transactions')
        .select('message_id')
        .eq('user_id', userId)
        .in('message_id', messageIds);

      const existingMessageIds = new Set(existingTransactions?.map(t => t.message_id) || []);

      // Process each email
      for (const email of emails) {
        // Skip if already processed
        if (existingMessageIds.has(email.message_id)) {
          result.skipped++;
          continue;
        }

        result.processed++;

        try {
          // Fetch full email content for extraction
          const emailContent = await this.fetchEmailContent(email.folder, email.uid);

          if (!emailContent) {
            result.failed++;
            result.results.set(email.message_id, {
              success: false,
              confidence: 0,
              errors: ['Failed to fetch email content'],
            });
            continue;
          }

          // Build raw email data
          const rawEmail: RawEmailData = {
            message_id: email.message_id,
            uid: email.uid,
            folder: email.folder,
            subject: email.subject,
            from_address: email.from_address,
            from_name: email.from_name,
            email_date: email.date ? new Date(email.date) : new Date(),
            text_body: emailContent.text,
            html_body: emailContent.html,
            seen: email.seen ?? false,
            has_attachments: email.has_attachments ?? false,
          };

          // Classify email
          const classification = this.classifyEmail(rawEmail);

          // Extract transaction data
          const extraction = this.extractFromEmail(rawEmail);

          // Calculate confidence
          const confidence = this.calculateConfidence(extraction);

          // Determine final status based on extraction result
          let status = classification.status;
          if (!extraction.success || confidence < this.config.minAutoClassifyConfidence) {
            status = EMAIL_TRANSACTION_STATUS.PENDING_REVIEW;
          }

          // Prepare data for database
          const transactionData: EmailTransactionData = {
            user_id: userId,
            message_id: email.message_id,
            uid: email.uid,
            folder: email.folder,
            subject: email.subject,
            from_address: email.from_address,
            from_name: email.from_name,
            email_date: email.date || new Date().toISOString(),
            seen: email.seen ?? false,
            has_attachments: email.has_attachments ?? false,
            status,
            classification: classification.classification,
            extraction_confidence: confidence,
            extraction_notes: extraction.notes || extraction.errors?.join('; ') || null,
            synced_at: email.synced_at || new Date().toISOString(),
            processed_at: new Date().toISOString(),
          };

          // Add extracted data if successful
          if (extraction.success && extraction.data) {
            transactionData.vendor_name_raw = extraction.data.vendor_name_raw;
            transactionData.amount = extraction.data.amount;
            transactionData.currency = extraction.data.currency;
            transactionData.transaction_date = extraction.data.transaction_date.toISOString().split('T')[0];
            transactionData.description = extraction.data.description || null;
            transactionData.order_id = extraction.data.order_id || null;
          }

          // Insert into email_transactions
          const { error: insertError } = await supabase
            .from('email_transactions')
            .insert(transactionData);

          if (insertError) {
            result.failed++;
            result.results.set(email.message_id, {
              success: false,
              confidence: 0,
              errors: [`Database insert failed: ${insertError.message}`],
            });
            continue;
          }

          result.extracted++;
          result.results.set(email.message_id, extraction);

        } catch (error) {
          result.failed++;
          result.errors.push(`Error processing ${email.message_id}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // Log activity
      await this.logActivity(userId, result);

    } catch (error) {
      result.errors.push(`Batch processing error: ${error instanceof Error ? error.message : String(error)}`);
    }

    return result;
  }

  /**
   * Fetch email content using the email sync service
   */
  private async fetchEmailContent(folder: string, uid: number): Promise<{ text: string | null; html: string | null } | null> {
    try {
      await emailSyncService.connect();
      const content = await emailSyncService.fetchEmailContent(folder, uid);
      return content ? { text: content.text, html: content.html } : null;
    } catch (error) {
      console.error(`Failed to fetch email content (folder: ${folder}, uid: ${uid}):`, error);
      return null;
    } finally {
      await emailSyncService.disconnect();
    }
  }

  /**
   * Log extraction activity for audit trail
   */
  private async logActivity(userId: string, result: BatchProcessingResult): Promise<void> {
    if (result.processed === 0) {
      return;
    }

    const supabase = createServiceRoleClient();

    try {
      await supabase.from('import_activities').insert({
        user_id: userId,
        activity_type: IMPORT_ACTIVITY_TYPE.EMAIL_SYNC,
        description: `Processed ${result.processed} emails: ${result.extracted} extracted, ${result.failed} failed, ${result.skipped} skipped`,
        transactions_affected: result.extracted,
        metadata: {
          processed: result.processed,
          extracted: result.extracted,
          failed: result.failed,
          skipped: result.skipped,
          errors: result.errors.slice(0, 10), // Limit stored errors
        },
      });
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  }

  /**
   * Re-process a specific email transaction
   *
   * Used when user wants to retry extraction or when new parsers are added.
   */
  async reprocessEmailTransaction(userId: string, emailTransactionId: string): Promise<ExtractionResult> {
    const supabase = createServiceRoleClient();

    // Get the email transaction
    const { data: emailTx, error: fetchError } = await supabase
      .from('email_transactions')
      .select('*')
      .eq('id', emailTransactionId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !emailTx) {
      return {
        success: false,
        confidence: 0,
        errors: ['Email transaction not found'],
      };
    }

    // Fetch email content
    const content = await this.fetchEmailContent(emailTx.folder, emailTx.uid);
    if (!content) {
      return {
        success: false,
        confidence: 0,
        errors: ['Failed to fetch email content'],
      };
    }

    // Build raw email data
    const rawEmail: RawEmailData = {
      message_id: emailTx.message_id,
      uid: emailTx.uid,
      folder: emailTx.folder,
      subject: emailTx.subject,
      from_address: emailTx.from_address,
      from_name: emailTx.from_name,
      email_date: emailTx.email_date ? new Date(emailTx.email_date) : new Date(),
      text_body: content.text,
      html_body: content.html,
      seen: emailTx.seen ?? false,
      has_attachments: emailTx.has_attachments ?? false,
    };

    // Re-classify and extract
    const classification = this.classifyEmail(rawEmail);
    const extraction = this.extractFromEmail(rawEmail);
    const confidence = this.calculateConfidence(extraction);

    // Update the email transaction
    const updateData: Record<string, unknown> = {
      classification: classification.classification,
      extraction_confidence: confidence,
      extraction_notes: extraction.notes || extraction.errors?.join('; ') || null,
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Update extracted data if successful
    if (extraction.success && extraction.data) {
      updateData.vendor_name_raw = extraction.data.vendor_name_raw;
      updateData.amount = extraction.data.amount;
      updateData.currency = extraction.data.currency;
      updateData.transaction_date = extraction.data.transaction_date.toISOString().split('T')[0];
      updateData.description = extraction.data.description || null;
      updateData.order_id = extraction.data.order_id || null;

      // Update status based on new extraction
      if (confidence >= this.config.minAutoClassifyConfidence) {
        updateData.status = classification.status;
      } else {
        updateData.status = EMAIL_TRANSACTION_STATUS.PENDING_REVIEW;
      }
    }

    await supabase
      .from('email_transactions')
      .update(updateData)
      .eq('id', emailTransactionId);

    return extraction;
  }

  /**
   * Get extraction statistics for a user
   */
  async getExtractionStats(userId: string): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byClassification: Record<string, number>;
    avgConfidence: number;
  }> {
    const supabase = createServiceRoleClient();

    const { data: transactions } = await supabase
      .from('email_transactions')
      .select('status, classification, extraction_confidence')
      .eq('user_id', userId);

    if (!transactions || transactions.length === 0) {
      return {
        total: 0,
        byStatus: {},
        byClassification: {},
        avgConfidence: 0,
      };
    }

    const byStatus: Record<string, number> = {};
    const byClassification: Record<string, number> = {};
    let totalConfidence = 0;
    let confidenceCount = 0;

    for (const tx of transactions) {
      // Count by status
      const status = tx.status || 'unknown';
      byStatus[status] = (byStatus[status] || 0) + 1;

      // Count by classification
      const classification = tx.classification || 'unknown';
      byClassification[classification] = (byClassification[classification] || 0) + 1;

      // Sum confidence for average
      if (tx.extraction_confidence !== null) {
        totalConfidence += tx.extraction_confidence;
        confidenceCount++;
      }
    }

    return {
      total: transactions.length,
      byStatus,
      byClassification,
      avgConfidence: confidenceCount > 0 ? Math.round(totalConfidence / confidenceCount) : 0,
    };
  }
}

// Singleton instance with default configuration
export const extractionService = new EmailExtractionService();
