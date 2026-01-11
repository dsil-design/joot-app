import { Tables, TablesInsert, TablesUpdate } from '../supabase/types';

// Email Transaction types
export type EmailTransaction = Tables<'email_transactions'>;
export type EmailTransactionInsert = TablesInsert<'email_transactions'>;
export type EmailTransactionUpdate = TablesUpdate<'email_transactions'>;

// Statement Upload types
export type StatementUpload = Tables<'statement_uploads'>;
export type StatementUploadInsert = TablesInsert<'statement_uploads'>;
export type StatementUploadUpdate = TablesUpdate<'statement_uploads'>;

// Import Activity types
export type ImportActivity = Tables<'import_activities'>;
export type ImportActivityInsert = TablesInsert<'import_activities'>;
export type ImportActivityUpdate = TablesUpdate<'import_activities'>;

// Status enums (matching database CHECK constraints)
export const EMAIL_TRANSACTION_STATUS = {
  PENDING_REVIEW: 'pending_review',
  MATCHED: 'matched',
  WAITING_FOR_STATEMENT: 'waiting_for_statement',
  READY_TO_IMPORT: 'ready_to_import',
  IMPORTED: 'imported',
  SKIPPED: 'skipped',
} as const;

export type EmailTransactionStatus = typeof EMAIL_TRANSACTION_STATUS[keyof typeof EMAIL_TRANSACTION_STATUS];

export const EMAIL_CLASSIFICATION = {
  RECEIPT: 'receipt',
  ORDER_CONFIRMATION: 'order_confirmation',
  BANK_TRANSFER: 'bank_transfer',
  BILL_PAYMENT: 'bill_payment',
  UNKNOWN: 'unknown',
} as const;

export type EmailClassification = typeof EMAIL_CLASSIFICATION[keyof typeof EMAIL_CLASSIFICATION];

export const STATEMENT_UPLOAD_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export type StatementUploadStatus = typeof STATEMENT_UPLOAD_STATUS[keyof typeof STATEMENT_UPLOAD_STATUS];

export const IMPORT_ACTIVITY_TYPE = {
  EMAIL_SYNC: 'email_sync',
  EMAIL_MATCH: 'email_match',
  EMAIL_IMPORT: 'email_import',
  STATEMENT_UPLOAD: 'statement_upload',
  STATEMENT_PROCESSED: 'statement_processed',
  TRANSACTION_MATCHED: 'transaction_matched',
  TRANSACTION_CREATED: 'transaction_created',
  TRANSACTION_SKIPPED: 'transaction_skipped',
  BATCH_IMPORT: 'batch_import',
  ERROR: 'error',
} as const;

export type ImportActivityType = typeof IMPORT_ACTIVITY_TYPE[keyof typeof IMPORT_ACTIVITY_TYPE];

export const MATCH_METHOD = {
  AUTO: 'auto',
  MANUAL: 'manual',
} as const;

export type MatchMethod = typeof MATCH_METHOD[keyof typeof MATCH_METHOD];
