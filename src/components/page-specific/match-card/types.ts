import type { ConfidenceLevel } from "@/components/ui/confidence-indicator"
import type { TransactionProposal } from "@/lib/proposals/types"

/**
 * Match card variant — confidence-tiered
 */
export type MatchCardVariant =
  | "high-confidence" // Green border — score >= 90
  | "review-needed" // Amber border — score 55-89
  | "low-confidence" // Orange border — score < 55
  | "new-transaction" // Purple border — isNew
  | "merged-match" // Blue border — cross-source pair

/**
 * Import source type
 */
export type ImportSource = "statement" | "email" | "merged"

/**
 * Email metadata for email-sourced queue items
 */
export interface EmailMetadata {
  subject?: string
  fromName?: string
  fromAddress?: string
  classification?: string
  orderId?: string
  emailDate?: string
}

/**
 * Transaction info from statement
 */
export interface StatementTransaction {
  date: string
  description: string
  amount: number
  currency: string
  sourceFilename?: string
}

/**
 * Matched transaction from database
 */
export interface MatchedTransaction {
  id: string
  date: string
  amount: number
  currency: string
  vendor_name?: string
  description?: string
  payment_method_name?: string
}

/**
 * Email data for merged (cross-source) cards
 */
export interface MergedEmailData {
  date: string
  description: string
  amount: number
  currency: string
  metadata: EmailMetadata
}

/**
 * Cross-currency conversion info for merged cards
 */
export interface CrossCurrencyInfo {
  emailAmount: number
  emailCurrency: string
  statementAmount: number
  statementCurrency: string
  rate: number
  rateDate: string
  percentDiff: number
}

/**
 * Match card data
 */
export interface MatchCardData {
  id: string
  statementTransaction: StatementTransaction
  matchedTransaction?: MatchedTransaction
  confidence: number
  confidenceLevel: ConfidenceLevel
  reasons: string[]
  isNew: boolean
  status: "pending" | "approved" | "rejected" | "imported"
  sourceStatement?: string
  source?: ImportSource
  emailMetadata?: EmailMetadata
  mergedEmailData?: MergedEmailData
  crossCurrencyInfo?: CrossCurrencyInfo
  proposal?: TransactionProposal
  proposalModified?: boolean
}

/**
 * Callback props for match card actions
 */
export interface MatchCardCallbacks {
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
  onLinkManually?: (id: string) => void
  onImport?: (id: string) => void
  onCreateAsNew?: (id: string) => void
  onQuickCreate?: (id: string) => void
  onRefreshProposal?: (id: string) => void
  onSelectionChange?: (id: string, selected: boolean) => void
}

/**
 * Full MatchCard props
 */
export interface MatchCardProps extends MatchCardCallbacks {
  data: MatchCardData
  variant?: MatchCardVariant
  selected?: boolean
  loading?: boolean
  className?: string
}

/**
 * Variant visual configuration
 */
export interface VariantConfig {
  borderColor: string
  bgColor: string
  label: string
  labelColor: string
  dotColor: string
}
