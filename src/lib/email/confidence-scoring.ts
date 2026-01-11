/**
 * Confidence Scoring for Email Transaction Extraction
 *
 * Calculates extraction confidence scores based on field completeness
 * and pattern match quality. Used to determine automation level.
 *
 * Scoring breakdown (0-100):
 * - All required fields present: +40 points
 * - Amount parsed correctly: +20 points
 * - Date parsed correctly: +20 points
 * - Vendor identified: +10 points
 * - Order ID found: +10 points
 *
 * Status thresholds:
 * - score < 55: needs_manual_review (pending_review status)
 * - score >= 55 AND < 90: pending_review (normal confidence)
 * - score >= 90: pending_review with high confidence flag
 */

import type { ExtractedTransaction } from './types';
import type { EmailTransactionStatus } from '../types/email-imports';
import { EMAIL_TRANSACTION_STATUS } from '../types/email-imports';

/**
 * Individual scoring component
 */
export interface ScoreComponent {
  /** Component name */
  name: string;
  /** Maximum points for this component */
  maxPoints: number;
  /** Actual points earned */
  earnedPoints: number;
  /** Whether this component was satisfied */
  satisfied: boolean;
  /** Optional notes about this component */
  notes?: string;
}

/**
 * Detailed confidence score breakdown
 */
export interface ConfidenceScoreBreakdown {
  /** Total score 0-100 */
  totalScore: number;
  /** Individual scoring components */
  components: ScoreComponent[];
  /** Overall confidence level */
  level: 'low' | 'medium' | 'high';
  /** Human-readable summary */
  summary: string;
}

/**
 * Confidence thresholds
 */
export const CONFIDENCE_THRESHOLDS = {
  /** Below this score, email needs manual review */
  LOW: 55,
  /** At or above this score, email has high confidence */
  HIGH: 90,
} as const;

/**
 * Score component weights
 */
export const SCORE_WEIGHTS = {
  /** All required fields present (vendor, amount, currency, date) */
  REQUIRED_FIELDS: 40,
  /** Amount parsed correctly (positive number) */
  AMOUNT: 20,
  /** Date parsed correctly (valid date) */
  DATE: 20,
  /** Vendor identified */
  VENDOR: 10,
  /** Order/reference ID found */
  ORDER_ID: 10,
} as const;

/**
 * Calculate confidence score with detailed breakdown
 *
 * @param data - Extracted transaction data (may be undefined)
 * @returns Detailed confidence breakdown
 */
export function calculateConfidenceScore(
  data: ExtractedTransaction | undefined
): ConfidenceScoreBreakdown {
  const components: ScoreComponent[] = [];
  let totalScore = 0;

  // Component 1: Required fields present
  const hasRequiredFields = !!(
    data?.vendor_name_raw &&
    data?.amount !== undefined &&
    data?.currency &&
    data?.transaction_date
  );
  components.push({
    name: 'Required Fields',
    maxPoints: SCORE_WEIGHTS.REQUIRED_FIELDS,
    earnedPoints: hasRequiredFields ? SCORE_WEIGHTS.REQUIRED_FIELDS : 0,
    satisfied: hasRequiredFields,
    notes: hasRequiredFields
      ? 'All required fields present (vendor, amount, currency, date)'
      : getMissingFieldsNote(data),
  });
  if (hasRequiredFields) {
    totalScore += SCORE_WEIGHTS.REQUIRED_FIELDS;
  }

  // Component 2: Amount parsed correctly
  const hasValidAmount = data?.amount !== undefined && data.amount > 0;
  components.push({
    name: 'Amount',
    maxPoints: SCORE_WEIGHTS.AMOUNT,
    earnedPoints: hasValidAmount ? SCORE_WEIGHTS.AMOUNT : 0,
    satisfied: hasValidAmount,
    notes: hasValidAmount
      ? `Amount: ${data?.currency || ''} ${data?.amount?.toFixed(2) || ''}`
      : 'No valid amount extracted',
  });
  if (hasValidAmount) {
    totalScore += SCORE_WEIGHTS.AMOUNT;
  }

  // Component 3: Date parsed correctly
  const hasValidDate = data?.transaction_date instanceof Date &&
    !isNaN(data.transaction_date.getTime());
  components.push({
    name: 'Date',
    maxPoints: SCORE_WEIGHTS.DATE,
    earnedPoints: hasValidDate ? SCORE_WEIGHTS.DATE : 0,
    satisfied: hasValidDate,
    notes: hasValidDate
      ? `Date: ${data?.transaction_date?.toISOString().split('T')[0] || ''}`
      : 'No valid date extracted',
  });
  if (hasValidDate) {
    totalScore += SCORE_WEIGHTS.DATE;
  }

  // Component 4: Vendor identified
  const hasVendor = !!(data?.vendor_name_raw && data.vendor_name_raw.length > 0);
  const hasVendorId = !!data?.vendor_id;
  components.push({
    name: 'Vendor',
    maxPoints: SCORE_WEIGHTS.VENDOR,
    earnedPoints: hasVendor ? SCORE_WEIGHTS.VENDOR : 0,
    satisfied: hasVendor,
    notes: hasVendor
      ? `Vendor: ${data?.vendor_name_raw}${hasVendorId ? ' (matched to database)' : ''}`
      : 'No vendor identified',
  });
  if (hasVendor) {
    totalScore += SCORE_WEIGHTS.VENDOR;
  }

  // Component 5: Order ID found
  const hasOrderId = !!(data?.order_id && data.order_id.length > 0);
  components.push({
    name: 'Order ID',
    maxPoints: SCORE_WEIGHTS.ORDER_ID,
    earnedPoints: hasOrderId ? SCORE_WEIGHTS.ORDER_ID : 0,
    satisfied: hasOrderId,
    notes: hasOrderId
      ? `Order ID: ${data?.order_id}`
      : 'No order/reference ID found',
  });
  if (hasOrderId) {
    totalScore += SCORE_WEIGHTS.ORDER_ID;
  }

  // Determine confidence level
  const level = getConfidenceLevel(totalScore);

  // Generate summary
  const summary = generateScoreSummary(totalScore, components, level);

  return {
    totalScore: Math.min(totalScore, 100),
    components,
    level,
    summary,
  };
}

/**
 * Get note about missing required fields
 */
function getMissingFieldsNote(data: ExtractedTransaction | undefined): string {
  if (!data) {
    return 'No data extracted';
  }

  const missing: string[] = [];
  if (!data.vendor_name_raw) missing.push('vendor');
  if (data.amount === undefined) missing.push('amount');
  if (!data.currency) missing.push('currency');
  if (!data.transaction_date) missing.push('date');

  return missing.length > 0
    ? `Missing: ${missing.join(', ')}`
    : 'All required fields present';
}

/**
 * Determine confidence level from score
 */
export function getConfidenceLevel(score: number): 'low' | 'medium' | 'high' {
  if (score < CONFIDENCE_THRESHOLDS.LOW) {
    return 'low';
  }
  if (score >= CONFIDENCE_THRESHOLDS.HIGH) {
    return 'high';
  }
  return 'medium';
}

/**
 * Generate human-readable score summary
 */
function generateScoreSummary(
  score: number,
  components: ScoreComponent[],
  level: 'low' | 'medium' | 'high'
): string {
  const satisfied = components.filter(c => c.satisfied).length;
  const total = components.length;

  let levelText: string;
  switch (level) {
    case 'high':
      levelText = 'High confidence';
      break;
    case 'medium':
      levelText = 'Medium confidence';
      break;
    case 'low':
      levelText = 'Low confidence - needs review';
      break;
  }

  return `${levelText} (${score}/100). ${satisfied}/${total} scoring criteria met.`;
}

/**
 * Determine initial status based on confidence score and classification
 *
 * Status determination rules:
 * - score < 55: Always pending_review (needs manual intervention)
 * - score >= 55: Use the status determined by classification logic
 *
 * @param score - Confidence score 0-100
 * @param classificationStatus - Status from classification (e.g., waiting_for_statement)
 * @returns Final status to use
 */
export function determineStatusFromConfidence(
  score: number,
  classificationStatus: EmailTransactionStatus
): EmailTransactionStatus {
  // Low confidence always goes to pending review
  if (score < CONFIDENCE_THRESHOLDS.LOW) {
    return EMAIL_TRANSACTION_STATUS.PENDING_REVIEW;
  }

  // Medium/high confidence uses classification-determined status
  return classificationStatus;
}

/**
 * Check if score indicates high confidence extraction
 */
export function isHighConfidence(score: number): boolean {
  return score >= CONFIDENCE_THRESHOLDS.HIGH;
}

/**
 * Check if score indicates low confidence requiring review
 */
export function isLowConfidence(score: number): boolean {
  return score < CONFIDENCE_THRESHOLDS.LOW;
}

/**
 * Format score breakdown as extraction notes string
 * This is stored in the extraction_notes column for audit trail
 */
export function formatScoreAsNotes(breakdown: ConfidenceScoreBreakdown): string {
  const lines: string[] = [breakdown.summary, ''];

  for (const component of breakdown.components) {
    const status = component.satisfied ? '✓' : '✗';
    const points = `${component.earnedPoints}/${component.maxPoints}`;
    lines.push(`${status} ${component.name}: ${points}${component.notes ? ` - ${component.notes}` : ''}`);
  }

  return lines.join('\n');
}

/**
 * Create a simple confidence summary for display
 */
export function getConfidenceSummary(score: number): {
  level: 'low' | 'medium' | 'high';
  label: string;
  color: 'red' | 'yellow' | 'green';
} {
  const level = getConfidenceLevel(score);

  switch (level) {
    case 'high':
      return { level, label: 'High Confidence', color: 'green' };
    case 'medium':
      return { level, label: 'Medium Confidence', color: 'yellow' };
    case 'low':
      return { level, label: 'Needs Review', color: 'red' };
  }
}
