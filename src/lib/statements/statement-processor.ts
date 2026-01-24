/**
 * Statement Processing Service
 *
 * Processes uploaded statement files end-to-end:
 * 1. Downloads file from Supabase Storage
 * 2. Extracts text from PDF
 * 3. Parses transactions using appropriate parser
 * 4. Runs matching algorithm against existing transactions
 * 5. Saves results to database
 *
 * The job updates `statement_uploads.status` at each stage and is designed
 * to be resumable if interrupted.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { processPDF, isValidPDF } from './pdf-extractor';
import type { StatementParseResult, ParsedStatementTransaction } from './parsers/types';

/**
 * Processing status values
 */
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Processing step for progress tracking
 */
export type ProcessingStep =
  | 'downloading'
  | 'validating'
  | 'extracting'
  | 'parsing'
  | 'matching'
  | 'saving'
  | 'completed';

/**
 * Statement upload record from database
 */
export interface StatementUploadRecord {
  id: string;
  user_id: string;
  filename: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  payment_method_id: string | null;
  statement_period_start: string | null;
  statement_period_end: string | null;
  status: ProcessingStatus;
  transactions_extracted: number;
  transactions_matched: number;
  transactions_new: number;
  extraction_started_at: string | null;
  extraction_completed_at: string | null;
  extraction_error: string | null;
  extraction_log: Record<string, unknown> | null;
}

/**
 * Processing progress info
 */
export interface ProcessingProgress {
  step: ProcessingStep;
  percent: number;
  message: string;
  timestamp: string;
}

/**
 * Match suggestion from processing
 */
export interface MatchSuggestion {
  /** Parsed transaction from statement */
  statementTransaction: ParsedStatementTransaction;

  /** Matched transaction from database (if found) */
  matchedTransactionId?: string;

  /** Match confidence score (0-100) */
  confidence: number;

  /** Match reasons/explanations */
  reasons: string[];

  /** Whether this is a new transaction (no match found) */
  isNew: boolean;
}

/**
 * Processing result
 */
export interface ProcessingResult {
  /** Processing was successful */
  success: boolean;

  /** Statement upload ID */
  uploadId: string;

  /** Parse result from PDF extraction */
  parseResult?: StatementParseResult;

  /** Number of transactions extracted */
  transactionsExtracted: number;

  /** Number of transactions that matched existing records */
  transactionsMatched: number;

  /** Number of new transactions (no match) */
  transactionsNew: number;

  /** Match suggestions for review */
  suggestions: MatchSuggestion[];

  /** Error message if failed */
  error?: string;

  /** Processing log */
  log: ProcessingProgress[];
}

/**
 * Processing configuration options
 */
export interface ProcessingOptions {
  /** Parser to use (skip auto-detection) */
  parser?: string;

  /** Skip matching (just extract and parse) */
  skipMatching?: boolean;

  /** Progress callback */
  onProgress?: (progress: ProcessingProgress) => void;
}

/**
 * Statement Processor Service
 */
export class StatementProcessor {
  private supabase: SupabaseClient;
  private log: ProcessingProgress[] = [];

  constructor(supabaseUrl?: string, serviceRoleKey?: string) {
    // Use service role key for server-side processing
    this.supabase = createClient(
      supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey || process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * Process a statement upload
   *
   * @param uploadId - Statement upload ID to process
   * @param options - Processing options
   * @returns Processing result
   */
  async process(
    uploadId: string,
    options: ProcessingOptions = {}
  ): Promise<ProcessingResult> {
    this.log = [];
    const result: ProcessingResult = {
      success: false,
      uploadId,
      transactionsExtracted: 0,
      transactionsMatched: 0,
      transactionsNew: 0,
      suggestions: [],
      log: this.log,
    };

    try {
      // Step 1: Get upload record
      this.reportProgress('downloading', 0, 'Fetching upload record...');
      const upload = await this.getUploadRecord(uploadId);

      if (!upload) {
        throw new Error(`Statement upload not found: ${uploadId}`);
      }

      // Check if already processing
      if (upload.status === 'processing') {
        throw new Error('Statement is already being processed');
      }

      // Update status to processing
      await this.updateUploadStatus(uploadId, 'processing', {
        extraction_started_at: new Date().toISOString(),
        extraction_error: null,
      });

      // Step 2: Download file from storage
      this.reportProgress('downloading', 10, 'Downloading file from storage...');
      const fileBuffer = await this.downloadFile(upload.file_path);

      // Step 3: Validate file
      this.reportProgress('validating', 20, 'Validating file...');
      if (!isValidPDF(fileBuffer)) {
        throw new Error('Invalid PDF file. The file does not appear to be a valid PDF.');
      }

      // Step 4: Extract and parse
      this.reportProgress('extracting', 30, 'Extracting text from PDF...');
      const pdfResult = await processPDF(fileBuffer, {
        parser: options.parser,
        includeRawText: false,
      });

      if (pdfResult.error || !pdfResult.parseResult) {
        throw new Error(pdfResult.error || 'Failed to parse statement');
      }

      this.reportProgress('parsing', 50, `Parsed ${pdfResult.parseResult.transactions.length} transactions`);

      result.parseResult = pdfResult.parseResult;
      result.transactionsExtracted = pdfResult.parseResult.transactions.length;

      // Step 5: Run matching (if not skipped)
      if (!options.skipMatching && pdfResult.parseResult.transactions.length > 0) {
        this.reportProgress('matching', 60, 'Matching transactions...');

        const suggestions = await this.matchTransactions(
          upload.user_id,
          pdfResult.parseResult.transactions,
          pdfResult.parseResult.period
        );

        result.suggestions = suggestions;
        result.transactionsMatched = suggestions.filter(s => !s.isNew).length;
        result.transactionsNew = suggestions.filter(s => s.isNew).length;
      } else {
        // No matching - all transactions are "new"
        result.suggestions = pdfResult.parseResult.transactions.map(t => ({
          statementTransaction: t,
          confidence: 0,
          reasons: [],
          isNew: true,
        }));
        result.transactionsNew = result.transactionsExtracted;
      }

      // Step 6: Save results (includes full extraction data)
      this.reportProgress('saving', 90, 'Saving results...');

      // Complete
      this.reportProgress('completed', 100, 'Processing complete');

      // Save all results including extraction data and log together
      await this.saveResultsWithStatus(uploadId, result, pdfResult.parseResult);

      result.success = true;
      result.log = this.log;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.reportProgress('saving', 0, `Error: ${errorMessage}`);

      await this.updateUploadStatus(uploadId, 'failed', {
        extraction_completed_at: new Date().toISOString(),
        extraction_error: errorMessage,
        extraction_log: { log: this.log, error: errorMessage },
      });

      result.error = errorMessage;
      result.log = this.log;
    }

    return result;
  }

  /**
   * Get processing status for an upload
   */
  async getStatus(uploadId: string): Promise<{
    status: ProcessingStatus;
    progress?: ProcessingProgress;
    error?: string;
  } | null> {
    const upload = await this.getUploadRecord(uploadId);
    if (!upload) return null;

    return {
      status: upload.status,
      progress: upload.extraction_log?.log?.[upload.extraction_log.log.length - 1] as ProcessingProgress | undefined,
      error: upload.extraction_error ?? undefined,
    };
  }

  /**
   * Retry a failed processing job
   */
  async retry(uploadId: string, options: ProcessingOptions = {}): Promise<ProcessingResult> {
    const upload = await this.getUploadRecord(uploadId);
    if (!upload) {
      throw new Error(`Statement upload not found: ${uploadId}`);
    }

    if (upload.status !== 'failed') {
      throw new Error(`Cannot retry: status is '${upload.status}', expected 'failed'`);
    }

    // Reset status to pending
    await this.updateUploadStatus(uploadId, 'pending', {
      extraction_error: null,
    });

    return this.process(uploadId, options);
  }

  // Private methods

  private reportProgress(step: ProcessingStep, percent: number, message: string) {
    const progress: ProcessingProgress = {
      step,
      percent,
      message,
      timestamp: new Date().toISOString(),
    };
    this.log.push(progress);
  }

  private async getUploadRecord(uploadId: string): Promise<StatementUploadRecord | null> {
    const { data, error } = await this.supabase
      .from('statement_uploads')
      .select('*')
      .eq('id', uploadId)
      .single();

    if (error || !data) return null;
    return data as StatementUploadRecord;
  }

  private async updateUploadStatus(
    uploadId: string,
    status: ProcessingStatus,
    updates: Partial<StatementUploadRecord>
  ): Promise<void> {
    const { error } = await this.supabase
      .from('statement_uploads')
      .update({
        status,
        ...updates,
      })
      .eq('id', uploadId);

    if (error) {
      console.error('Failed to update upload status:', error);
    }
  }

  private async downloadFile(filePath: string): Promise<Buffer> {
    const { data, error } = await this.supabase.storage
      .from('statement-uploads')
      .download(filePath);

    if (error || !data) {
      throw new Error(`Failed to download file: ${error?.message || 'Unknown error'}`);
    }

    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Match parsed transactions against existing database transactions
   * This is a placeholder implementation - full matching will be implemented in P2-015 through P2-020
   */
  private async matchTransactions(
    userId: string,
    transactions: ParsedStatementTransaction[],
    period?: { startDate: Date; endDate: Date }
  ): Promise<MatchSuggestion[]> {
    // Get existing transactions for the user in the date range
    let query = this.supabase
      .from('transactions')
      .select('id, amount, original_currency, transaction_date, vendor_id, vendors(name)')
      .eq('user_id', userId);

    if (period) {
      const startDate = period.startDate.toISOString().split('T')[0];
      const endDate = period.endDate.toISOString().split('T')[0];
      query = query.gte('transaction_date', startDate).lte('transaction_date', endDate);
    }

    const { data: existingTransactions, error } = await query;

    if (error) {
      console.error('Failed to fetch existing transactions:', error);
      // Return all as new if we can't fetch existing
      return transactions.map(t => ({
        statementTransaction: t,
        confidence: 0,
        reasons: [],
        isNew: true,
      }));
    }

    // Basic matching by amount and date with ±1 day tolerance for timezone handling
    // Statement dates may be parsed in local time then converted to UTC, causing ±1 day shift
    return transactions.map(statementTx => {
      let bestMatch: { id: string; confidence: number; reasons: string[] } | null = null;

      // Get statement date as YYYY-MM-DD string
      const statementDateStr = statementTx.transactionDate.toISOString().split('T')[0];
      const statementDate = new Date(statementDateStr + 'T00:00:00Z');

      for (const dbTx of (existingTransactions || [])) {
        const amountMatch = Math.abs(dbTx.amount) === Math.abs(statementTx.amount);

        // Calculate day difference to handle timezone offsets
        const dbDate = new Date(dbTx.transaction_date + 'T00:00:00Z');
        const dayDiff = Math.abs(Math.round((statementDate.getTime() - dbDate.getTime()) / (1000 * 60 * 60 * 24)));

        const exactDateMatch = dayDiff === 0;
        const closeDateMatch = dayDiff === 1; // ±1 day tolerance for timezone differences

        if (amountMatch && exactDateMatch) {
          bestMatch = {
            id: dbTx.id,
            confidence: 95,
            reasons: ['Amount matches exactly', 'Date matches exactly'],
          };
          break; // Exact match found
        } else if (amountMatch && closeDateMatch) {
          // High confidence match - amount exact, date within 1 day (likely timezone offset)
          if (!bestMatch || bestMatch.confidence < 90) {
            bestMatch = {
              id: dbTx.id,
              confidence: 90,
              reasons: ['Amount matches exactly', 'Date within 1 day (timezone adjustment)'],
            };
          }
        } else if (amountMatch) {
          // Lower confidence - amount matches but dates differ by more than 1 day
          if (!bestMatch || bestMatch.confidence < 60) {
            bestMatch = {
              id: dbTx.id,
              confidence: 60,
              reasons: ['Amount matches exactly', 'Date differs by more than 1 day'],
            };
          }
        }
      }

      return {
        statementTransaction: statementTx,
        matchedTransactionId: bestMatch?.id,
        confidence: bestMatch?.confidence || 0,
        reasons: bestMatch?.reasons || [],
        isNew: !bestMatch,
      };
    });
  }

  private async saveResultsWithStatus(
    uploadId: string,
    result: ProcessingResult,
    parseResult: StatementParseResult
  ): Promise<void> {
    // Save extraction results and status to database together
    // This includes storing the parsed transactions and match suggestions
    // for later review in the review queue

    const extractionData = {
      parser_used: parseResult.parserKey,
      page_count: parseResult.pageCount,
      confidence: parseResult.confidence,
      period_start: parseResult.period?.startDate?.toISOString(),
      period_end: parseResult.period?.endDate?.toISOString(),
      summary: parseResult.summary,
      warnings: parseResult.warnings,
      transactions: parseResult.transactions.map(t => ({
        date: t.transactionDate.toISOString(),
        description: t.description,
        amount: t.amount,
        currency: t.currency,
        type: t.type,
        category: t.category,
        foreign_transaction: t.foreignTransaction,
      })),
      suggestions: result.suggestions.map(s => ({
        transaction_date: s.statementTransaction.transactionDate.toISOString(),
        description: s.statementTransaction.description,
        amount: s.statementTransaction.amount,
        currency: s.statementTransaction.currency,
        matched_transaction_id: s.matchedTransactionId,
        confidence: s.confidence,
        reasons: s.reasons,
        is_new: s.isNew,
      })),
      // Include progress log in the extraction data
      log: this.log,
    };

    // Build update object with parsed period dates
    const updateData: Record<string, unknown> = {
      status: 'completed',
      extraction_completed_at: new Date().toISOString(),
      transactions_extracted: result.transactionsExtracted,
      transactions_matched: result.transactionsMatched,
      transactions_new: result.transactionsNew,
      extraction_log: extractionData,
    };

    // Update statement_period_start/end from parsed period (if extracted)
    if (parseResult.period?.startDate) {
      updateData.statement_period_start = parseResult.period.startDate.toISOString().split('T')[0];
    }
    if (parseResult.period?.endDate) {
      updateData.statement_period_end = parseResult.period.endDate.toISOString().split('T')[0];
    }

    const { error } = await this.supabase
      .from('statement_uploads')
      .update(updateData)
      .eq('id', uploadId);

    if (error) {
      console.error('Failed to save extraction results:', error);
    }
  }
}

// Singleton instance for use in API routes
let processorInstance: StatementProcessor | null = null;

export function getStatementProcessor(): StatementProcessor {
  if (!processorInstance) {
    processorInstance = new StatementProcessor();
  }
  return processorInstance;
}

/**
 * Process a statement (convenience function)
 */
export async function processStatement(
  uploadId: string,
  options: ProcessingOptions = {}
): Promise<ProcessingResult> {
  const processor = getStatementProcessor();
  return processor.process(uploadId, options);
}

/**
 * Get processing status (convenience function)
 */
export async function getProcessingStatus(uploadId: string) {
  const processor = getStatementProcessor();
  return processor.getStatus(uploadId);
}

/**
 * Retry failed processing (convenience function)
 */
export async function retryProcessing(
  uploadId: string,
  options: ProcessingOptions = {}
): Promise<ProcessingResult> {
  const processor = getStatementProcessor();
  return processor.retry(uploadId, options);
}
