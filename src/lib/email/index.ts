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

// Parsers
export * from './extractors';
