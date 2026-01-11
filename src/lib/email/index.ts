/**
 * Email extraction module
 *
 * Provides email parsing and transaction extraction functionality.
 */

// Types
export * from './types';

// Services
export { extractionService, EmailExtractionService } from './extraction-service';

// Classifier
export {
  // Email classification functions
  classifyEmail,
  classifyEmailWithContext,
  getParserKey,
  hasMatchingParser,
  getRegisteredParserKeys,
  getParserInfo,
  // Payment context detection
  detectPaymentContext,
  // Classification rules
  getStatusFromRules,
  getMatchingRule,
  getClassificationRules,
  setClassificationRules,
  resetClassificationRules,
  addClassificationRule,
  removeClassificationRule,
  setRuleEnabled,
  // Constants
  PARSER_PATTERNS,
  DEFAULT_CLASSIFICATION_RULES,
} from './classifier';
export type {
  ParserPattern,
  PaymentContext,
  ClassificationRule,
  ClassificationContext,
  ExtendedClassificationResult,
} from './classifier';

// Confidence scoring
export {
  calculateConfidenceScore,
  determineStatusFromConfidence,
  getConfidenceLevel,
  isHighConfidence,
  isLowConfidence,
  formatScoreAsNotes,
  getConfidenceSummary,
  CONFIDENCE_THRESHOLDS,
  SCORE_WEIGHTS,
} from './confidence-scoring';
export type { ConfidenceScoreBreakdown, ScoreComponent } from './confidence-scoring';

// Parsers
export * from './extractors';
