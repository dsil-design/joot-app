/**
 * Payment Slip Types
 *
 * Shared type definitions for the payment slip import source.
 * Payment slips are Thai bank transfer receipt images (KBank, Bangkok Bank)
 * processed via Claude Vision API.
 */

// ── Extraction result from Claude Vision ────────────────────────────────

export interface PaymentSlipExtraction {
  bank_detected: 'kbank' | 'bangkok_bank' | 'unknown'
  date: string            // ISO YYYY-MM-DD (converted from Thai BE if needed)
  date_raw: string | null // Raw date string as shown on the slip (e.g. "20 ต.ค. 69")
  time: string | null     // HH:MM (24hr)
  amount: number
  amount_raw: string | null // Raw amount string as shown on the slip (e.g. "117.00")
  fee: number
  currency: 'THB'
  sender_name: string
  sender_bank: string
  sender_account: string  // masked account number
  recipient_name: string
  recipient_bank: string
  recipient_account: string // masked account or phone number
  transaction_reference: string
  bank_reference: string | null
  memo: string | null
  transfer_type: 'promptpay' | 'direct' | 'unknown'
}

// ── Database record ─────────────────────────────────────────────────────

export interface PaymentSlipUpload {
  id: string
  user_id: string
  filename: string
  file_path: string
  file_size: number | null
  file_type: string | null
  file_hash: string | null
  transaction_date: string | null
  transaction_time: string | null
  amount: number | null
  fee: number | null
  currency: string
  sender_name: string | null
  sender_bank: string | null
  sender_account: string | null
  recipient_name: string | null
  recipient_bank: string | null
  recipient_account: string | null
  transaction_reference: string | null
  bank_reference: string | null
  memo: string | null
  bank_detected: string | null
  transfer_type: string | null
  detected_direction: 'expense' | 'income' | 'transfer' | null
  extraction_data: PaymentSlipExtraction | null
  status: PaymentSlipStatus
  extraction_started_at: string | null
  extraction_completed_at: string | null
  extraction_error: string | null
  extraction_log: Record<string, unknown> | null
  extraction_confidence: number | null
  ai_prompt_tokens: number | null
  ai_response_tokens: number | null
  ai_duration_ms: number | null
  matched_transaction_id: string | null
  match_confidence: number | null
  review_status: 'pending' | 'approved' | 'rejected'
  uploaded_at: string
  created_at: string
  updated_at: string
}

export type PaymentSlipStatus = 'pending' | 'processing' | 'ready_for_review' | 'done' | 'failed'

// ── Processing result ───────────────────────────────────────────────────

export interface SlipProcessingResult {
  success: boolean
  extraction: PaymentSlipExtraction | null
  confidence: number
  direction: 'expense' | 'income' | 'transfer' | null
  matchedTransactionId: string | null
  matchConfidence: number | null
  error: string | null
  tokenUsage: {
    promptTokens: number
    responseTokens: number
  }
  durationMs: number
}

// ── User bank account (for direction detection) ─────────────────────────

export interface UserBankAccount {
  id: string
  user_id: string
  bank_name: string
  account_identifier: string
  account_holder_name: string | null
  payment_method_id: string | null
  is_active: boolean
}
