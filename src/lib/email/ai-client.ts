/**
 * Shared AI Client
 *
 * Provides a shared utility for calling Anthropic Claude API.
 * Used by the AI extractor, AI classifier, and AI analysis service.
 */

import Anthropic from '@anthropic-ai/sdk';

export const AI_MODEL = 'claude-haiku-4-5-20251001';
export const MAX_BODY_LENGTH = 8000;
/** Cap on PDF attachment text per email; PDFs can be much longer than emails. */
export const MAX_ATTACHMENT_TEXT_LENGTH = 12000;
/** When a PDF is present, the email body is supplementary — keep it short. */
export const MAX_BODY_LENGTH_WITH_ATTACHMENT = 2000;
/** Timeout per API attempt — NOT per overall operation. A rate-limited call
 * gets a fresh window on each retry, so backoff can actually complete. */
export const REQUEST_TIMEOUT_MS = 15000;
/** Total attempts (first call + retries) for retryable failures. */
const MAX_ATTEMPTS = 5;
const BASE_RETRY_DELAY_MS = 2000;
const MAX_RETRY_DELAY_MS = 60000;

/**
 * Token usage metadata returned alongside parsed AI responses
 */
export interface AiTokenUsage {
  promptTokens: number;
  responseTokens: number;
}

/**
 * Result from callAi including parsed data and token usage
 */
export interface AiCallResult<T> {
  data: T;
  tokenUsage: AiTokenUsage;
  durationMs: number;
}

/**
 * Whether an AI call failure is worth retrying (rate limit, overload,
 * server error, connection failure/timeout) versus a permanent one
 * (bad request, auth) that will fail identically on every attempt.
 */
export function isRetryableAiError(error: unknown): boolean {
  if (error instanceof Anthropic.APIConnectionError) return true; // includes per-attempt timeouts
  if (error instanceof Anthropic.APIError) {
    const status = error.status;
    return status === 408 || status === 409 || status === 429 || (typeof status === 'number' && status >= 500);
  }
  return false;
}

/** Delay before the next attempt: honor `retry-after` when the API sent one,
 * otherwise exponential backoff with jitter. */
function retryDelayMs(error: unknown, attempt: number): number {
  if (error instanceof Anthropic.APIError) {
    const retryAfter = Number(error.headers?.get?.('retry-after'));
    if (!isNaN(retryAfter) && retryAfter >= 0) {
      return Math.min(retryAfter * 1000, MAX_RETRY_DELAY_MS);
    }
  }
  const backoff = BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
  const jitter = Math.random() * 500;
  return Math.min(backoff + jitter, MAX_RETRY_DELAY_MS);
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Run an API call with retries. The timeout is enforced per attempt by the
 * SDK client (see callAi), never by racing the whole operation — racing
 * rejects the promise before any meaningful backoff can complete, which is
 * how a bulk upload once turned one rate-limit burst into 45 dead slips.
 */
export async function withAiRetries<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isRetryableAiError(error) || attempt === MAX_ATTEMPTS) {
        throw error;
      }
      await sleep(retryDelayMs(error, attempt));
    }
  }
  throw lastError;
}

/**
 * Call Claude API with per-attempt timeout, retry with backoff, and JSON
 * response parsing. Returns parsed data, token usage, and call duration.
 */
export async function callAi<T>(prompt: string): Promise<AiCallResult<T>> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  // Per-attempt timeout on the client; retries are handled by withAiRetries
  // so retry-after delays longer than the SDK's internal policy are honored.
  const client = new Anthropic({ apiKey, timeout: REQUEST_TIMEOUT_MS, maxRetries: 0 });

  const startTime = Date.now();
  const result = await withAiRetries(() =>
    client.messages.create({
      model: AI_MODEL,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt + '\n\nIMPORTANT: Respond with ONLY valid JSON, no markdown code fences or extra text.',
        },
      ],
    })
  );
  const durationMs = Date.now() - startTime;

  // Extract text from response
  const textBlock = result.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text content in Claude response');
  }

  // Strip markdown code fences if present
  let text = textBlock.text.trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  const parsed = JSON.parse(text) as T;

  const tokenUsage: AiTokenUsage = {
    promptTokens: result.usage?.input_tokens ?? 0,
    responseTokens: result.usage?.output_tokens ?? 0,
  };

  return { data: parsed, tokenUsage, durationMs };
}

/**
 * Check if AI API is available (API key configured)
 */
export function isAiAvailable(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

/**
 * Convert HTML to plain text by stripping tags, styles, and scripts.
 */
function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|tr|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&\w+;/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();
}

/**
 * Count substantive words in text after removing URLs and bracketed wrappers.
 * Used to detect text bodies that are just tracking pixels / link-only stubs
 * (e.g. Avis e-receipts whose text part is a single click-tracking URL while
 * the actual receipt content lives in HTML).
 */
function substantiveWordCount(text: string): number {
  const withoutUrls = text
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[\[\]()]/g, ' ');
  return (withoutUrls.match(/\b[a-zA-Z]{3,}\b/g) || []).length;
}

/**
 * Truncate email body to max length for API calls.
 *
 * Prefers text_body when it contains meaningful content. Falls back to
 * stripping HTML to plain text — this avoids sending raw CSS/markup that
 * wastes the token budget and hides the actual email content.
 *
 * @param maxLen Optional override (defaults to MAX_BODY_LENGTH). Pass
 *   MAX_BODY_LENGTH_WITH_ATTACHMENT when a PDF attachment is also being sent
 *   to keep the prompt within budget.
 */
export function truncateBody(
  textBody: string | null,
  htmlBody: string | null,
  maxLen: number = MAX_BODY_LENGTH,
): string {
  // Check if text body has meaningful content (not just "enable HTML" boilerplate
  // or a bare tracking-pixel link with no real text).
  const textUsable = textBody
    && textBody.length > 50
    && !/please enable html/i.test(textBody)
    && substantiveWordCount(textBody) >= 5;

  if (textUsable) {
    return textBody!.slice(0, maxLen);
  }

  // Strip HTML to plain text to avoid wasting tokens on CSS/markup
  if (htmlBody) {
    return htmlToPlainText(htmlBody).slice(0, maxLen);
  }

  return (textBody || '').slice(0, maxLen);
}

/**
 * Combine extracted text from one or more PDF attachments, capped at
 * MAX_ATTACHMENT_TEXT_LENGTH so we don't blow the prompt budget.
 *
 * Returns null when there are no usable attachments.
 */
export function buildAttachmentSection(
  attachments: Array<{ filename: string; text: string }> | undefined,
): string | null {
  if (!attachments || attachments.length === 0) return null;
  const usable = attachments.filter((a) => a.text && a.text.trim().length > 0);
  if (usable.length === 0) return null;

  // Distribute the budget across attachments so a single very-long PDF doesn't
  // starve the others.
  const perAttachment = Math.floor(MAX_ATTACHMENT_TEXT_LENGTH / usable.length);
  const sections = usable.map((a) => {
    const text = a.text.length > perAttachment ? a.text.slice(0, perAttachment) : a.text;
    return `--- PDF: ${a.filename} ---\n${text}`;
  });
  return sections.join('\n\n');
}
