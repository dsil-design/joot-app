/**
 * Types for email transaction extraction
 *
 * These types define the interface between email parsers and the extraction service.
 * Each parser implements extraction logic and returns ExtractionResult.
 */

import type { EmailClassification, EmailTransactionStatus, AiClassification } from '../types/email-imports';

/**
 * Extracted transaction data from an email
 *
 * Contains the transaction details parsed from email content.
 * All fields are optional since extraction may be partial.
 */
export interface ExtractedTransaction {
  /** Raw vendor name as it appears in the email */
  vendor_name_raw: string;

  /** Transaction amount (numeric, no currency symbol) */
  amount: number;

  /** Currency code (e.g., 'THB', 'USD') */
  currency: string;

  /** Date of the transaction */
  transaction_date: Date;

  /** Transaction description or details */
  description?: string;

  /** Order/reference ID from the email */
  order_id?: string | null;

  /** Matched vendor ID if known */
  vendor_id?: string;

  /** Payment card last 4 digits extracted from receipt (e.g., "0005") */
  payment_card_last_four?: string | null;

  /** Payment card type extracted from receipt (e.g., "Visa", "Mastercard") */
  payment_card_type?: string | null;
}

/**
 * Result of an extraction attempt
 *
 * Returned by individual parsers and the extraction service.
 */
export interface ExtractionResult {
  /** Whether extraction was successful */
  success: boolean;

  /** Confidence score 0-100 */
  confidence: number;

  /** Extracted data (if successful) */
  data?: ExtractedTransaction;

  /** Errors encountered during extraction */
  errors?: string[];

  /** Notes about extraction (e.g., partial data, assumptions made) */
  notes?: string;
}

/**
 * Email classification result from classifier
 */
export interface ClassificationResult {
  /** Email classification type */
  classification: EmailClassification;

  /** Initial status based on classification */
  status: EmailTransactionStatus;

  /** Parser key to use for extraction (e.g., 'grab', 'bolt', 'bangkok-bank') */
  parserKey: string | null;

  /** Confidence in classification 0-100 */
  confidence: number;
}

/**
 * Raw email data passed to parsers
 *
 * Contains the email content and metadata needed for extraction.
 */
export interface RawEmailData {
  /** IMAP message ID */
  message_id: string;

  /** IMAP UID */
  uid: number;

  /** IMAP folder */
  folder: string;

  /** Email subject line */
  subject: string | null;

  /** Sender email address */
  from_address: string | null;

  /** Sender display name */
  from_name: string | null;

  /** Email date */
  email_date: Date;

  /** Plain text body */
  text_body: string | null;

  /** HTML body */
  html_body: string | null;

  /** Whether email has been seen */
  seen: boolean;

  /** Whether email has attachments */
  has_attachments: boolean;
}

/**
 * Parser interface - all email parsers must implement this
 */
export interface EmailParser {
  /** Unique parser identifier */
  readonly key: string;

  /** Human-readable parser name */
  readonly name: string;

  /** Check if this parser can handle the given email */
  canParse(email: RawEmailData): boolean;

  /** Extract transaction data from email */
  extract(email: RawEmailData): ExtractionResult | Promise<ExtractionResult>;
}

/**
 * Result of processing a batch of emails
 */
export interface BatchProcessingResult {
  /** Total emails processed */
  processed: number;

  /** Successfully extracted */
  extracted: number;

  /** Failed extractions */
  failed: number;

  /** Skipped (not matching any parser) */
  skipped: number;

  /** Individual results by message_id */
  results: Map<string, ExtractionResult>;

  /** Processing errors */
  errors: string[];
}

/**
 * Email transaction insert data for database
 *
 * This combines email metadata with extracted transaction data.
 */
export interface EmailTransactionData {
  user_id: string;
  message_id: string;
  uid: number;
  folder: string;
  subject: string | null;
  from_address: string | null;
  from_name: string | null;
  email_date: string;
  seen: boolean;
  has_attachments: boolean;

  // Extracted transaction data
  vendor_id?: string | null;
  vendor_name_raw?: string | null;
  amount?: number | null;
  currency?: string | null;
  transaction_date?: string | null;
  description?: string | null;
  order_id?: string | null;
  payment_card_last_four?: string | null;
  payment_card_type?: string | null;

  // Status and classification
  status: EmailTransactionStatus;
  classification: EmailClassification | null;

  // AI classification
  ai_classification?: AiClassification | null;
  ai_suggested_skip?: boolean;
  ai_reasoning?: string | null;
  parser_key?: string | null;

  // Email group
  email_group_id?: string | null;
  is_group_primary?: boolean;

  // Extraction metadata
  extraction_confidence?: number | null;
  extraction_notes?: string | null;

  // Timestamps
  synced_at?: string;
  processed_at?: string | null;
}

/**
 * AI classification result from Claude classifier
 */
export interface AiClassificationResult {
  /** Granular AI classification */
  ai_classification: AiClassification;

  /** Whether AI recommends skipping this email */
  should_skip: boolean;

  /** AI's reasoning for the classification and skip decision */
  reasoning: string;

  /** Hint for email consolidation (grouping related emails) */
  related_transaction_hint?: {
    vendor_name?: string;
    amount?: number;
    currency?: string;
    approximate_date?: string;
    reference_id?: string;
  } | null;

  /** Token usage from the Claude API call (for journal logging) */
  promptTokens?: number;
  responseTokens?: number;
  durationMs?: number;
  feedbackExamplesUsed?: number;
}

/**
 * Configuration for the extraction service
 */
export interface ExtractionServiceConfig {
  /** Minimum confidence score to auto-classify (0-100) */
  minAutoClassifyConfidence: number;

  /** Whether to process emails without matching parser */
  processUnknownEmails: boolean;

  /** Maximum emails to process in one batch */
  batchSize: number;
}

/**
 * Default extraction service configuration
 */
export const DEFAULT_EXTRACTION_CONFIG: ExtractionServiceConfig = {
  minAutoClassifyConfidence: 55,
  processUnknownEmails: true,
  batchSize: 100,
};
