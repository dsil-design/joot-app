"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ConfidenceIndicator } from "@/components/ui/confidence-indicator"
import { cn } from "@/lib/utils"
import {
  Link2,
  PlusCircle,
  SkipForward,
  ExternalLink,
  Calendar,
  DollarSign,
  Tag,
  Mail,
  Zap,
} from "lucide-react"
import type { EmailTransactionRow } from "@/hooks/use-email-transactions"

interface MatchSuggestion {
  targetId: string
  score: number
  confidence: "HIGH" | "MEDIUM" | "LOW"
  isMatch: boolean
  reasons: string[]
  transaction: {
    id: string
    description: string | null
    amount: number
    original_currency: string
    transaction_date: string
    vendors: { name: string } | null
    payment_methods: { name: string } | null
  } | null
}

interface MatchesResponse {
  email_transaction: EmailTransactionRow
  suggestions: MatchSuggestion[]
  linked_transaction?: {
    id: string
    description: string | null
    amount: number
    original_currency: string
    transaction_date: string
    vendors: { name: string } | null
    payment_methods: { name: string } | null
  } | null
  stats: {
    totalCandidates: number
    matchingCandidates: number
    highConfidenceCount: number
    avgScore: number
  }
  status?: string
  reason?: string
}

interface EmailDetailPanelProps {
  emailTransaction: EmailTransactionRow
  onLink: (emailId: string, txId: string) => void
  onCreateNew: (emailId: string) => void
  onSkip: (emailId: string) => void
  onProcess?: (emailId: string) => void
  isProcessing: boolean
  isProcessingExtraction?: boolean
}

export function EmailDetailPanel({
  emailTransaction,
  onLink,
  onCreateNew,
  onSkip,
  onProcess,
  isProcessing,
  isProcessingExtraction,
}: EmailDetailPanelProps) {
  const [matchData, setMatchData] = React.useState<MatchesResponse | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const isUnprocessed = !emailTransaction.is_processed

  // Fetch match suggestions on mount (skip for unprocessed emails)
  React.useEffect(() => {
    if (isUnprocessed) {
      setIsLoading(false)
      return
    }

    let cancelled = false

    async function fetchMatches() {
      setIsLoading(true)
      setError(null)

      try {
        // Use email_transaction_id for the matches API (it needs the email_transactions row ID)
        const etId = emailTransaction.email_transaction_id || emailTransaction.id
        const response = await fetch(`/api/emails/transactions/${etId}/matches`)
        if (!response.ok) throw new Error("Failed to fetch matches")

        const data = await response.json()
        if (!cancelled) setMatchData(data)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchMatches()
    return () => { cancelled = true }
  }, [emailTransaction.id, emailTransaction.email_transaction_id, isUnprocessed])

  const isActioned = ["matched", "imported", "skipped"].includes(emailTransaction.status)

  // Unprocessed email: show metadata + Extract Data button
  if (isUnprocessed) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Email Metadata */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Email Details
          </h4>
          <div className="space-y-3">
            <DetailRow
              icon={<Mail className="h-4 w-4" />}
              label="From"
              value={emailTransaction.from_name || emailTransaction.from_address || "Unknown"}
            />
            <DetailRow
              icon={<Tag className="h-4 w-4" />}
              label="Subject"
              value={emailTransaction.subject || "No subject"}
            />
            <DetailRow
              icon={<Calendar className="h-4 w-4" />}
              label="Received"
              value={emailTransaction.email_date
                ? new Date(emailTransaction.email_date).toLocaleDateString("en-US", {
                    year: "numeric", month: "short", day: "numeric",
                  })
                : "—"
              }
            />
            {emailTransaction.from_address && (
              <DetailRow
                label="Address"
                value={emailTransaction.from_address}
              />
            )}
          </div>
        </div>

        {/* Right: Extract Data action */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Not Yet Processed
          </h4>
          <p className="text-sm text-muted-foreground">
            This email hasn&apos;t been analyzed for transaction data yet. Process it to extract amounts, dates, and vendor info.
          </p>
          {onProcess && (
            <Button
              onClick={() => onProcess(emailTransaction.id)}
              disabled={isProcessingExtraction}
              size="sm"
            >
              <Zap className="h-4 w-4 mr-1" />
              {isProcessingExtraction ? "Extracting..." : "Extract Data"}
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Left: Email Data */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Email Details
        </h4>

        <div className="space-y-3">
          <DetailRow
            icon={<Mail className="h-4 w-4" />}
            label="From"
            value={emailTransaction.from_name || emailTransaction.from_address || "Unknown"}
          />
          <DetailRow
            icon={<Tag className="h-4 w-4" />}
            label="Subject"
            value={emailTransaction.subject || "No subject"}
          />
          <DetailRow
            icon={<DollarSign className="h-4 w-4" />}
            label="Amount"
            value={formatAmount(emailTransaction.amount, emailTransaction.currency)}
          />
          <DetailRow
            icon={<Calendar className="h-4 w-4" />}
            label="Txn Date"
            value={emailTransaction.transaction_date
              ? new Date(emailTransaction.transaction_date).toLocaleDateString("en-US", {
                  year: "numeric", month: "short", day: "numeric",
                })
              : "—"
            }
          />
          <DetailRow
            icon={<Calendar className="h-4 w-4" />}
            label="Received"
            value={emailTransaction.email_date
              ? new Date(emailTransaction.email_date).toLocaleDateString("en-US", {
                  year: "numeric", month: "short", day: "numeric",
                })
              : "—"
            }
          />
          {emailTransaction.vendor_name_raw && (
            <DetailRow
              label="Vendor (raw)"
              value={emailTransaction.vendor_name_raw}
            />
          )}
          {emailTransaction.order_id && (
            <DetailRow label="Order ID" value={emailTransaction.order_id} />
          )}
          {emailTransaction.classification && (
            <DetailRow
              label="Type"
              value={
                <Badge variant="outline" className="text-xs">
                  {emailTransaction.classification.replace(/_/g, " ")}
                </Badge>
              }
            />
          )}
          {emailTransaction.extraction_confidence != null && (
            <DetailRow
              label="Extraction"
              value={
                <ConfidenceIndicator
                  score={emailTransaction.extraction_confidence}
                  size="sm"
                />
              }
            />
          )}
        </div>
      </div>

      {/* Right: Match Suggestions */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {isActioned ? "Linked Transaction" : "Match Suggestions"}
        </h4>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : matchData?.linked_transaction ? (
          // Already linked
          <LinkedTransactionCard transaction={matchData.linked_transaction} />
        ) : matchData?.suggestions && matchData.suggestions.length > 0 ? (
          // Match suggestions
          <div className="space-y-3">
            {matchData.suggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.targetId}
                suggestion={suggestion}
                onLink={() => onLink(emailTransaction.id, suggestion.targetId)}
                disabled={isProcessing || isActioned}
              />
            ))}

            {/* Action buttons */}
            {!isActioned && (
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onCreateNew(emailTransaction.id)}
                  disabled={isProcessing}
                >
                  <PlusCircle className="h-4 w-4 mr-1" />
                  Create New
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSkip(emailTransaction.id)}
                  disabled={isProcessing}
                >
                  <SkipForward className="h-4 w-4 mr-1" />
                  Skip
                </Button>
              </div>
            )}
          </div>
        ) : (
          // No matches
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              No matching transactions found in your records.
            </p>
            {!isActioned && (
              <div className="flex gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => onCreateNew(emailTransaction.id)}
                  disabled={isProcessing}
                >
                  <PlusCircle className="h-4 w-4 mr-1" />
                  Create Transaction
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSkip(emailTransaction.id)}
                  disabled={isProcessing}
                >
                  <SkipForward className="h-4 w-4 mr-1" />
                  Skip
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-2 text-sm">
      {icon && <span className="text-muted-foreground mt-0.5">{icon}</span>}
      <span className="text-muted-foreground shrink-0 w-20">{label}</span>
      <span className="font-medium break-words min-w-0">{value}</span>
    </div>
  )
}

function SuggestionCard({
  suggestion,
  onLink,
  disabled,
}: {
  suggestion: MatchSuggestion
  onLink: () => void
  disabled: boolean
}) {
  const tx = suggestion.transaction
  if (!tx) return null

  const vendorName = (tx.vendors as { name: string } | null)?.name || tx.description || "Unknown"
  const pmName = (tx.payment_methods as { name: string } | null)?.name

  return (
    <div className={cn(
      "border rounded-lg p-3 space-y-2",
      suggestion.confidence === "HIGH" && "border-green-200 bg-green-50/50",
      suggestion.confidence === "MEDIUM" && "border-amber-200 bg-amber-50/50",
      suggestion.confidence === "LOW" && "border-red-200 bg-red-50/50",
    )}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{vendorName}</span>
        <ConfidenceIndicator score={suggestion.score} size="sm" showProgressBar={false} />
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>{formatAmount(tx.amount, tx.original_currency)}</span>
        <span>{new Date(tx.transaction_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
        {pmName && <span>{pmName}</span>}
      </div>
      {suggestion.reasons.length > 0 && (
        <p className="text-xs text-muted-foreground">{suggestion.reasons[0]}</p>
      )}
      <Button
        size="sm"
        variant={suggestion.confidence === "HIGH" ? "default" : "outline"}
        className={suggestion.confidence === "HIGH" ? "bg-green-600 hover:bg-green-700" : ""}
        onClick={onLink}
        disabled={disabled}
      >
        <Link2 className="h-3.5 w-3.5 mr-1" />
        Link
      </Button>
    </div>
  )
}

function LinkedTransactionCard({ transaction }: {
  transaction: {
    id: string
    description: string | null
    amount: number
    original_currency: string
    transaction_date: string
    vendors: { name: string } | null
    payment_methods: { name: string } | null
  }
}) {
  const vendorName = (transaction.vendors as { name: string } | null)?.name || transaction.description || "Unknown"
  const pmName = (transaction.payment_methods as { name: string } | null)?.name

  return (
    <div className="border border-green-200 bg-green-50/50 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{vendorName}</span>
        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200 text-xs">
          Linked
        </Badge>
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>{formatAmount(transaction.amount, transaction.original_currency)}</span>
        <span>{new Date(transaction.transaction_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
        {pmName && <span>{pmName}</span>}
      </div>
      <Button variant="ghost" size="sm" asChild>
        <a href={`/transactions/${transaction.id}`}>
          <ExternalLink className="h-3.5 w-3.5 mr-1" />
          View Transaction
        </a>
      </Button>
    </div>
  )
}

function formatAmount(amount: number | null, currency: string | null): string {
  if (amount == null) return "—"
  const sym = currency === "THB" ? "฿" : currency === "USD" ? "$" : (currency || "")
  return `${sym}${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
