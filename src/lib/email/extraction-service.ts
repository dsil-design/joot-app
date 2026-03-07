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

import type { SupabaseClient } from '@supabase/supabase-js';

import { createServiceRoleClient } from '../supabase/server';
import { emailSyncService } from '../services/email-sync-service';
import {
  EMAIL_TRANSACTION_STATUS,
  IMPORT_ACTIVITY_TYPE,
  AUTO_SKIP_FEEDBACK_THRESHOLD,
  aiClassificationToCoarse,
} from '../types/email-imports';
import type { AiClassification, EmailTransactionStatus } from '../types/email-imports';
import type {
  RawEmailData,
  ExtractionResult,
  ClassificationResult,
  BatchProcessingResult,
  EmailTransactionData,
  EmailParser,
  ExtractionServiceConfig,
  AiClassificationResult,
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
import { normalizeICloudRelay } from './icloud-relay';
import { rankMatches, canAutoApprove } from '../matching/match-ranker';
import type { SourceTransaction, TargetTransaction } from '../matching/match-scorer';
import { classifyEmail as aiClassifyEmail, classifyAndExtractEmail } from './ai-classifier';
import { consolidateEmail } from './email-consolidation';
import { getFeedbackCount } from './ai-feedback-service';
import { logJournalEntry, getInvocationType } from './ai-journal-service';
import { triggerBatchAnalysis } from './ai-analysis-service';

// Import parsers
import { grabParser } from './extractors/grab';
import { boltParser } from './extractors/bolt';
import { bangkokBankParser } from './extractors/bangkok-bank';
import { kasikornParser } from './extractors/kasikorn';
import { lazadaParser } from './extractors/lazada';
import { appleParser } from './extractors/apple';
import { stripeParser } from './extractors/stripe';
import { aiFallbackParser } from './extractors/ai-fallback';

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
   * Find the first parser that can handle this email.
   * Normalizes iCloud Private Relay addresses before checking parsers.
   */
  findParser(email: RawEmailData): EmailParser | null {
    // Normalize iCloud relay address so parsers see the original sender
    const normalizedEmail = {
      ...email,
      from_address: normalizeICloudRelay(email.from_address || ''),
    };
    const parsers = Array.from(this.parsers.values());
    for (const parser of parsers) {
      if (parser.canParse(normalizedEmail)) {
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
   * Extract transaction data from a single email.
   * Normalizes iCloud Private Relay addresses before extraction.
   */
  async extractFromEmail(email: RawEmailData): Promise<ExtractionResult> {
    // Normalize iCloud relay address so parsers see the original sender
    const normalizedEmail = {
      ...email,
      from_address: normalizeICloudRelay(email.from_address || ''),
    };

    // Find appropriate parser
    const parser = this.parserRegistry.findParser(normalizedEmail);

    if (!parser) {
      return {
        success: false,
        confidence: 0,
        errors: ['No parser found for this email'],
        notes: `From: ${email.from_address}, Subject: ${email.subject}`,
      };
    }

    try {
      const result = await parser.extract(normalizedEmail);
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
   * Try regex extraction first, fall back to AI if regex parser matched but extraction failed.
   *
   * Four paths:
   * 0. userHint provided → force AI extraction+classification (user is correcting the result)
   * 1. Regex parser matched AND extraction succeeded → use regex result, run AI classification only
   * 2. Regex parser matched BUT extraction failed → fall back to combined AI extraction+classification
   * 3. No regex parser matched → use combined AI extraction+classification (existing behavior)
   */
  async extractWithAiFallback(
    rawEmail: RawEmailData,
    userId: string,
    userHint?: string
  ): Promise<{ extraction: ExtractionResult; aiResult: AiClassificationResult | null; parserKey: string | null }> {
    const regexParser = this.parserRegistry.findParser({
      ...rawEmail,
      from_address: normalizeICloudRelay(rawEmail.from_address || ''),
    });
    const parserKey = regexParser?.key || null;

    let extraction: ExtractionResult;
    let aiResult: AiClassificationResult | null = null;

    if (userHint) {
      // Path 0: User provided a correction hint — force AI extraction so the hint
      // is included in the prompt and can override regex parser results.
      const combined = await classifyAndExtractEmail(rawEmail, userId, userHint);
      extraction = combined.extraction;
      aiResult = combined.classification;
      const hintNote = `User correction applied — forced AI extraction (bypassed regex parser "${parserKey || 'none'}").`;
      extraction.notes = extraction.notes
        ? `${hintNote} ${extraction.notes}`
        : hintNote;
    } else {
      const regexExtraction = await this.extractFromEmail(rawEmail);

      if (parserKey && parserKey !== 'ai-fallback' && regexExtraction.success) {
        // Path 1: Regex matched and extracted successfully — only classify with AI
        extraction = regexExtraction;
        aiResult = await aiClassifyEmail(rawEmail, userId);
      } else if (parserKey && parserKey !== 'ai-fallback' && !regexExtraction.success) {
        // Path 2: Regex parser matched but extraction failed — fall back to AI extraction
        const combined = await classifyAndExtractEmail(rawEmail, userId);
        extraction = combined.extraction;
        aiResult = combined.classification;
        const fallbackNote = `Regex parser "${parserKey}" matched but extraction failed (${regexExtraction.errors?.join('; ') || 'unknown reason'}). Fell back to AI extraction.`;
        extraction.notes = extraction.notes
          ? `${fallbackNote} ${extraction.notes}`
          : fallbackNote;
      } else {
        // Path 3: No regex parser matched — use combined AI
        const combined = await classifyAndExtractEmail(rawEmail, userId);
        extraction = combined.extraction;
        aiResult = combined.classification;
      }
    }

    return { extraction, aiResult, parserKey };
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
   * Try to auto-match an email transaction against existing transactions.
   *
   * Runs the matching algorithm and, if a high-confidence single match is found,
   * automatically links the email transaction. Never throws — matching failures
   * are logged but don't break the extraction pipeline.
   */
  async tryAutoMatch(
    supabase: SupabaseClient,
    emailTransactionId: string,
    userId: string,
    extraction: ExtractionResult
  ): Promise<void> {
    try {
      // Skip if extraction failed or missing required fields
      if (!extraction.success || !extraction.data) return;
      const { amount, currency, transaction_date, vendor_name_raw } = extraction.data;
      if (!amount || !transaction_date) return;

      const txDateStr = transaction_date.toISOString().split('T')[0];

      // Build source transaction
      const source: SourceTransaction = {
        amount: Number(amount),
        currency: currency || 'USD',
        date: txDateStr,
        vendor: vendor_name_raw || '',
        description: extraction.data.description || undefined,
      };

      // Query candidate transactions within ±7 days
      const dateFrom = new Date(transaction_date);
      dateFrom.setDate(dateFrom.getDate() - 7);
      const dateTo = new Date(transaction_date);
      dateTo.setDate(dateTo.getDate() + 7);

      const { data: candidates, error: candError } = await supabase
        .from('transactions')
        .select(`
          id, description, amount, original_currency, transaction_date,
          vendor_id, vendors:vendor_id (id, name)
        `)
        .eq('user_id', userId)
        .gte('transaction_date', dateFrom.toISOString().split('T')[0])
        .lte('transaction_date', dateTo.toISOString().split('T')[0])
        .order('transaction_date', { ascending: false })
        .limit(50);

      if (candError || !candidates || candidates.length === 0) return;

      // Build target transactions
      const targets: TargetTransaction[] = candidates.map((tx) => ({
        id: tx.id,
        amount: Number(tx.amount),
        currency: tx.original_currency,
        date: tx.transaction_date,
        vendor: (tx.vendors as { name: string } | null)?.name || tx.description || '',
        description: tx.description || undefined,
      }));

      // Rank matches — pass supabase for cross-currency conversion
      const ranked = await rankMatches(source, targets, { supabase });

      if (canAutoApprove(ranked) && ranked.bestMatch) {
        // High confidence single winner — auto-link
        await supabase
          .from('email_transactions')
          .update({
            matched_transaction_id: ranked.bestMatch.targetId,
            status: EMAIL_TRANSACTION_STATUS.MATCHED,
            match_method: 'auto',
            match_confidence: ranked.bestMatch.score,
            matched_at: new Date().toISOString(),
          })
          .eq('id', emailTransactionId);

        // Set source reference on the matched transaction
        await supabase
          .from('transactions')
          .update({ source_email_transaction_id: emailTransactionId })
          .eq('id', ranked.bestMatch.targetId);

        console.log(
          `Auto-matched email transaction ${emailTransactionId} → ${ranked.bestMatch.targetId} (score: ${ranked.bestMatch.score})`
        );
      } else if (ranked.bestMatch && ranked.bestMatch.score >= 55) {
        // Medium confidence — store hint but don't change status
        await supabase
          .from('email_transactions')
          .update({
            match_confidence: ranked.bestMatch.score,
          })
          .eq('id', emailTransactionId);
      }
    } catch (error) {
      // Never let matching failures break the extraction pipeline
      console.error(`Auto-match failed for email transaction ${emailTransactionId}:`, error);
    }
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
        .select('id, user_id, message_id, uid, folder, subject, from_address, from_name, date, seen, has_attachments, text_body, html_body, synced_at, created_at')
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

      // Pre-fetch feedback count for auto-skip threshold (cached for batch)
      const feedbackCount = await getFeedbackCount(userId, supabase);
      const autoSkipEnabled = feedbackCount >= AUTO_SKIP_FEEDBACK_THRESHOLD;

      // Process each email
      for (const email of emails) {
        // Skip if already processed
        if (existingMessageIds.has(email.message_id)) {
          result.skipped++;
          continue;
        }

        result.processed++;

        try {
          // Use stored bodies if available, fall back to IMAP
          let textBody: string | null = email.text_body ?? null;
          let htmlBody: string | null = email.html_body ?? null;

          if (textBody === null && htmlBody === null) {
            // Bodies not stored yet — fetch from IMAP
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
            textBody = emailContent.text;
            htmlBody = emailContent.html;
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
            text_body: textBody,
            html_body: htmlBody,
            seen: email.seen ?? false,
            has_attachments: email.has_attachments ?? false,
          };

          // ---- Try regex parsers first, fall back to AI if extraction fails ----
          const { extraction, aiResult, parserKey } = await this.extractWithAiFallback(rawEmail, userId);

          // Step 3: Classify email with full context (backward-compatible coarse classification)
          const classification = this.classifyEmailWithExtraction(rawEmail, extraction);

          // Calculate confidence with detailed breakdown
          const confidenceBreakdown = this.calculateConfidenceWithBreakdown(extraction);
          const confidence = confidenceBreakdown.totalScore;

          // Determine initial status from classification rules
          let status: EmailTransactionStatus = determineStatusFromConfidence(
            confidence,
            classification.status
          );

          // Step 4: Apply auto-skip logic
          const aiSuggestedSkip = aiResult?.should_skip ?? false;
          if (autoSkipEnabled && aiSuggestedSkip && !extraction.success) {
            // Auto-skip: AI suggests skip AND no regex extraction AND enough feedback
            status = EMAIL_TRANSACTION_STATUS.SKIPPED;
          }

          // Build extraction notes combining parser notes with score breakdown
          const ruleInfo = classification.matchedRule
            ? `Classified by rule: ${classification.matchedRule.id} (${classification.matchedRule.description})`
            : 'No classification rule matched';
          const paymentInfo = `Payment context: ${classification.paymentContext}`;
          const aiInfo = aiResult
            ? `AI: ${aiResult.ai_classification} (skip: ${aiResult.should_skip})`
            : 'AI: not run';
          const extractionNotes = this.buildExtractionNotes(extraction, confidenceBreakdown)
            + ` | ${ruleInfo} | ${paymentInfo} | ${aiInfo}`;

          // Map AI classification to coarse for backward compat
          const coarseClassification = aiResult
            ? aiClassificationToCoarse(aiResult.ai_classification as AiClassification)
            : classification.classification;

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
            classification: coarseClassification,
            ai_classification: aiResult?.ai_classification as AiClassification ?? null,
            ai_suggested_skip: aiSuggestedSkip,
            ai_reasoning: aiResult?.reasoning ?? null,
            parser_key: parserKey,
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

          // Insert into email_transactions and get back the new row's ID
          const { data: insertedRow, error: insertError } = await supabase
            .from('email_transactions')
            .insert(transactionData)
            .select('id')
            .single();

          if (insertError) {
            result.failed++;
            result.results.set(email.message_id, {
              success: false,
              confidence: 0,
              errors: [`Database insert failed: ${insertError.message}`],
            });
            continue;
          }

          // Step 5: Log to AI journal (fire-and-forget)
          if (insertedRow && aiResult) {
            // Path 1 = regex matched + succeeded (invocationType=classification_only)
            // Path 2 = regex matched + failed (invocationType=fallback_extraction)
            // Path 3 = no regex match (invocationType=combined_extraction)
            const hadRegexParser = parserKey !== null && parserKey !== 'ai-fallback';
            // In path 1, extraction notes won't contain "Fell back" — that's the path 2 marker
            const regexSuccess = hadRegexParser && !extraction.notes?.includes('Fell back to AI');
            logJournalEntry({
              userId,
              invocationType: getInvocationType(parserKey, regexSuccess, false),
              emailId: email.id,
              emailTransactionId: insertedRow.id,
              rawEmail,
              regexParserAttempted: hadRegexParser ? parserKey : null,
              regexExtractionSuccess: regexSuccess,
              aiResult,
              extraction,
              finalParserKey: parserKey,
              finalConfidence: confidence,
              finalStatus: status,
            }, supabase);
          }

          // Step 6: Consolidation — group related emails
          if (insertedRow) {
            const consolidation = await consolidateEmail({
              userId,
              emailTransactionId: insertedRow.id,
              vendorName: extraction.data?.vendor_name_raw,
              amount: extraction.data?.amount,
              currency: extraction.data?.currency,
              transactionDate: extraction.data?.transaction_date,
              orderId: extraction.data?.order_id,
              aiHint: aiResult?.related_transaction_hint,
              supabase,
            });

            if (consolidation) {
              await supabase
                .from('email_transactions')
                .update({
                  email_group_id: consolidation.emailGroupId,
                  is_group_primary: consolidation.isPrimary,
                })
                .eq('id', insertedRow.id);

              transactionData.email_group_id = consolidation.emailGroupId;
              transactionData.is_group_primary = consolidation.isPrimary;
            }

            // Step 7: Auto-match only for primary group emails (or ungrouped)
            const shouldAutoMatch = !consolidation || consolidation.isPrimary;
            if (shouldAutoMatch && status !== EMAIL_TRANSACTION_STATUS.SKIPPED) {
              await this.tryAutoMatch(supabase, insertedRow.id, userId, extraction);
            }
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

      // Trigger batch analysis if new journal entries were written (fire-and-forget)
      if (result.extracted > 0) {
        triggerBatchAnalysis(userId);
      }

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
  async reprocessEmailTransaction(userId: string, emailTransactionId: string, options?: { feedbackId?: string; userHint?: string }): Promise<ExtractionResult> {
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

    // Check for stored bodies in the emails table first
    let textBody: string | null = null;
    let htmlBody: string | null = null;

    const { data: dbEmail } = await supabase
      .from('emails')
      .select('text_body, html_body')
      .eq('folder', emailTx.folder)
      .eq('uid', emailTx.uid)
      .single();

    if (dbEmail && (dbEmail.text_body !== null || dbEmail.html_body !== null)) {
      textBody = dbEmail.text_body;
      htmlBody = dbEmail.html_body;
    } else {
      // Fall back to IMAP
      const content = await this.fetchEmailContent(emailTx.folder, emailTx.uid);
      if (!content) {
        return {
          success: false,
          confidence: 0,
          errors: ['Failed to fetch email content'],
        };
      }
      textBody = content.text;
      htmlBody = content.html;
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
      text_body: textBody,
      html_body: htmlBody,
      seen: emailTx.seen ?? false,
      has_attachments: emailTx.has_attachments ?? false,
    };

    // Try regex extraction first, fall back to AI if extraction fails
    const { extraction, aiResult, parserKey } = await this.extractWithAiFallback(rawEmail, userId, options?.userHint);

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
    const aiInfo = aiResult
      ? `AI: ${aiResult.ai_classification} (skip: ${aiResult.should_skip})`
      : 'AI: not run';
    const extractionNotes = this.buildExtractionNotes(extraction, confidenceBreakdown)
      + ` | ${ruleInfo} | ${paymentInfo} | ${aiInfo}`;

    // Determine status based on confidence and classification
    const status = determineStatusFromConfidence(
      confidence,
      classification.status
    );

    const coarseClassification = aiResult
      ? aiClassificationToCoarse(aiResult.ai_classification as AiClassification)
      : classification.classification;

    // Update the email transaction
    const updateData: Record<string, unknown> = {
      classification: coarseClassification,
      ai_classification: aiResult?.ai_classification ?? null,
      ai_suggested_skip: aiResult?.should_skip ?? false,
      ai_reasoning: aiResult?.reasoning ?? null,
      parser_key: parserKey,
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

    // Log to AI journal (fire-and-forget)
    if (aiResult) {
      const hadRegexParser = parserKey !== null && parserKey !== 'ai-fallback';
      const regexSuccess = hadRegexParser && !extraction.notes?.includes('Fell back to AI');
      logJournalEntry({
        userId,
        invocationType: 'reprocess',
        emailTransactionId,
        feedbackId: options?.feedbackId,
        rawEmail,
        regexParserAttempted: hadRegexParser ? parserKey : null,
        regexExtractionSuccess: regexSuccess,
        aiResult,
        extraction,
        finalParserKey: parserKey,
        finalConfidence: confidence,
        finalStatus: status,
      }, supabase);
    }

    // Run consolidation
    const consolidation = await consolidateEmail({
      userId,
      emailTransactionId,
      vendorName: extraction.data?.vendor_name_raw,
      amount: extraction.data?.amount,
      currency: extraction.data?.currency,
      transactionDate: extraction.data?.transaction_date,
      orderId: extraction.data?.order_id,
      aiHint: aiResult?.related_transaction_hint,
      supabase,
    });

    if (consolidation) {
      await supabase
        .from('email_transactions')
        .update({
          email_group_id: consolidation.emailGroupId,
          is_group_primary: consolidation.isPrimary,
        })
        .eq('id', emailTransactionId);
    }

    // Try to auto-match if not already matched
    if (!emailTx.matched_transaction_id) {
      await this.tryAutoMatch(supabase, emailTransactionId, userId, extraction);
    }

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
extractionService.registerParser(appleParser);
extractionService.registerParser(stripeParser);

// AI fallback parser — must be registered LAST so it only runs
// when no regex parser matches
extractionService.registerParser(aiFallbackParser);
