import { CurrencyType } from '../supabase/types'

// Raw data from ECB API
export interface ECBRate {
  date: string;          // YYYY-MM-DD format
  currency: string;      // ISO currency code
  rate: number;         // Rate against EUR
}

// Processed rate ready for database insertion
export interface ProcessedRate {
  from_currency: CurrencyType;
  to_currency: CurrencyType;
  rate: number;
  date: string;
  source: 'ECB' | 'COINGECKO';
  is_interpolated: boolean | null;
  interpolated_from_date?: string;
}

// Service response wrapper
export interface FetchResult<T> {
  success: boolean;
  data?: T[];
  error?: string;
  timestamp: string;
}

// Error types for ECB fetcher
export enum ECBErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  PARSE_ERROR = 'PARSE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMIT = 'RATE_LIMIT'
}

// Custom error class for ECB operations
export class ECBError extends Error {
  public type: ECBErrorType;
  public originalError?: Error;

  constructor(type: ECBErrorType, message: string, originalError?: Error) {
    super(message);
    this.name = 'ECBError';
    this.type = type;
    this.originalError = originalError;
  }
}

// Retry configuration
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;     // milliseconds
  maxDelay: number;      // milliseconds
  backoffFactor: number;
}

// Default retry configuration
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,     // 1 second
  maxDelay: 10000,     // 10 seconds
  backoffFactor: 2
};

// Currency pairs that we want to track (only those available from ECB)
export const CURRENCY_PAIRS: [CurrencyType, CurrencyType][] = [
  // USD pairs
  ['USD', 'THB'], ['USD', 'EUR'], ['USD', 'GBP'],
  ['USD', 'SGD'], ['USD', 'MYR'],
  // Reverse pairs
  ['THB', 'USD'], ['EUR', 'USD'], ['GBP', 'USD'],
  ['SGD', 'USD'], ['MYR', 'USD']
];

// Valid currencies that we expect from ECB (only those actually provided by ECB)
export const VALID_ECB_CURRENCIES = ['USD', 'THB', 'GBP', 'SGD', 'MYR'] as const;

// ECB API endpoints
export const ECB_ENDPOINTS = {
  DAILY: 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml',
  HISTORICAL: 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-hist.xml'
} as const;

// XML parsing types
export interface ECBXMLData {
  'gesmes:Envelope': {
    Cube: [{
      Cube: Array<{
        $: { time: string };
        Cube?: Array<{
          $: { currency: string; rate: string };
        }>;
      }>;
    }];
  };
}

// Rate calculation utilities
export interface CrossRateCalculation {
  baseCurrency: 'EUR';
  targetPair: [CurrencyType, CurrencyType];
  baseRates: { [currency: string]: number };
  calculatedRate: number;
}

// Date range for fetching rates
export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

// Validation result
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Performance metrics for monitoring
export interface ECBFetchMetrics {
  startTime: number;
  endTime: number;
  duration: number;
  ratesProcessed: number;
  apiCalls: number;
  errors: number;
  retries: number;
}