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
  classifyEmail,
  getParserKey,
  hasMatchingParser,
  getRegisteredParserKeys,
  getParserInfo,
  PARSER_PATTERNS,
} from './classifier';
export type { ParserPattern } from './classifier';

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
