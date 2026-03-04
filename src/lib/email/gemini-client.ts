/**
 * Shared Gemini AI Client
 *
 * Provides a shared utility for calling Google Gemini API.
 * Used by both the AI extractor (gemini-ai.ts) and the AI classifier (ai-classifier.ts).
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

export const GEMINI_MODEL = 'gemini-2.5-flash';
export const MAX_BODY_LENGTH = 8000;
export const REQUEST_TIMEOUT_MS = 15000;

/**
 * Call Gemini API with timeout and JSON response parsing
 */
export async function callGemini<T>(prompt: string): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
    },
  });

  // Race between API call and timeout
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Gemini API timeout')), REQUEST_TIMEOUT_MS);
  });

  const result = await Promise.race([
    model.generateContent(prompt),
    timeoutPromise,
  ]);

  const text = result.response.text();
  return JSON.parse(text) as T;
}

/**
 * Check if Gemini API is available (API key configured)
 */
export function isGeminiAvailable(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

/**
 * Truncate email body to max length for API calls
 */
export function truncateBody(textBody: string | null, htmlBody: string | null): string {
  return (textBody || htmlBody || '').slice(0, MAX_BODY_LENGTH);
}
