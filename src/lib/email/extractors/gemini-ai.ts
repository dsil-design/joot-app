/**
 * Gemini AI Fallback Email Parser
 *
 * Uses Google Gemini 2.5 Flash as a fallback parser for emails that don't
 * match any regex-based parser. Sends email content to Gemini and extracts
 * structured transaction data.
 *
 * Key design decisions:
 * - Only runs when no regex parser matches (registered last)
 * - Confidence capped at 70 (AI is less certain than regex)
 * - All AI extractions get pending_review status via classifier rule
 * - Silently skipped if GEMINI_API_KEY is not set
 * - Body truncated to 8,000 chars to control costs
 * - Temperature 0.1 for deterministic extraction
 */

import type { EmailParser, RawEmailData, ExtractionResult } from '../types';
import { callGemini, isGeminiAvailable, truncateBody } from '../gemini-client';

/**
 * Build the prompt for Gemini
 */
function buildPrompt(email: RawEmailData): string {
  const body = truncateBody(email.text_body, email.html_body);

  return `You are a transaction extraction assistant. Analyze this email and extract transaction data if it represents a financial transaction (purchase, payment, subscription, transfer).

**User context:** Based in Thailand, uses USD and THB currencies.

**Email metadata:**
- From: ${email.from_name || ''} <${email.from_address || ''}>
- Subject: ${email.subject || '(no subject)'}
- Date: ${email.email_date.toISOString()}

**Email body:**
${body}

**Instructions:**
1. First determine if this email represents a financial transaction. Marketing emails, OTP codes, newsletters, shipping updates without amounts, and account notifications are NOT transactions.
2. If it is a transaction, extract the details below.
3. For currency, use the 3-letter ISO code (e.g., "USD", "THB"). If unclear, infer from context (Thai bank = THB, $ symbol alone = USD).
4. For the transaction date, use the actual transaction/payment date from the email content if available, otherwise use the email date.
5. For vendor name, use the merchant/company name as it appears (e.g., "Tello", "Netflix", "7-Eleven").

Respond with this exact JSON structure:
{
  "is_transaction": boolean,
  "vendor_name": string | null,
  "amount": number | null,
  "currency": string | null,
  "transaction_date": string | null,
  "description": string | null,
  "order_id": string | null,
  "confidence_notes": string
}

If is_transaction is false, set all other fields to null except confidence_notes (explain why it's not a transaction).
For transaction_date, use ISO format "YYYY-MM-DD".
For amount, use a plain number without currency symbols.`;
}

interface GeminiResponse {
  is_transaction: boolean;
  vendor_name: string | null;
  amount: number | null;
  currency: string | null;
  transaction_date: string | null;
  description: string | null;
  order_id: string | null;
  confidence_notes: string;
}

/**
 * Calculate confidence score for AI extraction
 *
 * Scoring (max 70):
 * - 30 base (AI identified as transaction)
 * - +15 (amount found)
 * - +10 (currency identified)
 * - +10 (vendor name found)
 * - +5 (date found)
 */
function calculateAiConfidence(data: GeminiResponse): number {
  let score = 30; // Base: AI says it's a transaction

  if (data.amount !== null && data.amount > 0) score += 15;
  if (data.currency) score += 10;
  if (data.vendor_name) score += 10;
  if (data.transaction_date) score += 5;

  return score;
}

/**
 * Gemini AI Email Parser implementation
 */
export const geminiAiParser: EmailParser = {
  key: 'gemini-ai',
  name: 'Gemini AI Fallback Parser',

  /**
   * Can parse any email — but only if GEMINI_API_KEY is set.
   * Since this is registered last, it only runs when no regex parser matches.
   */
  canParse(_email: RawEmailData): boolean {
    return isGeminiAvailable();
  },

  /**
   * Extract transaction data using Gemini AI
   */
  async extract(email: RawEmailData): Promise<ExtractionResult> {
    try {
      const prompt = buildPrompt(email);
      const { data: response } = await callGemini<GeminiResponse>(prompt);

      // Not a transaction — return clean failure
      if (!response.is_transaction) {
        return {
          success: false,
          confidence: 0,
          notes: `AI: Not a transaction. ${response.confidence_notes || ''}`.trim(),
        };
      }

      // Transaction identified but no amount — partial extraction
      if (response.amount === null || response.amount <= 0) {
        return {
          success: false,
          confidence: 0,
          errors: ['AI identified as transaction but could not extract amount'],
          notes: `AI notes: ${response.confidence_notes || 'No amount found'}`,
        };
      }

      // Parse transaction date
      let transactionDate: Date;
      if (response.transaction_date) {
        const parsed = new Date(response.transaction_date + 'T00:00:00');
        transactionDate = isNaN(parsed.getTime()) ? email.email_date : parsed;
      } else {
        transactionDate = email.email_date;
      }

      const confidence = calculateAiConfidence(response);

      return {
        success: true,
        confidence,
        data: {
          vendor_name_raw: response.vendor_name || email.from_name || 'Unknown',
          amount: response.amount,
          currency: response.currency || 'USD',
          transaction_date: transactionDate,
          description: response.description || undefined,
          order_id: response.order_id || undefined,
        },
        notes: `AI extraction (claude-haiku-4.5). ${response.confidence_notes || ''}`.trim(),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Gemini AI parser error:', message);

      return {
        success: false,
        confidence: 0,
        errors: [`AI parser error: ${message}`],
      };
    }
  },
};
