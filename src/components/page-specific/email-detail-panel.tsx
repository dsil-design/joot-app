"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
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
  RefreshCw,
  Eye,
  Copy,
  Check,
  Info,
  AlertTriangle,
  Bot,
  Send,
  Search,
} from "lucide-react"
import type { EmailTransactionRow } from "@/hooks/use-email-transactions"
import { EmailViewerModal } from "./email-viewer-modal"

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
    source_email_transaction_id: string | null
    source_statement_upload_id: string | null
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
    source_email_transaction_id: string | null
    source_statement_upload_id: string | null
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
  onSearchExisting?: (emailId: string) => void
  onProcess?: (emailId: string) => void
  onFeedbackReprocess?: (emailId: string, userHint: string) => void
  isProcessing: boolean
  isProcessingExtraction?: boolean
  isFeedbackProcessing?: boolean
}

export function EmailDetailPanel({
  emailTransaction,
  onLink,
  onCreateNew,
  onSkip,
  onSearchExisting,
  onProcess,
  onFeedbackReprocess,
  isProcessing,
  isProcessingExtraction,
  isFeedbackProcessing,
}: EmailDetailPanelProps) {
  const [matchData, setMatchData] = React.useState<MatchesResponse | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [viewerOpen, setViewerOpen] = React.useState(false)

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
  }, [emailTransaction.id, emailTransaction.email_transaction_id, emailTransaction.status, isUnprocessed])

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

          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewerOpen(true)}
          >
            <Eye className="h-4 w-4 mr-1" />
            View Email
          </Button>

          <CopyableId id={emailTransaction.id} />
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
          {onFeedbackReprocess && (
            <UserHintInput
              emailId={emailTransaction.id}
              onFeedbackReprocess={onFeedbackReprocess}
              isFeedbackProcessing={isFeedbackProcessing}
            />
          )}
        </div>

        <EmailViewerModal
          open={viewerOpen}
          onOpenChange={setViewerOpen}
          emailId={emailTransaction.id}
          subject={emailTransaction.subject}
          fromName={emailTransaction.from_name}
          fromAddress={emailTransaction.from_address}
          emailDate={emailTransaction.email_date}
        />
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
                <span className="flex items-center gap-1.5">
                  <ConfidenceIndicator
                    score={emailTransaction.extraction_confidence}
                    size="sm"
                  />
                  {isAiError(emailTransaction.ai_reasoning) && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0 border-destructive text-destructive">
                      <AlertTriangle className="h-3 w-3 mr-0.5" />
                      AI error
                    </Badge>
                  )}
                </span>
              }
            />
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setViewerOpen(true)}
        >
          <Eye className="h-4 w-4 mr-1" />
          View Email
        </Button>

        {/* Process Again button */}
        {onProcess && !isActioned && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onProcess(emailTransaction.id)}
            disabled={isProcessingExtraction}
            className="text-muted-foreground"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1", isProcessingExtraction && "animate-spin")} />
            {isProcessingExtraction ? "Processing..." : "Process Again"}
          </Button>
        )}

        <CopyableId id={emailTransaction.id} />
      </div>

      {/* Right: Match Suggestions */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {isActioned ? "Linked Transaction" : "Match Suggestions"}
        </h4>

        <AiReasoningCallout emailTransaction={emailTransaction} />

        {onFeedbackReprocess && (
          <UserHintInput
            emailId={emailTransaction.id}
            onFeedbackReprocess={onFeedbackReprocess}
            isFeedbackProcessing={isFeedbackProcessing}
          />
        )}

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
              <div className="flex gap-2 pt-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onCreateNew(emailTransaction.id)}
                  disabled={isProcessing}
                >
                  <PlusCircle className="h-4 w-4 mr-1" />
                  Create New
                </Button>
                {onSearchExisting && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSearchExisting(emailTransaction.id)}
                    disabled={isProcessing}
                  >
                    <Search className="h-4 w-4 mr-1" />
                    Search Existing
                  </Button>
                )}
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
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => onCreateNew(emailTransaction.id)}
                  disabled={isProcessing}
                >
                  <PlusCircle className="h-4 w-4 mr-1" />
                  Create Transaction
                </Button>
                {onSearchExisting && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSearchExisting(emailTransaction.id)}
                    disabled={isProcessing}
                  >
                    <Search className="h-4 w-4 mr-1" />
                    Search Existing
                  </Button>
                )}
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

      <EmailViewerModal
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        emailId={emailTransaction.id}
        subject={emailTransaction.subject}
        fromName={emailTransaction.from_name}
        fromAddress={emailTransaction.from_address}
        emailDate={emailTransaction.email_date}
      />
    </div>
  )
}

function CopyableId({ id }: { id: string }) {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center gap-1.5 pt-2">
      <span className="text-[12px] text-muted-foreground font-mono">{id}</span>
      <button
        onClick={handleCopy}
        className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
        aria-label="Copy email ID"
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </button>
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

function SourceBadges({ transaction }: {
  transaction: {
    source_email_transaction_id: string | null
    source_statement_upload_id: string | null
  }
}) {
  const hasEmail = !!transaction.source_email_transaction_id
  const hasStatement = !!transaction.source_statement_upload_id
  if (!hasEmail && !hasStatement) return null

  return (
    <div className="flex flex-wrap gap-1">
      {hasEmail && (
        <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] px-1.5 py-0">
          Email
        </Badge>
      )}
      {hasStatement && (
        <Badge variant="secondary" className="bg-slate-100 text-slate-800 border border-slate-200 text-[10px] px-1.5 py-0">
          Statement
        </Badge>
      )}
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
      {tx.description && (
        <p className="text-xs text-muted-foreground">{tx.description}</p>
      )}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>{formatAmount(tx.amount, tx.original_currency)}</span>
        <span>{new Date(tx.transaction_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
        {pmName && <span>{pmName}</span>}
      </div>
      <SourceBadges transaction={tx} />
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
    source_email_transaction_id?: string | null
    source_statement_upload_id?: string | null
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
      {transaction.description && (
        <p className="text-xs text-muted-foreground">{transaction.description}</p>
      )}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>{formatAmount(transaction.amount, transaction.original_currency)}</span>
        <span>{new Date(transaction.transaction_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
        {pmName && <span>{pmName}</span>}
      </div>
      <SourceBadges transaction={{
        source_email_transaction_id: transaction.source_email_transaction_id ?? null,
        source_statement_upload_id: transaction.source_statement_upload_id ?? null,
      }} />
      <Button variant="ghost" size="sm" asChild>
        <a href={`/transactions/${transaction.id}`}>
          <ExternalLink className="h-3.5 w-3.5 mr-1" />
          View Transaction
        </a>
      </Button>
    </div>
  )
}

function isAiError(reasoning: string | null | undefined): boolean {
  if (!reasoning) return false
  return (
    reasoning.startsWith("Error:") ||
    reasoning.startsWith("Classification error:") ||
    reasoning.includes("Claude API timeout") ||
    reasoning.includes("AI API key not configured")
  )
}

function AiReasoningCallout({
  emailTransaction,
}: {
  emailTransaction: EmailTransactionRow
}) {
  const reasoning = emailTransaction.ai_reasoning
  if (!reasoning) return null

  const hasError = isAiError(reasoning)
  const hasExtractionData = emailTransaction.amount != null

  // AI error: show destructive alert
  if (hasError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>AI Processing Error</AlertTitle>
        <AlertDescription>{reasoning}</AlertDescription>
      </Alert>
    )
  }

  // No extraction data: show prominent info callout with AI reasoning
  if (!hasExtractionData) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>AI Analysis</AlertTitle>
        <AlertDescription>{reasoning}</AlertDescription>
      </Alert>
    )
  }

  // Has extraction data: show collapsible details
  return (
    <details className="text-xs text-muted-foreground">
      <summary className="cursor-pointer flex items-center gap-1 hover:text-foreground transition-colors">
        <Bot className="h-3.5 w-3.5" />
        AI Analysis
      </summary>
      <p className="mt-1 pl-5">{reasoning}</p>
    </details>
  )
}

function UserHintInput({
  emailId,
  onFeedbackReprocess,
  isFeedbackProcessing,
}: {
  emailId: string
  onFeedbackReprocess: (emailId: string, userHint: string) => void
  isFeedbackProcessing?: boolean
}) {
  const [feedbackOpen, setFeedbackOpen] = React.useState(false)
  const [feedbackText, setFeedbackText] = React.useState("")

  const handleSubmit = () => {
    if (feedbackText.trim()) {
      onFeedbackReprocess(emailId, feedbackText.trim())
      setFeedbackOpen(false)
      setFeedbackText("")
    }
  }

  if (!feedbackOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setFeedbackOpen(true)}
        disabled={isFeedbackProcessing}
        className="h-7 text-xs"
      >
        <Bot className={cn("h-3 w-3 mr-1", isFeedbackProcessing && "animate-spin")} />
        {isFeedbackProcessing ? "Processing..." : "Message AI"}
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        value={feedbackText}
        onChange={(e) => setFeedbackText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && feedbackText.trim()) handleSubmit()
          if (e.key === "Escape") {
            setFeedbackOpen(false)
            setFeedbackText("")
          }
        }}
        placeholder="e.g. this is a bank transfer for THB 500"
        className="h-7 text-xs flex-1"
        autoFocus
        disabled={isFeedbackProcessing}
      />
      <Button
        variant="outline"
        size="sm"
        onClick={handleSubmit}
        disabled={!feedbackText.trim() || isFeedbackProcessing}
        className="h-7 px-2"
      >
        {isFeedbackProcessing ? (
          <Bot className="h-3 w-3 animate-spin" />
        ) : (
          <Send className="h-3 w-3" />
        )}
      </Button>
    </div>
  )
}

function formatAmount(amount: number | null, currency: string | null): string {
  if (amount == null) return "—"
  const sym = currency === "THB" ? "฿" : currency === "USD" ? "$" : (currency || "")
  return `${sym}${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
