/**
 * Statement Parsers Index
 *
 * Exports all statement parsers and types for use by the PDF extraction service.
 */

// Types
export type {
  ParsedStatementTransaction,
  StatementPeriod,
  StatementSummary,
  StatementParseResult,
  StatementParser,
  ParseOptions,
  ParserRegistry,
} from './types';

// Parsers
export { chaseParser } from './chase';
export { amexParser } from './amex';
export { bangkokBankParser } from './bangkok-bank';
export { kasikornParser } from './kasikorn';
export { pncParser } from './pnc';

// Parser registry - maps parser keys to parser implementations
import type { ParserRegistry } from './types';
import { chaseParser } from './chase';
import { amexParser } from './amex';
import { bangkokBankParser } from './bangkok-bank';
import { kasikornParser } from './kasikorn';
import { pncParser } from './pnc';

/**
 * Registry of all available statement parsers
 */
export const parserRegistry: ParserRegistry = new Map([
  ['chase', chaseParser],
  ['amex', amexParser],
  ['bangkok-bank', bangkokBankParser],
  ['kasikorn', kasikornParser],
  ['pnc', pncParser],
]);

/**
 * Get a parser by key
 */
export function getParser(key: string) {
  return parserRegistry.get(key);
}

/**
 * Detect which parser can handle the given text
 * Returns the first matching parser or undefined
 */
export function detectParser(text: string) {
  const entries = Array.from(parserRegistry.entries());
  for (const [key, parser] of entries) {
    if (parser.canParse(text)) {
      return { key, parser };
    }
  }
  return undefined;
}

/**
 * Get all available parser keys
 */
export function getAvailableParserKeys(): string[] {
  return Array.from(parserRegistry.keys());
}
