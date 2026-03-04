/**
 * AI Email Classifier
 *
 * Uses Gemini AI to classify ALL emails with granular types and suggest skipping.
 * Supports two modes:
 * 1. Classification-only: For emails already extracted by regex parsers
 * 2. Combined extraction+classification: For emails without a regex match (saves an API call)
 *
 * Includes few-shot learning via user feedback injection.
 */

import type { RawEmailData, ExtractionResult, AiClassificationResult } from './types';
import type { AiClassification } from '../types/email-imports';
import { AI_CLASSIFICATION } from '../types/email-imports';
import { callGemini, isGeminiAvailable, truncateBody } from './gemini-client';
import { getRecentFeedback, type FeedbackExample } from './ai-feedback-service';

// ============================================================================
// CLASSIFICATION PROMPT
// ============================================================================

const CLASSIFICATION_CATEGORIES = `
Classification categories (choose exactly one):
- transaction_receipt: Payment confirmation, purchase receipt, charge notification
- subscription_charge: Recurring subscription payment (Netflix, Spotify, etc.)
- bank_transfer_confirmation: Bank-to-bank transfer confirmation
- bill_payment_confirmation: Utility bill, credit card payment, loan payment confirmation
- upcoming_charge_notice: "Your bill is ready", "Payment due soon" — no charge yet
- invoice_available: Invoice or statement available for download — no charge yet
- refund_notification: Refund processed or credited back
- delivery_status: Package shipped, delivered, out for delivery
- order_status: Order confirmed, processing, cancelled — no payment info
- account_notification: Password change, security alert, account update
- marketing_promotional: Sales, coupons, newsletters, promotional offers
- otp_verification: One-time password, verification code, 2FA
- other_non_transaction: Any other non-financial email
`;

const SKIP_GUIDANCE = `
Skip guidance (should_skip = true when):
- The email is NOT a financial transaction (marketing, OTP, delivery status, account notification)
- The email is an "upcoming charge notice" or "invoice available" that has NO actual charge amount
- The email is a duplicate notification about a transaction already captured

should_skip = false when:
- The email confirms an actual payment, charge, transfer, or refund
- The email contains a specific amount that was charged/paid/transferred
`;

function buildClassificationPrompt(
  email: RawEmailData,
  feedbackExamples: FeedbackExample[]
): string {
  const body = truncateBody(email.text_body, email.html_body);

  let fewShotSection = '';
  if (feedbackExamples.length > 0) {
    const examples = feedbackExamples.map((ex, i) => {
      return `Example ${i + 1}:
  From: ${ex.email_from || 'unknown'}
  Subject: ${ex.email_subject || '(no subject)'}
  Body preview: ${ex.email_body_preview || '(empty)'}
  → Correct classification: ${ex.corrected_classification || ex.original_ai_classification}
  → Should skip: ${ex.corrected_skip ?? ex.original_ai_suggested_skip}`;
    }).join('\n\n');

    fewShotSection = `
**Previous corrections (learn from these):**
${examples}

`;
  }

  return `You are an email classification assistant for a personal finance app. Classify this email and determine if it represents a financial transaction.

**User context:** Based in Thailand, uses USD and THB currencies. Receives emails from ride-hailing apps (Grab, Bolt), Thai banks (Bangkok Bank, Kasikorn), and international services.

${CLASSIFICATION_CATEGORIES}

${SKIP_GUIDANCE}

${fewShotSection}**Email to classify:**
- From: ${email.from_name || ''} <${email.from_address || ''}>
- Subject: ${email.subject || '(no subject)'}
- Date: ${email.email_date.toISOString()}

**Email body:**
${body}

Respond with this exact JSON structure:
{
  "ai_classification": "<one of the classification categories above>",
  "should_skip": boolean,
  "reasoning": "Brief explanation of why this classification and skip decision",
  "related_transaction_hint": {
    "vendor_name": string | null,
    "amount": number | null,
    "currency": string | null,
    "approximate_date": string | null,
    "reference_id": string | null
  }
}

The related_transaction_hint helps group related emails. Extract any vendor, amount, currency, date (YYYY-MM-DD), or reference/order ID you can find, even for non-transaction emails.`;
}

// ============================================================================
// COMBINED EXTRACTION + CLASSIFICATION PROMPT
// ============================================================================

function buildCombinedPrompt(
  email: RawEmailData,
  feedbackExamples: FeedbackExample[]
): string {
  const body = truncateBody(email.text_body, email.html_body);

  let fewShotSection = '';
  if (feedbackExamples.length > 0) {
    const examples = feedbackExamples.map((ex, i) => {
      return `Example ${i + 1}:
  From: ${ex.email_from || 'unknown'}
  Subject: ${ex.email_subject || '(no subject)'}
  Body preview: ${ex.email_body_preview || '(empty)'}
  → Correct classification: ${ex.corrected_classification || ex.original_ai_classification}
  → Should skip: ${ex.corrected_skip ?? ex.original_ai_suggested_skip}`;
    }).join('\n\n');

    fewShotSection = `
**Previous corrections (learn from these):**
${examples}

`;
  }

  return `You are a transaction extraction and classification assistant. Analyze this email to:
1. Classify it into a category
2. Determine if it should be skipped (non-transaction)
3. Extract transaction data if it is a financial transaction

**User context:** Based in Thailand, uses USD and THB currencies.

${CLASSIFICATION_CATEGORIES}

${SKIP_GUIDANCE}

${fewShotSection}**Email to classify and extract:**
- From: ${email.from_name || ''} <${email.from_address || ''}>
- Subject: ${email.subject || '(no subject)'}
- Date: ${email.email_date.toISOString()}

**Email body:**
${body}

**Instructions for extraction (if this is a financial transaction):**
1. Extract: vendor name, amount (number), currency (3-letter ISO), transaction date (YYYY-MM-DD), description, order/reference ID.
2. For currency, infer from context: Thai bank = THB, $ alone = USD.
3. Use the actual payment/transaction date from content, falling back to email date.

Respond with this exact JSON structure:
{
  "ai_classification": "<one of the classification categories>",
  "should_skip": boolean,
  "reasoning": "Brief explanation",
  "related_transaction_hint": {
    "vendor_name": string | null,
    "amount": number | null,
    "currency": string | null,
    "approximate_date": string | null,
    "reference_id": string | null
  },
  "extraction": {
    "is_transaction": boolean,
    "vendor_name": string | null,
    "amount": number | null,
    "currency": string | null,
    "transaction_date": string | null,
    "description": string | null,
    "order_id": string | null,
    "confidence_notes": string
  }
}`;
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

interface ClassificationOnlyResponse {
  ai_classification: string;
  should_skip: boolean;
  reasoning: string;
  related_transaction_hint?: {
    vendor_name?: string | null;
    amount?: number | null;
    currency?: string | null;
    approximate_date?: string | null;
    reference_id?: string | null;
  } | null;
}

interface CombinedResponse extends ClassificationOnlyResponse {
  extraction: {
    is_transaction: boolean;
    vendor_name: string | null;
    amount: number | null;
    currency: string | null;
    transaction_date: string | null;
    description: string | null;
    order_id: string | null;
    confidence_notes: string;
  };
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Validate and normalize AI classification string
 */
function normalizeClassification(raw: string): AiClassification {
  const valid = Object.values(AI_CLASSIFICATION) as string[];
  if (valid.includes(raw)) {
    return raw as AiClassification;
  }
  return AI_CLASSIFICATION.OTHER_NON_TRANSACTION;
}

/**
 * Classify an email using Gemini AI (classification only, no extraction)
 *
 * Used for emails that already have extraction data from a regex parser.
 */
export async function classifyEmail(
  email: RawEmailData,
  userId: string
): Promise<AiClassificationResult> {
  if (!isGeminiAvailable()) {
    return {
      ai_classification: AI_CLASSIFICATION.OTHER_NON_TRANSACTION,
      should_skip: false,
      reasoning: 'Gemini API key not configured',
    };
  }

  try {
    const feedbackExamples = await getRecentFeedback(userId);
    const prompt = buildClassificationPrompt(email, feedbackExamples);
    const response = await callGemini<ClassificationOnlyResponse>(prompt);

    return {
      ai_classification: normalizeClassification(response.ai_classification),
      should_skip: response.should_skip ?? false,
      reasoning: response.reasoning || '',
      related_transaction_hint: response.related_transaction_hint || null,
    };
  } catch (error) {
    console.error('AI classification error:', error);
    return {
      ai_classification: AI_CLASSIFICATION.OTHER_NON_TRANSACTION,
      should_skip: false,
      reasoning: `Classification error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Combined extraction + classification using Gemini AI (single API call)
 *
 * Used for emails that don't match any regex parser. Returns both
 * classification and extraction results in one call.
 */
export async function classifyAndExtractEmail(
  email: RawEmailData,
  userId: string
): Promise<{ classification: AiClassificationResult; extraction: ExtractionResult }> {
  if (!isGeminiAvailable()) {
    return {
      classification: {
        ai_classification: AI_CLASSIFICATION.OTHER_NON_TRANSACTION,
        should_skip: false,
        reasoning: 'Gemini API key not configured',
      },
      extraction: {
        success: false,
        confidence: 0,
        errors: ['Gemini API key not configured'],
      },
    };
  }

  try {
    const feedbackExamples = await getRecentFeedback(userId);
    const prompt = buildCombinedPrompt(email, feedbackExamples);
    const response = await callGemini<CombinedResponse>(prompt);

    // Build classification result
    const classification: AiClassificationResult = {
      ai_classification: normalizeClassification(response.ai_classification),
      should_skip: response.should_skip ?? false,
      reasoning: response.reasoning || '',
      related_transaction_hint: response.related_transaction_hint || null,
    };

    // Build extraction result
    const ext = response.extraction;
    let extraction: ExtractionResult;

    if (!ext || !ext.is_transaction) {
      extraction = {
        success: false,
        confidence: 0,
        notes: `AI: Not a transaction. ${ext?.confidence_notes || response.reasoning}`.trim(),
      };
    } else if (ext.amount === null || ext.amount <= 0) {
      extraction = {
        success: false,
        confidence: 0,
        errors: ['AI identified as transaction but could not extract amount'],
        notes: `AI notes: ${ext.confidence_notes || 'No amount found'}`,
      };
    } else {
      // Parse transaction date
      let transactionDate: Date;
      if (ext.transaction_date) {
        const parsed = new Date(ext.transaction_date + 'T00:00:00');
        transactionDate = isNaN(parsed.getTime()) ? email.email_date : parsed;
      } else {
        transactionDate = email.email_date;
      }

      // Calculate confidence (max 70 for AI)
      let score = 30;
      if (ext.amount > 0) score += 15;
      if (ext.currency) score += 10;
      if (ext.vendor_name) score += 10;
      if (ext.transaction_date) score += 5;

      extraction = {
        success: true,
        confidence: score,
        data: {
          vendor_name_raw: ext.vendor_name || email.from_name || 'Unknown',
          amount: ext.amount,
          currency: ext.currency || 'USD',
          transaction_date: transactionDate,
          description: ext.description || undefined,
          order_id: ext.order_id || undefined,
        },
        notes: `AI combined extraction+classification (gemini-2.5-flash). ${ext.confidence_notes || ''}`.trim(),
      };
    }

    return { classification, extraction };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('AI combined extraction+classification error:', message);

    return {
      classification: {
        ai_classification: AI_CLASSIFICATION.OTHER_NON_TRANSACTION,
        should_skip: false,
        reasoning: `Error: ${message}`,
      },
      extraction: {
        success: false,
        confidence: 0,
        errors: [`AI parser error: ${message}`],
      },
    };
  }
}
