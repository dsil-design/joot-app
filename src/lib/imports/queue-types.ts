export type ImportSource = 'statement' | 'email' | 'merged' | 'payment_slip'

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
  confidenceLevel: 'high' | 'medium' | 'low' | 'none'
  reasons: string[]
  isNew: boolean
  status: 'pending' | 'approved' | 'rejected'
  waitingForStatement?: boolean
  /** For email items: statement-suggestion composite keys this email has been rejected from pairing with */
  rejectedPairKeys?: string[]
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
