export type ImportSource = 'statement' | 'email' | 'merged' | 'payment_slip'

/**
 * One PDF attachment associated with an email — surfaced on review cards
 * so the user can open the original receipt.
 */
export interface EmailAttachmentSummary {
  id: string
  filename: string
  /** 'extracted' = text was successfully pulled from the PDF; others indicate failure modes. */
  extractionStatus: 'pending' | 'extracted' | 'failed' | 'skipped'
  pageCount?: number | null
}

export interface EmailMetadata {
  subject?: string
  fromName?: string
  fromAddress?: string
  classification?: string
  orderId?: string
  emailDate?: string
  vendorId?: string
  parserKey?: string
  extractionConfidence?: number
  paymentCardLastFour?: string
  paymentCardType?: string
  vendorNameRaw?: string
  attachments?: EmailAttachmentSummary[]
  /**
   * Per-shipment breakdown for vendors (currently Amazon) that send one
   * order-confirmation email summarizing N sub-orders that each post as a
   * separate credit-card charge. Each sub-order tracks its own match state.
   * Absent or empty for normal one-amount emails.
   */
  subOrders?: EmailSubOrderSummary[]
}

export interface EmailSubOrderSummary {
  /** email_sub_orders.id */
  id: string
  /** 0-based position in the original email */
  position: number
  /** Per-shipment order ID, e.g. "111-8507210-6332245" */
  orderId?: string
  amount: number
  currency: string
  /** Short summary or first item name */
  description?: string
  /** Parsed "Arriving ..." date when the email surfaced one, YYYY-MM-DD */
  arrivalDate?: string
  /** Linked transaction (when matched). */
  matchedTransactionId?: string
  matchConfidence?: number
  /** Summary of the matched transaction for inline display. */
  matchedTransaction?: {
    date: string
    amount: number
    currency: string
    description?: string
    vendorName?: string
    paymentMethodName?: string
  }
}

export interface MergedEmailData {
  date: string
  description: string
  amount: number
  currency: string
  metadata: EmailMetadata
}

export interface CrossCurrencyInfo {
  emailAmount: number
  emailCurrency: string
  statementAmount: number
  statementCurrency: string
  rate: number
  rateDate: string
  percentDiff: number
}

export type { TransactionProposal } from '@/lib/proposals/types'

export interface MergedPaymentSlipData {
  date: string
  description: string
  amount: number
  currency: string
  metadata: PaymentSlipMetadata
}

export interface QueueItem {
  id: string
  statementUploadId?: string
  statementFilename: string
  paymentMethod: { id: string; name: string } | null
  paymentMethodType?: string
  statementTransaction: {
    date: string
    description: string
    amount: number
    currency: string
    sourceFilename: string
    /**
     * Optional foreign-currency reference info for transactions where the
     * statement settlement currency differs from the currency the merchant
     * actually billed in (e.g. a Chase USD charge that originated as a THB
     * purchase). This is informational metadata — `amount`/`currency` above
     * remain the settlement amount.
     */
    foreignAmount?: number
    foreignCurrency?: string
    foreignExchangeRate?: number
  }
  matchedTransaction?: {
    id: string
    date: string
    amount: number
    currency: string
    vendor_name?: string
    description?: string
    payment_method_name?: string
  }
  confidence: number
  /**
   * Confidence that `matchedTransaction` is the same payment as this card.
   *
   * Deliberately separate from `confidence`, which on a merged card measures
   * something else entirely — that the email and the statement row are the
   * same payment. Merging used to overwrite the one with the other, so a
   * weak auto-link inherited the 99% earned by the cross-source pairing and
   * was presented as near-certain. Undefined when there is no matched
   * transaction, or when the link predates this field.
   */
  transactionMatchConfidence?: number
  confidenceLevel: 'high' | 'medium' | 'low' | 'none'
  reasons: string[]
  isNew: boolean
  status: 'pending' | 'approved' | 'rejected'
  waitingForStatement?: boolean
  /** For email items: statement-suggestion composite keys this email has been rejected from pairing with */
  rejectedPairKeys?: string[]
  /** For email items: transaction IDs the user has rejected as a match for this email */
  rejectedTransactionIds?: string[]
  /** Counterpart composite keys this source has been manually paired with by the user */
  manualPairKeys?: string[]
  /** Additional email_transactions.id values attached to this queue item via the
   * "Attach a source" affordance — used for many-to-one cases like multi-item
   * Lazada orders where multiple email receipts describe the same charge. */
  extraEmailIds?: string[]
  /** Additional payment_slip_uploads.id values attached to this queue item. */
  extraSlipIds?: string[]
  source: ImportSource
  emailMetadata?: EmailMetadata
  mergedEmailData?: MergedEmailData
  crossCurrencyInfo?: CrossCurrencyInfo
  paymentSlipMetadata?: PaymentSlipMetadata
  mergedPaymentSlipData?: MergedPaymentSlipData
}

export interface PaymentSlipMetadata {
  senderName?: string
  recipientName?: string
  bankDetected?: string
  transactionReference?: string
  memo?: string
  detectedDirection?: 'expense' | 'income' | 'transfer' | null
  slipUploadId?: string
}

export interface Suggestion {
  transaction_date: string
  description: string
  amount: number
  currency: string
  matched_transaction_id?: string
  confidence: number
  reasons: string[]
  is_new: boolean
  status?: 'pending' | 'approved' | 'rejected'
  /**
   * Time of day the row was posted, `HH:MM` (24hr), when the statement prints
   * one. KBANK does on every row; the US parsers do not. Undefined on any
   * statement extracted before this field was serialized, so every consumer
   * must treat it as optional and never as a filter that can empty a candidate
   * set — only as a tie-break among candidates already qualified on amount,
   * currency and direction.
   */
  transaction_time?: string
  /**
   * The parser's own direction assertion for this row. Prefer it over the sign
   * of `amount`: rows extracted before the PNC sign fix carry a rotted sign
   * alongside a correct type, so reading direction from the sign rejects links
   * that are in fact correct.
   */
  type?: 'charge' | 'credit' | 'payment' | 'fee' | 'interest' | 'adjustment'
  /** Bank reference for the row, when the statement prints one. */
  reference_number?: string
  /**
   * Transactions the user explicitly rejected as a match for this row.
   * Recorded by /api/imports/reject-transaction-match so matching never
   * re-proposes a link the user has already turned down — without having to
   * reject the row itself to make it stick.
   */
  rejected_transaction_ids?: string[]
  /**
   * Optional foreign-currency reference data extracted from the statement
   * (e.g. Chase shows the original THB/VND amount + Visa rate). This is
   * informational; `amount`/`currency` above are still the settlement values.
   */
  foreign_transaction?: {
    originalAmount: number
    originalCurrency: string
    exchangeRate?: number
  }
}

export interface QueueFilters {
  statusFilter: string
  currencyFilter: string
  confidenceFilter: string
  sourceFilter: string
  searchQuery: string
  fromDate?: string
  toDate?: string
  statementUploadId?: string
}

export interface QueueStats {
  total: number
  pending: number
  highConfidence: number
  mediumConfidence: number
  lowConfidence: number
  thisWeekCount: number
  resolvedCount: number
  waitingForStatementCount: number
}
