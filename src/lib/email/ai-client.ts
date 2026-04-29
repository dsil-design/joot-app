/**
 * Shared AI Client
 *
 * Provides a shared utility for calling Anthropic Claude API.
 * Used by the AI extractor, AI classifier, and AI analysis service.
 */

import Anthropic from '@anthropic-ai/sdk';

export const AI_MODEL = 'claude-haiku-4-5-20251001';
export const MAX_BODY_LENGTH = 8000;
export const REQUEST_TIMEOUT_MS = 15000;

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
 * Call Claude API with timeout and JSON response parsing.
 * Returns parsed data, token usage, and call duration.
 */
export async function callAi<T>(prompt: string): Promise<AiCallResult<T>> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const client = new Anthropic({ apiKey });

  // Race between API call and timeout
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Claude API timeout')), REQUEST_TIMEOUT_MS);
  });

  const startTime = Date.now();
  const result = await Promise.race([
    client.messages.create({
      model: AI_MODEL,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt + '\n\nIMPORTANT: Respond with ONLY valid JSON, no markdown code fences or extra text.',
        },
      ],
    }),
    timeoutPromise,
  ]);
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
 */
export function truncateBody(textBody: string | null, htmlBody: string | null): string {
  // Check if text body has meaningful content (not just "enable HTML" boilerplate
  // or a bare tracking-pixel link with no real text).
  const textUsable = textBody
    && textBody.length > 50
    && !/please enable html/i.test(textBody)
    && substantiveWordCount(textBody) >= 5;

  if (textUsable) {
    return textBody!.slice(0, MAX_BODY_LENGTH);
  }

  // Strip HTML to plain text to avoid wasting tokens on CSS/markup
  if (htmlBody) {
    return htmlToPlainText(htmlBody).slice(0, MAX_BODY_LENGTH);
  }

  return (textBody || '').slice(0, MAX_BODY_LENGTH);
}
