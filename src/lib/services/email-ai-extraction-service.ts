/**
 * Email AI Extraction Service
 *
 * Uses Google Gemini AI to extract structured transaction data from receipt emails.
 * Specifically designed for email content (subject, sender, body text).
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

export interface EmailExtractionResult {
  vendor: string | null;
  amount: number | null;
  currency: string | null;
  date: Date | null;
  confidence: {
    vendor: number;
    amount: number;
    currency: number;
    date: number;
  };
  rawResponse?: string;
}

export interface EmailContent {
  subject: string;
  from: string;
  textContent: string;
  htmlContent?: string;
}

// Initialize Gemini AI
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required');
  }

  return new GoogleGenerativeAI(apiKey);
}

/**
 * Build the extraction prompt for email receipts
 */
function buildEmailExtractionPrompt(emailContent: EmailContent): string {
  const content = emailContent.textContent || emailContent.htmlContent || '';

  return `You are a financial transaction data extraction AI specialized in parsing receipt emails.

EMAIL METADATA:
From: ${emailContent.from}
Subject: ${emailContent.subject}

EMAIL CONTENT:
${content}

INSTRUCTIONS:
Extract the following transaction fields from this receipt email:

1. **vendor**: The merchant/vendor name (e.g., "Apple", "Amazon", "Uber", "Stripe")
   - Look in the sender address, subject line, and email body
   - Prefer the business name over generic senders like "noreply"

2. **amount**: The total transaction amount as a number (e.g., 9.99, 1299.00)
   - Extract the final/total amount, not subtotals or individual line items
   - Remove currency symbols, only return the numeric value

3. **currency**: ISO 4217 currency code (e.g., "USD", "EUR", "GBP", "THB")
   - Extract from currency symbols ($=USD, €=EUR, £=GBP, ฿=THB)
   - Or from explicit currency text in the email

4. **date**: Transaction date in ISO 8601 format (YYYY-MM-DD)
   - Look for purchase date, order date, or transaction date
   - Not the email sent date unless explicitly stated as transaction date

5. **confidence**: For each field, provide a confidence score (0-100):
   - 90-100: Very confident, clear and unambiguous
   - 70-89: Confident, likely correct with minor uncertainty
   - 50-69: Moderate confidence, some ambiguity
   - 0-49: Low confidence, unclear or missing

IMPORTANT:
- If a field cannot be determined, set it to null and confidence to 0
- Return ONLY valid JSON, no markdown, no code blocks, no explanations
- Use this EXACT format:

{
  "vendor": "string or null",
  "amount": number or null,
  "currency": "string or null",
  "date": "YYYY-MM-DD or null",
  "confidence": {
    "vendor": number,
    "amount": number,
    "currency": number,
    "date": number
  }
}

EXAMPLES:

Example 1 - Apple Receipt:
From: Apple <no_reply@email.apple.com>
Subject: Your receipt from Apple
Content: "Thank you for your purchase. Order total: $9.99 USD. Date: October 15, 2024"

{
  "vendor": "Apple",
  "amount": 9.99,
  "currency": "USD",
  "date": "2024-10-15",
  "confidence": {
    "vendor": 95,
    "amount": 95,
    "currency": 95,
    "date": 95
  }
}

Example 2 - Stripe Payment:
From: Stripe <receipts@stripe.com>
Subject: Receipt from Acme Corp
Content: "You paid $299.00 to Acme Corp on Nov 5, 2024"

{
  "vendor": "Acme Corp",
  "amount": 299.00,
  "currency": "USD",
  "date": "2024-11-05",
  "confidence": {
    "vendor": 90,
    "amount": 95,
    "currency": 80,
    "date": 90
  }
}

Example 3 - Unclear Email:
From: notifications@example.com
Subject: Payment confirmation
Content: "Your payment was processed."

{
  "vendor": null,
  "amount": null,
  "currency": null,
  "date": null,
  "confidence": {
    "vendor": 0,
    "amount": 0,
    "currency": 0,
    "date": 0
  }
}

Now extract transaction data from the email above. Return ONLY the JSON.`;
}

/**
 * Parse Gemini's JSON response
 */
function parseGeminiResponse(text: string): EmailExtractionResult {
  try {
    // Remove markdown code blocks if present
    let jsonText = text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '');
    }

    // Parse JSON
    const parsed = JSON.parse(jsonText.trim());

    // Convert date string to Date object if present
    const date = parsed.date ? new Date(parsed.date) : null;

    return {
      vendor: parsed.vendor || null,
      amount: parsed.amount !== null && parsed.amount !== undefined
        ? Number(parsed.amount)
        : null,
      currency: parsed.currency || null,
      date,
      confidence: {
        vendor: parsed.confidence?.vendor || 0,
        amount: parsed.confidence?.amount || 0,
        currency: parsed.confidence?.currency || 0,
        date: parsed.confidence?.date || 0,
      },
      rawResponse: text,
    };
  } catch (error) {
    console.error('Failed to parse Gemini response:', error);
    console.error('Raw response:', text);

    // Return null result with zero confidence
    return {
      vendor: null,
      amount: null,
      currency: null,
      date: null,
      confidence: {
        vendor: 0,
        amount: 0,
        currency: 0,
        date: 0,
      },
      rawResponse: text,
    };
  }
}

/**
 * Extract transaction data from email content using Gemini AI
 */
export async function extractTransactionFromEmail(
  emailContent: EmailContent
): Promise<EmailExtractionResult> {
  try {
    // Initialize Gemini
    const genAI = getGeminiClient();

    // Use Gemini 2.0 Flash for fast, accurate extraction
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Build extraction prompt
    const prompt = buildEmailExtractionPrompt(emailContent);

    // Generate content
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Parse and return result
    return parseGeminiResponse(text);
  } catch (error) {
    console.error('Email AI extraction error:', error);
    throw error;
  }
}

/**
 * Batch extract transaction data from multiple emails
 */
export async function batchExtractFromEmails(
  emails: EmailContent[],
  options?: {
    concurrency?: number;
    onProgress?: (completed: number, total: number) => void;
  }
): Promise<EmailExtractionResult[]> {
  const concurrency = options?.concurrency || 3; // Process 3 at a time
  const results: EmailExtractionResult[] = [];
  let completed = 0;

  // Process in batches
  for (let i = 0; i < emails.length; i += concurrency) {
    const batch = emails.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(email => extractTransactionFromEmail(email))
    );

    results.push(...batchResults);
    completed += batch.length;

    if (options?.onProgress) {
      options.onProgress(completed, emails.length);
    }
  }

  return results;
}

/**
 * Validate extraction result meets minimum confidence threshold
 */
export function isHighConfidenceExtraction(
  result: EmailExtractionResult,
  minConfidence: number = 70
): boolean {
  const { confidence } = result;

  // At least vendor and amount must meet threshold
  return (
    confidence.vendor >= minConfidence &&
    confidence.amount >= minConfidence
  );
}

/**
 * Get average confidence score across all fields
 */
export function getAverageConfidence(result: EmailExtractionResult): number {
  const { confidence } = result;
  const scores = [
    confidence.vendor,
    confidence.amount,
    confidence.currency,
    confidence.date,
  ];

  const sum = scores.reduce((acc, score) => acc + score, 0);
  return Math.round(sum / scores.length);
}

/**
 * Check if extraction has all required fields
 */
export function hasRequiredFields(result: EmailExtractionResult): boolean {
  return !!(
    result.vendor &&
    result.amount !== null &&
    result.currency
  );
}

/**
 * Format extraction result for display
 */
export function formatExtractionResult(result: EmailExtractionResult): string {
  const parts: string[] = [];

  if (result.vendor) {
    parts.push(`Vendor: ${result.vendor}`);
  }

  if (result.amount !== null && result.currency) {
    parts.push(`Amount: ${result.amount} ${result.currency}`);
  }

  if (result.date) {
    parts.push(`Date: ${result.date.toLocaleDateString()}`);
  }

  const avgConfidence = getAverageConfidence(result);
  parts.push(`Avg Confidence: ${avgConfidence}%`);

  return parts.join(' | ');
}
