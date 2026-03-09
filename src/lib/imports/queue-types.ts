export type ImportSource = 'statement' | 'email' | 'merged'

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
  source: ImportSource
  emailMetadata?: EmailMetadata
  mergedEmailData?: MergedEmailData
  crossCurrencyInfo?: CrossCurrencyInfo
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
