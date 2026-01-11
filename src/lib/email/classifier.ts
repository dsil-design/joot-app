/**
 * Email Classifier
 *
 * Determines the appropriate parser for an email based on sender, subject,
 * and content patterns. Used by the email sync service to route emails
 * to the correct parser for transaction extraction.
 *
 * Classification flow:
 * 1. Check sender address against known patterns
 * 2. Check subject line against known patterns
 * 3. Return matching parser key or null if no match
 */

import type { RawEmailData, ClassificationResult } from './types';
import { EMAIL_CLASSIFICATION, EMAIL_TRANSACTION_STATUS } from '../types/email-imports';

// Parser definitions with their matching patterns
interface ParserPattern {
  key: string;
  name: string;
  classification: typeof EMAIL_CLASSIFICATION[keyof typeof EMAIL_CLASSIFICATION];
  senderPatterns: string[];
  subjectPatterns: string[];
  /** Optional body patterns for more specific matching */
  bodyPatterns?: string[];
}

/**
 * Registry of known email parsers and their matching patterns
 *
 * Order matters - first match wins
 */
const PARSER_PATTERNS: ParserPattern[] = [
  // Grab receipts
  {
    key: 'grab',
    name: 'Grab Receipt Parser',
    classification: EMAIL_CLASSIFICATION.RECEIPT,
    senderPatterns: ['no-reply@grab.com', 'noreply@grab.com'],
    subjectPatterns: ['your grab e-receipt', 'your grabexpress receipt', 'your grabmart receipt'],
  },

  // Bolt receipts
  {
    key: 'bolt',
    name: 'Bolt Receipt Parser',
    classification: EMAIL_CLASSIFICATION.RECEIPT,
    senderPatterns: ['no-reply@bolt.eu', 'noreply@bolt.eu', 'receipts@bolt.eu'],
    subjectPatterns: ['your bolt receipt', 'your bolt ride receipt'],
  },

  // Bangkok Bank transfers
  {
    key: 'bangkok-bank',
    name: 'Bangkok Bank Parser',
    classification: EMAIL_CLASSIFICATION.BANK_TRANSFER,
    senderPatterns: ['bualuang@bangkokbank.com', 'notification@bangkokbank.com'],
    subjectPatterns: ['transfer notification', 'funds transfer', 'payment notification'],
  },

  // Kasikorn Bank (K PLUS) transfers
  {
    key: 'kasikorn',
    name: 'Kasikorn Bank Parser',
    classification: EMAIL_CLASSIFICATION.BANK_TRANSFER,
    senderPatterns: ['kplus@kasikornbank.com', 'notification@kasikornbank.com', 'kbank@kasikornbank.com'],
    subjectPatterns: ['k plus', 'kplus', 'transfer notification'],
  },

  // Lazada orders
  {
    key: 'lazada',
    name: 'Lazada Order Parser',
    classification: EMAIL_CLASSIFICATION.ORDER_CONFIRMATION,
    senderPatterns: ['no-reply@lazada.co.th', 'noreply@lazada.co.th', 'notification@lazada.co.th'],
    subjectPatterns: ['order confirmation', 'your order', 'order placed'],
  },
];

/**
 * Get initial status based on classification and parser
 *
 * THB receipts from Grab/Bolt typically need USD statement matching.
 * Bank transfers are ready for import directly.
 */
function getInitialStatus(
  classification: typeof EMAIL_CLASSIFICATION[keyof typeof EMAIL_CLASSIFICATION],
  parserKey: string | null
): typeof EMAIL_TRANSACTION_STATUS[keyof typeof EMAIL_TRANSACTION_STATUS] {
  // THB receipts from ride-hailing apps typically paid via USD credit card
  // These need to wait for statement to match the USD charge
  if (parserKey === 'grab' || parserKey === 'bolt') {
    return EMAIL_TRANSACTION_STATUS.WAITING_FOR_STATEMENT;
  }

  // Bank transfers are direct THB transactions, ready to import
  if (classification === EMAIL_CLASSIFICATION.BANK_TRANSFER) {
    return EMAIL_TRANSACTION_STATUS.READY_TO_IMPORT;
  }

  // Default: needs user review
  return EMAIL_TRANSACTION_STATUS.PENDING_REVIEW;
}

/**
 * Classify email using basic heuristics when no parser matches
 */
function classifyUnknownEmail(email: RawEmailData): ClassificationResult {
  const fromAddress = email.from_address?.toLowerCase() || '';
  const subject = email.subject?.toLowerCase() || '';

  // Look for common patterns
  if (subject.includes('receipt') || subject.includes('payment confirmation')) {
    return {
      classification: EMAIL_CLASSIFICATION.RECEIPT,
      status: EMAIL_TRANSACTION_STATUS.PENDING_REVIEW,
      parserKey: null,
      confidence: 40,
    };
  }

  if (subject.includes('order') || subject.includes('confirmation')) {
    return {
      classification: EMAIL_CLASSIFICATION.ORDER_CONFIRMATION,
      status: EMAIL_TRANSACTION_STATUS.PENDING_REVIEW,
      parserKey: null,
      confidence: 30,
    };
  }

  if (fromAddress.includes('bank') || subject.includes('transfer')) {
    return {
      classification: EMAIL_CLASSIFICATION.BANK_TRANSFER,
      status: EMAIL_TRANSACTION_STATUS.PENDING_REVIEW,
      parserKey: null,
      confidence: 30,
    };
  }

  // Default: unknown
  return {
    classification: EMAIL_CLASSIFICATION.UNKNOWN,
    status: EMAIL_TRANSACTION_STATUS.PENDING_REVIEW,
    parserKey: null,
    confidence: 0,
  };
}

/**
 * Classify an email to determine which parser should handle it
 *
 * @param email - Raw email data with headers and optional body
 * @returns Classification result with parser key and confidence
 */
export function classifyEmail(email: RawEmailData): ClassificationResult {
  const fromAddress = email.from_address?.toLowerCase() || '';
  const subject = email.subject?.toLowerCase() || '';

  // Try each parser pattern in order
  for (const pattern of PARSER_PATTERNS) {
    // Check sender patterns
    const matchesSender = pattern.senderPatterns.some((p) =>
      fromAddress.includes(p.toLowerCase())
    );

    if (matchesSender) {
      return {
        classification: pattern.classification,
        status: getInitialStatus(pattern.classification, pattern.key),
        parserKey: pattern.key,
        confidence: 90, // High confidence when sender matches
      };
    }

    // Check subject patterns
    const matchesSubject = pattern.subjectPatterns.some((p) =>
      subject.includes(p.toLowerCase())
    );

    if (matchesSubject) {
      return {
        classification: pattern.classification,
        status: getInitialStatus(pattern.classification, pattern.key),
        parserKey: pattern.key,
        confidence: 75, // Medium-high confidence for subject match
      };
    }
  }

  // No parser matched - classify using basic heuristics
  return classifyUnknownEmail(email);
}

/**
 * Get the parser key for an email, or null if no parser matches
 */
export function getParserKey(email: RawEmailData): string | null {
  const result = classifyEmail(email);
  return result.parserKey;
}

/**
 * Check if an email matches any known parser
 */
export function hasMatchingParser(email: RawEmailData): boolean {
  return getParserKey(email) !== null;
}

/**
 * Get all registered parser keys
 */
export function getRegisteredParserKeys(): string[] {
  return PARSER_PATTERNS.map((p) => p.key);
}

/**
 * Get parser info by key
 */
export function getParserInfo(key: string): ParserPattern | undefined {
  return PARSER_PATTERNS.find((p) => p.key === key);
}

// Export types and constants for external use
export { PARSER_PATTERNS };
export type { ParserPattern };
