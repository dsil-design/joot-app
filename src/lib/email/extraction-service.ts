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
import {
  calculateConfidenceScore,
  determineStatusFromConfidence,
  type ConfidenceScoreBreakdown,
} from './confidence-scoring';
import {
  classifyEmailWithContext,
  detectPaymentContext,
  getStatusFromRules,
  type ClassificationContext,
  type ExtendedClassificationResult,
  type PaymentContext,
} from './classifier';

// Import parsers
import { grabParser } from './extractors/grab';
import { boltParser } from './extractors/bolt';
import { bangkokBankParser } from './extractors/bangkok-bank';
import { kasikornParser } from './extractors/kasikorn';
import { lazadaParser } from './extractors/lazada';

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
   *
   * This is a basic classification without extraction data.
   * For full classification with currency awareness, use classifyEmailWithExtraction.
   */
  classifyEmail(email: RawEmailData): ClassificationResult {
    // Use the enhanced classifier from classifier.ts
    const result = classifyEmailWithContext(email);
    return {
      classification: result.classification,
      status: result.status,
      parserKey: result.parserKey,
      confidence: result.confidence,
    };
  }

  /**
   * Classify an email with extraction data for full context
   *
   * This uses the enhanced classification system that considers:
   * - Parser type
   * - Payment context (e-wallet vs credit card)
   * - Currency (THB vs USD)
   *
   * Returns extended classification with rule matching info for debugging.
   */
  classifyEmailWithExtraction(
    email: RawEmailData,
    extractionResult: ExtractionResult
  ): ExtendedClassificationResult {
    const extractedData = extractionResult.success ? extractionResult.data : undefined;
    return classifyEmailWithContext(email, extractedData);
  }

  /**
   * Get the payment context for an email
   *
   * Detects if payment was made via e-wallet (GrabPay, Bolt Balance) or credit card.
   */
  getPaymentContext(parserKey: string | null, email: RawEmailData): PaymentContext {
    return detectPaymentContext(parserKey, email);
  }

  /**
   * Determine final status based on full context
   *
   * Uses the classification rules engine to determine the appropriate status
   * based on parser, classification, payment context, and currency.
   */
  determineStatusFromContext(context: ClassificationContext): typeof EMAIL_TRANSACTION_STATUS[keyof typeof EMAIL_TRANSACTION_STATUS] {
    return getStatusFromRules(context);
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
   *
   * @deprecated Use calculateConfidenceWithBreakdown for detailed scoring
   */
  calculateConfidence(result: ExtractionResult): number {
    const breakdown = this.calculateConfidenceWithBreakdown(result);
    return breakdown.totalScore;
  }

  /**
   * Calculate confidence score with detailed breakdown
   *
   * Returns a detailed breakdown of the confidence score including
   * individual component scores and human-readable notes.
   */
  calculateConfidenceWithBreakdown(result: ExtractionResult): ConfidenceScoreBreakdown {
    if (!result.success || !result.data) {
      return calculateConfidenceScore(undefined);
    }
    return calculateConfidenceScore(result.data);
  }

  /**
   * Build extraction notes combining parser notes with score breakdown
   *
   * Creates a comprehensive note string for the extraction_notes column
   * that includes both parser-specific notes and the confidence breakdown.
   */
  private buildExtractionNotes(
    extraction: ExtractionResult,
    breakdown: ConfidenceScoreBreakdown
  ): string {
    const parts: string[] = [];

    // Add confidence summary
    parts.push(breakdown.summary);

    // Add parser notes if present
    if (extraction.notes) {
      parts.push(`Parser notes: ${extraction.notes}`);
    }

    // Add errors if present
    if (extraction.errors && extraction.errors.length > 0) {
      parts.push(`Errors: ${extraction.errors.join('; ')}`);
    }

    // Add score breakdown details
    const scoreDetails = breakdown.components
      .map(c => `${c.satisfied ? '✓' : '✗'} ${c.name}: ${c.earnedPoints}/${c.maxPoints}`)
      .join(', ');
    parts.push(`Scoring: ${scoreDetails}`);

    return parts.join(' | ');
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

          // Extract transaction data first (we need currency for proper classification)
          const extraction = this.extractFromEmail(rawEmail);

          // Classify email with full context (including extracted currency)
          // This uses the enhanced classification system that considers:
          // - Parser type (grab, bolt, bangkok-bank, etc.)
          // - Payment context (e-wallet vs credit card)
          // - Currency (THB vs USD)
          const classification = this.classifyEmailWithExtraction(rawEmail, extraction);

          // Calculate confidence with detailed breakdown
          const confidenceBreakdown = this.calculateConfidenceWithBreakdown(extraction);
          const confidence = confidenceBreakdown.totalScore;

          // Determine final status based on:
          // 1. Classification rules (parser + payment context + currency)
          // 2. Confidence score (low confidence = pending review)
          const status = determineStatusFromConfidence(
            confidence,
            classification.status
          );

          // Build extraction notes combining parser notes with score breakdown
          // Include classification rule info for debugging
          const ruleInfo = classification.matchedRule
            ? `Classified by rule: ${classification.matchedRule.id} (${classification.matchedRule.description})`
            : 'No classification rule matched';
          const paymentInfo = `Payment context: ${classification.paymentContext}`;
          const extractionNotes = this.buildExtractionNotes(extraction, confidenceBreakdown)
            + ` | ${ruleInfo} | ${paymentInfo}`;

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
            extraction_notes: extractionNotes,
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

    // Extract first (we need currency for proper classification)
    const extraction = this.extractFromEmail(rawEmail);

    // Re-classify with full context (including extracted currency)
    const classification = this.classifyEmailWithExtraction(rawEmail, extraction);

    // Calculate confidence with detailed breakdown
    const confidenceBreakdown = this.calculateConfidenceWithBreakdown(extraction);
    const confidence = confidenceBreakdown.totalScore;

    // Build extraction notes with classification rule info
    const ruleInfo = classification.matchedRule
      ? `Classified by rule: ${classification.matchedRule.id} (${classification.matchedRule.description})`
      : 'No classification rule matched';
    const paymentInfo = `Payment context: ${classification.paymentContext}`;
    const extractionNotes = this.buildExtractionNotes(extraction, confidenceBreakdown)
      + ` | ${ruleInfo} | ${paymentInfo}`;

    // Determine status based on confidence and classification
    const status = determineStatusFromConfidence(
      confidence,
      classification.status
    );

    // Update the email transaction
    const updateData: Record<string, unknown> = {
      classification: classification.classification,
      extraction_confidence: confidence,
      extraction_notes: extractionNotes,
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status,
    };

    // Update extracted data if successful
    if (extraction.success && extraction.data) {
      updateData.vendor_name_raw = extraction.data.vendor_name_raw;
      updateData.amount = extraction.data.amount;
      updateData.currency = extraction.data.currency;
      updateData.transaction_date = extraction.data.transaction_date.toISOString().split('T')[0];
      updateData.description = extraction.data.description || null;
      updateData.order_id = extraction.data.order_id || null;
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

// Register available parsers
extractionService.registerParser(grabParser);
extractionService.registerParser(boltParser);
extractionService.registerParser(bangkokBankParser);
extractionService.registerParser(kasikornParser);
extractionService.registerParser(lazadaParser);
