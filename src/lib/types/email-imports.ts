import { Tables, TablesInsert, TablesUpdate } from '../supabase/types';

// Email Transaction types
export type EmailTransaction = Tables<'email_transactions'>;
export type EmailTransactionInsert = TablesInsert<'email_transactions'>;
export type EmailTransactionUpdate = TablesUpdate<'email_transactions'>;

// Email Group types
export type EmailGroup = Tables<'email_groups'>;
export type EmailGroupInsert = TablesInsert<'email_groups'>;
export type EmailGroupUpdate = TablesUpdate<'email_groups'>;

// AI Feedback types
export type AiFeedback = Tables<'ai_feedback'>;
export type AiFeedbackInsert = TablesInsert<'ai_feedback'>;

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
  WAITING_FOR_EMAIL: 'waiting_for_email',
  READY_TO_IMPORT: 'ready_to_import',
  IMPORTED: 'imported',
  SKIPPED: 'skipped',
} as const;

export type EmailTransactionStatus = typeof EMAIL_TRANSACTION_STATUS[keyof typeof EMAIL_TRANSACTION_STATUS];

// Coarse classification (backward-compatible, used by classifier.ts rules engine)
export const EMAIL_CLASSIFICATION = {
  RECEIPT: 'receipt',
  ORDER_CONFIRMATION: 'order_confirmation',
  BANK_TRANSFER: 'bank_transfer',
  BILL_PAYMENT: 'bill_payment',
  UNKNOWN: 'unknown',
} as const;

export type EmailClassification = typeof EMAIL_CLASSIFICATION[keyof typeof EMAIL_CLASSIFICATION];

// Granular AI classification (13 types, stored in ai_classification column)
export const AI_CLASSIFICATION = {
  TRANSACTION_RECEIPT: 'transaction_receipt',
  SUBSCRIPTION_CHARGE: 'subscription_charge',
  BANK_TRANSFER_CONFIRMATION: 'bank_transfer_confirmation',
  BILL_PAYMENT_CONFIRMATION: 'bill_payment_confirmation',
  UPCOMING_CHARGE_NOTICE: 'upcoming_charge_notice',
  INVOICE_AVAILABLE: 'invoice_available',
  REFUND_NOTIFICATION: 'refund_notification',
  DELIVERY_STATUS: 'delivery_status',
  ORDER_STATUS: 'order_status',
  ACCOUNT_NOTIFICATION: 'account_notification',
  MARKETING_PROMOTIONAL: 'marketing_promotional',
  OTP_VERIFICATION: 'otp_verification',
  OTHER_NON_TRANSACTION: 'other_non_transaction',
} as const;

export type AiClassification = typeof AI_CLASSIFICATION[keyof typeof AI_CLASSIFICATION];

// AI feedback types
export const AI_FEEDBACK_TYPE = {
  CLASSIFICATION_CHANGE: 'classification_change',
  SKIP_OVERRIDE: 'skip_override',
  EXTRACTION_CORRECTION: 'extraction_correction',
  UNDO_SKIP: 'undo_skip',
  SKIP_REASON: 'skip_reason',
  PROPOSAL_REJECTION: 'proposal_rejection',
} as const;

export type AiFeedbackType = typeof AI_FEEDBACK_TYPE[keyof typeof AI_FEEDBACK_TYPE];

/**
 * Map granular AI classification to coarse classification (backward compat)
 */
export function aiClassificationToCoarse(aiClassification: AiClassification): EmailClassification {
  switch (aiClassification) {
    case AI_CLASSIFICATION.TRANSACTION_RECEIPT:
    case AI_CLASSIFICATION.SUBSCRIPTION_CHARGE:
      return EMAIL_CLASSIFICATION.RECEIPT;
    case AI_CLASSIFICATION.BANK_TRANSFER_CONFIRMATION:
      return EMAIL_CLASSIFICATION.BANK_TRANSFER;
    case AI_CLASSIFICATION.BILL_PAYMENT_CONFIRMATION:
      return EMAIL_CLASSIFICATION.BILL_PAYMENT;
    case AI_CLASSIFICATION.ORDER_STATUS:
      return EMAIL_CLASSIFICATION.ORDER_CONFIRMATION;
    default:
      return EMAIL_CLASSIFICATION.UNKNOWN;
  }
}

/**
 * Check if an AI classification represents a likely transaction
 */
export function isTransactionClassification(aiClassification: AiClassification): boolean {
  return [
    AI_CLASSIFICATION.TRANSACTION_RECEIPT,
    AI_CLASSIFICATION.SUBSCRIPTION_CHARGE,
    AI_CLASSIFICATION.BANK_TRANSFER_CONFIRMATION,
    AI_CLASSIFICATION.BILL_PAYMENT_CONFIRMATION,
    AI_CLASSIFICATION.REFUND_NOTIFICATION,
  ].includes(aiClassification);
}

/** Auto-skip threshold: require this many feedback entries before auto-skipping */
export const AUTO_SKIP_FEEDBACK_THRESHOLD = 10;

export const STATEMENT_UPLOAD_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  READY_FOR_REVIEW: 'ready_for_review',
  IN_REVIEW: 'in_review',
  DONE: 'done',
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
