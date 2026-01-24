export {
  calculateFileHash,
  checkForDuplicates,
  getDuplicateMessage,
  type DuplicateType,
  type DuplicateMatch,
  type DuplicateCheckResult,
} from './duplicate-detector'

// Statement parsers
export {
  // Types
  type ParsedStatementTransaction,
  type StatementPeriod,
  type StatementSummary,
  type StatementParseResult,
  type StatementParser,
  type ParseOptions,
  type ParserRegistry,
  // Parsers
  chaseParser,
  // Registry
  parserRegistry,
  getParser,
  detectParser,
  getAvailableParserKeys,
} from './parsers'
