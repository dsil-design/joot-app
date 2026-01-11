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
 * 3. Determine initial status based on classification rules
 * 4. Return classification result with parser key and confidence
 *
 * Status determination is configurable per parser/classification type:
 * - THB receipts from Grab/Bolt (paid via USD CC) → waiting_for_statement
 * - THB receipts from Grab/Bolt (paid via GrabPay/Bolt Balance) → ready_to_import
 * - Bank transfers → ready_to_import
 * - Order confirmations → pending_review (amount may change)
 * - Unknown → pending_review
 */

import type { RawEmailData, ClassificationResult, ExtractedTransaction } from './types';
import { EMAIL_CLASSIFICATION, EMAIL_TRANSACTION_STATUS } from '../types/email-imports';
import type { EmailClassification, EmailTransactionStatus } from '../types/email-imports';

// ============================================================================
// CLASSIFICATION RULE TYPES
// ============================================================================

/**
 * Payment method context detected from email content
 *
 * This helps determine if a THB receipt should wait for a USD statement
 * or if it was paid directly (e.g., via e-wallet).
 */
export type PaymentContext = 'credit_card' | 'e_wallet' | 'bank_transfer' | 'unknown';

/**
 * Classification rule that determines initial status
 *
 * Rules are evaluated in order; first matching rule wins.
 */
export interface ClassificationRule {
  /** Rule identifier for debugging */
  id: string;

  /** Human-readable description */
  description: string;

  /** Parser keys this rule applies to (null = all parsers) */
  parserKeys: string[] | null;

  /** Classification types this rule applies to (null = all) */
  classifications: EmailClassification[] | null;

  /** Payment contexts this rule applies to (null = all) */
  paymentContexts: PaymentContext[] | null;

  /** Currency codes this rule applies to (null = all) */
  currencies: string[] | null;

  /** Resulting status when rule matches */
  status: EmailTransactionStatus;

  /** Priority (lower = evaluated first) */
  priority: number;

  /** Whether this rule is active */
  enabled: boolean;
}

// ============================================================================
// PARSER PATTERNS
// ============================================================================

/**
 * Parser definitions with their matching patterns
 */
interface ParserPattern {
  key: string;
  name: string;
  classification: EmailClassification;
  senderPatterns: string[];
  subjectPatterns: string[];
  /** Optional body patterns for more specific matching */
  bodyPatterns?: string[];
  /** Default payment context for this parser */
  defaultPaymentContext?: PaymentContext;
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
    defaultPaymentContext: 'credit_card', // Default; can be overridden by content detection
  },

  // Bolt receipts
  {
    key: 'bolt',
    name: 'Bolt Receipt Parser',
    classification: EMAIL_CLASSIFICATION.RECEIPT,
    senderPatterns: ['no-reply@bolt.eu', 'noreply@bolt.eu', 'receipts@bolt.eu'],
    subjectPatterns: ['your bolt receipt', 'your bolt ride receipt'],
    defaultPaymentContext: 'credit_card',
  },

  // Bangkok Bank transfers
  {
    key: 'bangkok-bank',
    name: 'Bangkok Bank Parser',
    classification: EMAIL_CLASSIFICATION.BANK_TRANSFER,
    senderPatterns: ['bualuang@bangkokbank.com', 'notification@bangkokbank.com'],
    subjectPatterns: ['transfer notification', 'funds transfer', 'payment notification'],
    defaultPaymentContext: 'bank_transfer',
  },

  // Kasikorn Bank (K PLUS) transfers
  {
    key: 'kasikorn',
    name: 'Kasikorn Bank Parser',
    classification: EMAIL_CLASSIFICATION.BANK_TRANSFER,
    senderPatterns: ['kplus@kasikornbank.com', 'notification@kasikornbank.com', 'kbank@kasikornbank.com'],
    subjectPatterns: ['k plus', 'kplus', 'transfer notification'],
    defaultPaymentContext: 'bank_transfer',
  },

  // Lazada orders
  {
    key: 'lazada',
    name: 'Lazada Order Parser',
    classification: EMAIL_CLASSIFICATION.ORDER_CONFIRMATION,
    senderPatterns: ['no-reply@lazada.co.th', 'noreply@lazada.co.th', 'notification@lazada.co.th'],
    subjectPatterns: ['order confirmation', 'your order', 'order placed'],
    defaultPaymentContext: 'credit_card',
  },
];

// ============================================================================
// CLASSIFICATION RULES
// ============================================================================

/**
 * Default classification rules
 *
 * These rules determine the initial status for each email type.
 * Rules are evaluated in priority order (lower number = higher priority).
 *
 * The logic implemented:
 * 1. E-wallet payments (GrabPay, Bolt Balance) → ready_to_import (no CC matching needed)
 * 2. Grab/Bolt THB receipts (credit card) → waiting_for_statement (needs USD charge match)
 * 3. Bank transfers → ready_to_import (direct THB transactions)
 * 4. Order confirmations → pending_review (amounts may change)
 * 5. Unknown → pending_review
 */
const DEFAULT_CLASSIFICATION_RULES: ClassificationRule[] = [
  // Rule 1: E-wallet payments are ready to import (no CC matching needed)
  {
    id: 'e_wallet_ready',
    description: 'E-wallet payments (GrabPay, Bolt Balance) are ready to import',
    parserKeys: ['grab', 'bolt'],
    classifications: [EMAIL_CLASSIFICATION.RECEIPT],
    paymentContexts: ['e_wallet'],
    currencies: null, // Any currency
    status: EMAIL_TRANSACTION_STATUS.READY_TO_IMPORT,
    priority: 10,
    enabled: true,
  },

  // Rule 2: THB receipts from ride-hailing apps paid via credit card need statement matching
  {
    id: 'grab_bolt_cc_thb',
    description: 'Grab/Bolt THB receipts (credit card) wait for USD statement',
    parserKeys: ['grab', 'bolt'],
    classifications: [EMAIL_CLASSIFICATION.RECEIPT],
    paymentContexts: ['credit_card', 'unknown'], // Assume CC if unknown
    currencies: ['THB'],
    status: EMAIL_TRANSACTION_STATUS.WAITING_FOR_STATEMENT,
    priority: 20,
    enabled: true,
  },

  // Rule 3: USD receipts from any parser are ready to import (already in target currency)
  {
    id: 'usd_ready',
    description: 'USD receipts are ready to import',
    parserKeys: null, // Any parser
    classifications: [EMAIL_CLASSIFICATION.RECEIPT],
    paymentContexts: null, // Any payment context
    currencies: ['USD'],
    status: EMAIL_TRANSACTION_STATUS.READY_TO_IMPORT,
    priority: 25,
    enabled: true,
  },

  // Rule 4: Bank transfers are ready to import
  {
    id: 'bank_transfer_ready',
    description: 'Bank transfers are ready to import',
    parserKeys: ['bangkok-bank', 'kasikorn'],
    classifications: [EMAIL_CLASSIFICATION.BANK_TRANSFER],
    paymentContexts: ['bank_transfer'],
    currencies: null, // Any currency
    status: EMAIL_TRANSACTION_STATUS.READY_TO_IMPORT,
    priority: 30,
    enabled: true,
  },

  // Rule 5: Bill payments are ready to import (direct payments)
  {
    id: 'bill_payment_ready',
    description: 'Bill payments are ready to import',
    parserKeys: null,
    classifications: [EMAIL_CLASSIFICATION.BILL_PAYMENT],
    paymentContexts: null,
    currencies: null,
    status: EMAIL_TRANSACTION_STATUS.READY_TO_IMPORT,
    priority: 35,
    enabled: true,
  },

  // Rule 6: Order confirmations need review (amounts may change)
  {
    id: 'order_confirmation_review',
    description: 'Order confirmations need review (amounts may change)',
    parserKeys: ['lazada'],
    classifications: [EMAIL_CLASSIFICATION.ORDER_CONFIRMATION],
    paymentContexts: null,
    currencies: null,
    status: EMAIL_TRANSACTION_STATUS.PENDING_REVIEW,
    priority: 40,
    enabled: true,
  },

  // Rule 7: Unknown classification defaults to pending review
  {
    id: 'unknown_default',
    description: 'Unknown emails need manual review',
    parserKeys: null,
    classifications: [EMAIL_CLASSIFICATION.UNKNOWN],
    paymentContexts: null,
    currencies: null,
    status: EMAIL_TRANSACTION_STATUS.PENDING_REVIEW,
    priority: 100,
    enabled: true,
  },

  // Rule 8: Fallback - anything not matched goes to pending review
  {
    id: 'fallback_review',
    description: 'Fallback: unmatched emails go to pending review',
    parserKeys: null,
    classifications: null, // Any classification
    paymentContexts: null,
    currencies: null,
    status: EMAIL_TRANSACTION_STATUS.PENDING_REVIEW,
    priority: 999,
    enabled: true,
  },
];

// Active rules (can be modified at runtime)
let classificationRules: ClassificationRule[] = [...DEFAULT_CLASSIFICATION_RULES];

// ============================================================================
// PAYMENT CONTEXT DETECTION
// ============================================================================

/**
 * E-wallet patterns to detect direct payments
 *
 * When these are found in email content, the payment was made via e-wallet
 * and doesn't need credit card statement matching.
 */
const E_WALLET_PATTERNS = {
  grab: [
    /grabpay\s*wallet/i,
    /paid\s*(?:with|via|using)\s*grabpay/i,
    /grabpay\s*balance/i,
    /wallet\s*balance/i,
    /grab\s*credits/i,
  ],
  bolt: [
    /bolt\s*balance/i,
    /bolt\s*credits/i,
    /paid\s*(?:with|via|using)\s*bolt\s*balance/i,
    /wallet\s*payment/i,
  ],
};

/**
 * Credit card patterns to detect CC payments
 */
const CREDIT_CARD_PATTERNS = [
  /visa\s*\*{4}\d{4}/i,
  /mastercard\s*\*{4}\d{4}/i,
  /credit\s*card/i,
  /\*{4}\s*\d{4}/i, // Card ending in XXXX
  /card\s*ending\s*(?:in\s*)?\d{4}/i,
];

/**
 * Detect payment context from email content
 *
 * Analyzes the email body to determine how the transaction was paid:
 * - e_wallet: Paid via GrabPay, Bolt Balance, etc.
 * - credit_card: Paid via credit/debit card
 * - bank_transfer: Direct bank transfer
 * - unknown: Cannot determine payment method
 */
export function detectPaymentContext(
  parserKey: string | null,
  email: RawEmailData
): PaymentContext {
  const body = (email.text_body || '') + ' ' + (email.html_body || '');

  // Check parser-specific e-wallet patterns
  if (parserKey && parserKey in E_WALLET_PATTERNS) {
    const patterns = E_WALLET_PATTERNS[parserKey as keyof typeof E_WALLET_PATTERNS];
    for (const pattern of patterns) {
      if (pattern.test(body)) {
        return 'e_wallet';
      }
    }
  }

  // Check credit card patterns
  for (const pattern of CREDIT_CARD_PATTERNS) {
    if (pattern.test(body)) {
      return 'credit_card';
    }
  }

  // Get default from parser pattern
  const parserPattern = parserKey ? PARSER_PATTERNS.find(p => p.key === parserKey) : null;
  if (parserPattern?.defaultPaymentContext) {
    return parserPattern.defaultPaymentContext;
  }

  return 'unknown';
}

// ============================================================================
// RULE MATCHING
// ============================================================================

/**
 * Context for evaluating classification rules
 */
export interface ClassificationContext {
  parserKey: string | null;
  classification: EmailClassification;
  paymentContext: PaymentContext;
  currency: string | null;
}

/**
 * Check if a rule matches the given context
 */
function ruleMatches(rule: ClassificationRule, context: ClassificationContext): boolean {
  if (!rule.enabled) {
    return false;
  }

  // Check parser key
  if (rule.parserKeys !== null && context.parserKey !== null) {
    if (!rule.parserKeys.includes(context.parserKey)) {
      return false;
    }
  }

  // Check classification
  if (rule.classifications !== null) {
    if (!rule.classifications.includes(context.classification)) {
      return false;
    }
  }

  // Check payment context
  if (rule.paymentContexts !== null) {
    if (!rule.paymentContexts.includes(context.paymentContext)) {
      return false;
    }
  }

  // Check currency
  if (rule.currencies !== null && context.currency !== null) {
    if (!rule.currencies.includes(context.currency)) {
      return false;
    }
  }

  return true;
}

/**
 * Get the status for a given classification context
 *
 * Evaluates rules in priority order and returns the status from the first matching rule.
 */
export function getStatusFromRules(context: ClassificationContext): EmailTransactionStatus {
  // Sort rules by priority
  const sortedRules = [...classificationRules].sort((a, b) => a.priority - b.priority);

  for (const rule of sortedRules) {
    if (ruleMatches(rule, context)) {
      return rule.status;
    }
  }

  // Fallback (should never reach here due to fallback rule)
  return EMAIL_TRANSACTION_STATUS.PENDING_REVIEW;
}

/**
 * Get the matching rule for a context (for debugging)
 */
export function getMatchingRule(context: ClassificationContext): ClassificationRule | null {
  const sortedRules = [...classificationRules].sort((a, b) => a.priority - b.priority);

  for (const rule of sortedRules) {
    if (ruleMatches(rule, context)) {
      return rule;
    }
  }

  return null;
}

// ============================================================================
// RULE MANAGEMENT
// ============================================================================

/**
 * Get all classification rules
 */
export function getClassificationRules(): ClassificationRule[] {
  return [...classificationRules];
}

/**
 * Set classification rules (replaces all rules)
 */
export function setClassificationRules(rules: ClassificationRule[]): void {
  classificationRules = [...rules];
}

/**
 * Reset to default rules
 */
export function resetClassificationRules(): void {
  classificationRules = [...DEFAULT_CLASSIFICATION_RULES];
}

/**
 * Add a new classification rule
 */
export function addClassificationRule(rule: ClassificationRule): void {
  classificationRules.push(rule);
}

/**
 * Remove a classification rule by ID
 */
export function removeClassificationRule(ruleId: string): boolean {
  const index = classificationRules.findIndex(r => r.id === ruleId);
  if (index >= 0) {
    classificationRules.splice(index, 1);
    return true;
  }
  return false;
}

/**
 * Enable or disable a rule by ID
 */
export function setRuleEnabled(ruleId: string, enabled: boolean): boolean {
  const rule = classificationRules.find(r => r.id === ruleId);
  if (rule) {
    rule.enabled = enabled;
    return true;
  }
  return false;
}

// ============================================================================
// UNKNOWN EMAIL CLASSIFICATION
// ============================================================================

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
 * Extended classification result with additional context
 */
export interface ExtendedClassificationResult extends ClassificationResult {
  /** Detected payment context */
  paymentContext: PaymentContext;

  /** Detected currency (if known from extraction) */
  currency: string | null;

  /** The rule that determined the status */
  matchedRule: ClassificationRule | null;
}

/**
 * Classify an email with full context including payment method detection
 *
 * This is the recommended classification function that provides full context
 * including payment method detection and rule matching.
 *
 * @param email - Raw email data with headers and body
 * @param extractedData - Optional extracted transaction data for currency info
 * @returns Extended classification result with full context
 */
export function classifyEmailWithContext(
  email: RawEmailData,
  extractedData?: Partial<ExtractedTransaction>
): ExtendedClassificationResult {
  const fromAddress = email.from_address?.toLowerCase() || '';
  const subject = email.subject?.toLowerCase() || '';

  // Try each parser pattern in order
  for (const pattern of PARSER_PATTERNS) {
    // Check sender patterns
    const matchesSender = pattern.senderPatterns.some((p) =>
      fromAddress.includes(p.toLowerCase())
    );

    // Check subject patterns
    const matchesSubject = pattern.subjectPatterns.some((p) =>
      subject.includes(p.toLowerCase())
    );

    if (matchesSender || matchesSubject) {
      // Detect payment context from email content
      const paymentContext = detectPaymentContext(pattern.key, email);

      // Get currency from extracted data or null
      const currency = extractedData?.currency || null;

      // Build full context
      const context: ClassificationContext = {
        parserKey: pattern.key,
        classification: pattern.classification,
        paymentContext,
        currency,
      };

      // Get status from rules
      const status = getStatusFromRules(context);
      const matchedRule = getMatchingRule(context);

      return {
        classification: pattern.classification,
        status,
        parserKey: pattern.key,
        confidence: matchesSender ? 90 : 75, // Higher confidence for sender match
        paymentContext,
        currency,
        matchedRule,
      };
    }
  }

  // No parser matched - classify using basic heuristics
  const unknownResult = classifyUnknownEmail(email);
  return {
    ...unknownResult,
    paymentContext: 'unknown',
    currency: extractedData?.currency || null,
    matchedRule: null,
  };
}

/**
 * Classify an email to determine which parser should handle it
 *
 * This is the legacy classification function for backward compatibility.
 * For full context including payment method detection, use classifyEmailWithContext.
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
      // Detect payment context for status determination
      const paymentContext = detectPaymentContext(pattern.key, email);
      const context: ClassificationContext = {
        parserKey: pattern.key,
        classification: pattern.classification,
        paymentContext,
        currency: null, // No currency info without extraction
      };

      return {
        classification: pattern.classification,
        status: getStatusFromRules(context),
        parserKey: pattern.key,
        confidence: 90, // High confidence when sender matches
      };
    }

    // Check subject patterns
    const matchesSubject = pattern.subjectPatterns.some((p) =>
      subject.includes(p.toLowerCase())
    );

    if (matchesSubject) {
      // Detect payment context for status determination
      const paymentContext = detectPaymentContext(pattern.key, email);
      const context: ClassificationContext = {
        parserKey: pattern.key,
        classification: pattern.classification,
        paymentContext,
        currency: null,
      };

      return {
        classification: pattern.classification,
        status: getStatusFromRules(context),
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

// ============================================================================
// EXPORTS
// ============================================================================

// Export constants
export { PARSER_PATTERNS, DEFAULT_CLASSIFICATION_RULES };

// Export types
export type { ParserPattern };

// Note: The following are already exported inline:
// - PaymentContext (type)
// - ClassificationRule (interface)
// - ClassificationContext (interface)
// - ExtendedClassificationResult (interface)
// - detectPaymentContext (function)
// - getStatusFromRules (function)
// - getMatchingRule (function)
// - getClassificationRules (function)
// - setClassificationRules (function)
// - resetClassificationRules (function)
// - addClassificationRule (function)
// - removeClassificationRule (function)
// - setRuleEnabled (function)
// - classifyEmailWithContext (function)
// - classifyEmail (function)
// - getParserKey (function)
// - hasMatchingParser (function)
// - getRegisteredParserKeys (function)
// - getParserInfo (function)
