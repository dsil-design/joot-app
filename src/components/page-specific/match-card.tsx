"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  ConfidenceIndicator,
  getConfidenceLevel,
  type ConfidenceLevel,
} from "@/components/ui/confidence-indicator"
import {
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Link as LinkIcon,
  Plus,
  Calendar,
  DollarSign,
  Store,
  FileText,
  Loader2,
} from "lucide-react"

/**
 * Match card variant type
 */
export type MatchCardVariant =
  | "high-confidence" // Green border - has a high confidence match
  | "waiting-statement" // Blue border - email waiting for statement match
  | "ready-to-import" // Purple border - new transaction ready to import

/**
 * Transaction info from statement
 */
export interface StatementTransaction {
  date: string
  description: string
  amount: number
  currency: string
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
}

/**
 * MatchCard props
 */
export interface MatchCardProps {
  /**
   * Match data
   */
  data: MatchCardData

  /**
   * Card variant (auto-detected if not provided)
   */
  variant?: MatchCardVariant

  /**
   * Whether the card is selected (for batch operations)
   */
  selected?: boolean

  /**
   * Whether actions are loading
   */
  loading?: boolean

  /**
   * Callback when approve is clicked
   */
  onApprove?: (id: string) => void

  /**
   * Callback when reject is clicked
   */
  onReject?: (id: string) => void

  /**
   * Callback when link manually is clicked
   */
  onLinkManually?: (id: string) => void

  /**
   * Callback when import is clicked
   */
  onImport?: (id: string) => void

  /**
   * Callback when selection changes
   */
  onSelectionChange?: (id: string, selected: boolean) => void

  /**
   * Additional class name
   */
  className?: string
}

/**
 * Get card variant from data
 */
function getVariant(data: MatchCardData): MatchCardVariant {
  if (data.isNew) {
    return "ready-to-import"
  }
  if (data.confidenceLevel === "high") {
    return "high-confidence"
  }
  return "waiting-statement"
}

/**
 * Variant configuration
 */
const variantConfig: Record<
  MatchCardVariant,
  {
    borderColor: string
    bgColor: string
    label: string
    labelColor: string
  }
> = {
  "high-confidence": {
    borderColor: "border-green-400",
    bgColor: "bg-green-50",
    label: "High Confidence Match",
    labelColor: "text-green-700",
  },
  "waiting-statement": {
    borderColor: "border-blue-400",
    bgColor: "bg-blue-50",
    label: "Waiting for Statement",
    labelColor: "text-blue-700",
  },
  "ready-to-import": {
    borderColor: "border-purple-400",
    bgColor: "bg-purple-50",
    label: "Ready to Import",
    labelColor: "text-purple-700",
  },
}

/**
 * Format currency amount
 */
function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount))
}

/**
 * Format date
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  } catch {
    return dateString
  }
}

/**
 * MatchCard Component
 *
 * Displays a match suggestion with three visual variants:
 * 1. HIGH CONFIDENCE MATCH - Green border, approve/reject buttons
 * 2. WAITING FOR STATEMENT - Blue border, "link manually" option
 * 3. READY TO IMPORT - Purple border, "approve & import" button
 */
export function MatchCard({
  data,
  variant: providedVariant,
  selected = false,
  loading = false,
  onApprove,
  onReject,
  onLinkManually,
  onImport,
  onSelectionChange,
  className,
}: MatchCardProps) {
  const [expanded, setExpanded] = React.useState(false)
  const variant = providedVariant || getVariant(data)
  const config = variantConfig[variant]

  const isApproved = data.status === "approved" || data.status === "imported"
  const isRejected = data.status === "rejected"
  const isPending = data.status === "pending"

  return (
    <Card
      className={cn(
        "transition-all duration-200 border-2",
        config.borderColor,
        selected && "ring-2 ring-primary ring-offset-2",
        isApproved && "opacity-60 border-green-200 bg-green-50/50",
        isRejected && "opacity-60 border-gray-200 bg-gray-50/50",
        className
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          {/* Left: Transaction info */}
          <div className="flex-1 min-w-0 space-y-1">
            {/* Status badge */}
            <div className="flex items-center gap-2 mb-2">
              <span
                className={cn(
                  "text-xs font-medium px-2 py-0.5 rounded-full",
                  config.bgColor,
                  config.labelColor
                )}
              >
                {isApproved
                  ? "Approved"
                  : isRejected
                    ? "Rejected"
                    : config.label}
              </span>
            </div>

            {/* Description */}
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <p className="text-sm font-medium truncate">
                {data.statementTransaction.description}
              </p>
            </div>

            {/* Amount and Date */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5" />
                {formatAmount(
                  data.statementTransaction.amount,
                  data.statementTransaction.currency
                )}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(data.statementTransaction.date)}
              </span>
            </div>
          </div>

          {/* Right: Confidence indicator and checkbox */}
          <div className="flex items-center gap-3">
            {!data.isNew && (
              <ConfidenceIndicator
                score={data.confidence}
                size="sm"
                showProgressBar={true}
                showPercentage={true}
                showBadge={false}
              />
            )}

            {/* Selection checkbox */}
            {onSelectionChange && isPending && (
              <input
                type="checkbox"
                checked={selected}
                onChange={(e) => onSelectionChange(data.id, e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
                aria-label="Select for batch action"
              />
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="py-2">
        {/* Matched transaction info (if exists) */}
        {data.matchedTransaction && (
          <div className="bg-muted/50 rounded-lg p-3 mb-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Matched to existing transaction:
            </p>
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {data.matchedTransaction.vendor_name || "Unknown vendor"}
              </span>
              <span className="text-sm text-muted-foreground">
                {formatAmount(
                  data.matchedTransaction.amount,
                  data.matchedTransaction.currency
                )}
              </span>
              <span className="text-sm text-muted-foreground">
                {formatDate(data.matchedTransaction.date)}
              </span>
            </div>
          </div>
        )}

        {/* Expandable details */}
        {expanded && (
          <div className="space-y-3 pt-2 border-t">
            {/* Match reasons */}
            {data.reasons.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Match reasons:
                </p>
                <ul className="text-xs text-muted-foreground space-y-0.5">
                  {data.reasons.map((reason, index) => (
                    <li key={index} className="flex items-center gap-1">
                      <span className="text-green-500">✓</span>
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Confidence breakdown */}
            {!data.isNew && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Confidence breakdown:
                </p>
                <ConfidenceIndicator
                  score={data.confidence}
                  size="md"
                  showProgressBar={true}
                  showPercentage={true}
                  showBadge={true}
                  layout="horizontal"
                />
              </div>
            )}
          </div>
        )}

        {/* Expand/collapse button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-2 w-full justify-center"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              Show more
            </>
          )}
        </button>
      </CardContent>

      <CardFooter className="pt-2 gap-2 flex-wrap">
        {/* Actions based on variant and status */}
        {isPending && (
          <>
            {/* High confidence match - Approve/Reject */}
            {variant === "high-confidence" && (
              <>
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => onApprove?.(data.id)}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Approve Match
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onReject?.(data.id)}
                  disabled={loading}
                >
                  <X className="h-4 w-4" />
                  Reject
                </Button>
              </>
            )}

            {/* Waiting for statement - Link manually */}
            {variant === "waiting-statement" && (
              <>
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => onLinkManually?.(data.id)}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LinkIcon className="h-4 w-4" />
                  )}
                  Link Manually
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onApprove?.(data.id)}
                  disabled={loading}
                >
                  <Check className="h-4 w-4" />
                  Approve Anyway
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onReject?.(data.id)}
                  disabled={loading}
                >
                  <X className="h-4 w-4" />
                  Skip
                </Button>
              </>
            )}

            {/* Ready to import - Import button */}
            {variant === "ready-to-import" && (
              <>
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => onImport?.(data.id)}
                  disabled={loading}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Import as New
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onLinkManually?.(data.id)}
                  disabled={loading}
                >
                  <LinkIcon className="h-4 w-4" />
                  Link to Existing
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onReject?.(data.id)}
                  disabled={loading}
                >
                  <X className="h-4 w-4" />
                  Skip
                </Button>
              </>
            )}
          </>
        )}

        {/* Approved state */}
        {isApproved && (
          <span className="flex items-center gap-1 text-sm text-green-600">
            <Check className="h-4 w-4" />
            {data.status === "imported" ? "Imported" : "Approved"}
          </span>
        )}

        {/* Rejected state */}
        {isRejected && (
          <span className="flex items-center gap-1 text-sm text-gray-500">
            <X className="h-4 w-4" />
            Skipped
          </span>
        )}
      </CardFooter>
    </Card>
  )
}

/**
 * MatchCardSkeleton - Loading state
 */
export function MatchCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("animate-pulse", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="h-5 w-24 bg-muted rounded" />
            <div className="h-4 w-full bg-muted rounded" />
            <div className="h-3 w-48 bg-muted rounded" />
          </div>
          <div className="h-6 w-24 bg-muted rounded" />
        </div>
      </CardHeader>
      <CardContent className="py-2">
        <div className="h-16 w-full bg-muted rounded" />
      </CardContent>
      <CardFooter className="pt-2 gap-2">
        <div className="h-8 w-24 bg-muted rounded" />
        <div className="h-8 w-20 bg-muted rounded" />
      </CardFooter>
    </Card>
  )
}

export { getVariant, getConfidenceLevel }
