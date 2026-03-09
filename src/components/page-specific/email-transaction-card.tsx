"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Bot, ChevronDown, ChevronRight, Eye, RefreshCw, Send, Zap } from "lucide-react"
import type { EmailTransactionRow } from "@/hooks/use-email-transactions"
import { EmailViewerModal } from "./email-viewer-modal"
import { getParserTag } from "@/lib/utils/parser-tags"

interface EmailTransactionCardProps {
  data: EmailTransactionRow
  isExpanded: boolean
  isSelected: boolean
  onToggleExpand: () => void
  onToggleSelect: (selected: boolean) => void
  onProcess?: (emailId: string) => void
  onFeedbackReprocess?: (emailId: string, userHint: string) => void
  isProcessingExtraction?: boolean
  isFeedbackProcessing?: boolean
  children?: React.ReactNode
}

/**
 * Status badge color mapping
 */
function getStatusBadge(status: string) {
  switch (status) {
    case "unprocessed":
      return { label: "Unprocessed", className: "bg-slate-100 text-slate-600 border-slate-200" }
    case "pending_review":
      return { label: "Pending", className: "bg-amber-100 text-amber-800 border-amber-200" }
    case "matched":
      return { label: "Linked", className: "bg-green-100 text-green-800 border-green-200" }
    case "waiting_for_statement":
      return { label: "Waiting", className: "bg-blue-100 text-blue-800 border-blue-200" }
    case "ready_to_import":
      return { label: "Ready to Import", className: "bg-purple-100 text-purple-800 border-purple-200" }
    case "imported":
      return { label: "Imported", className: "bg-green-50 text-green-700 border-green-200" }
    case "skipped":
      return { label: "Skipped", className: "bg-gray-100 text-gray-600 border-gray-200" }
    default:
      return { label: status, className: "bg-gray-100 text-gray-600 border-gray-200" }
  }
}

/**
 * Format amount with currency symbol
 */
function formatAmount(amount: number | null, currency: string | null): string {
  if (amount == null) return "—"
  const sym = currency === "THB" ? "฿" : currency === "USD" ? "$" : (currency || "")
  return `${sym}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * Format date as compact string
 */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return ""
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

/**
 * Determine if email has extracted transaction data
 */
function hasExtractedData(data: EmailTransactionRow): boolean {
  return data.amount != null || data.transaction_date != null
}

export function EmailTransactionCard({
  data,
  isExpanded,
  isSelected,
  onToggleExpand,
  onToggleSelect,
  onProcess,
  onFeedbackReprocess,
  isProcessingExtraction,
  isFeedbackProcessing,
  children,
}: EmailTransactionCardProps) {
  const [viewerOpen, setViewerOpen] = React.useState(false)
  const [feedbackOpen, setFeedbackOpen] = React.useState(false)
  const [feedbackText, setFeedbackText] = React.useState("")
  const statusBadge = getStatusBadge(data.status)
  const parserTag = getParserTag(data.from_address)
  const vendorName = data.vendor_name_raw || data.from_name || "Unknown sender"
  const extracted = hasExtractedData(data)
  const isUnprocessed = !data.is_processed

  // Use transaction_date if extracted, fall back to email_date
  const displayDate = data.transaction_date || data.email_date

  return (
    <div
      className={cn(
        "bg-card rounded-lg border transition-colors",
        isExpanded && "ring-1 ring-primary/20",
        isSelected && "border-primary/50 bg-primary/5"
      )}
    >
      {/* Main row */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-accent/30 transition-colors"
        onClick={onToggleExpand}
      >
        {/* Checkbox */}
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onToggleSelect(checked === true)}
          />
        </div>

        {/* Vendor/Subject */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{vendorName}</span>
            {parserTag && (
              <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0", parserTag.className)}>
                {parserTag.label}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {data.description || data.subject || "No description"}
          </p>
          {data.is_processed && !extracted && data.ai_reasoning && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 min-w-0 mt-0.5">
              <Bot className="h-3 w-3 shrink-0" />
              <span className="truncate">{data.ai_reasoning}</span>
            </p>
          )}
          {data.is_processed && data.ai_classification && onFeedbackReprocess && (
            <div className="mt-0.5 space-y-1">
              {!feedbackOpen ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    setFeedbackOpen(true)
                  }}
                  disabled={isFeedbackProcessing}
                  className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                >
                  {isFeedbackProcessing ? (
                    <Bot className="h-3 w-3 mr-0.5 animate-spin" />
                  ) : (
                    <Bot className="h-3 w-3 mr-0.5" />
                  )}
                  {isFeedbackProcessing ? "Processing..." : "Message AI"}
                </Button>
              ) : (
                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <Input
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && feedbackText.trim()) {
                        onFeedbackReprocess(data.id, feedbackText.trim())
                        setFeedbackOpen(false)
                        setFeedbackText("")
                      }
                      if (e.key === "Escape") {
                        setFeedbackOpen(false)
                        setFeedbackText("")
                      }
                    }}
                    placeholder="e.g. bank transfer for $50"
                    className="h-6 text-xs flex-1"
                    autoFocus
                    disabled={isFeedbackProcessing}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (feedbackText.trim()) {
                        onFeedbackReprocess(data.id, feedbackText.trim())
                        setFeedbackOpen(false)
                        setFeedbackText("")
                      }
                    }}
                    disabled={!feedbackText.trim() || isFeedbackProcessing}
                    className="h-6 px-1.5"
                  >
                    {isFeedbackProcessing ? (
                      <Bot className="h-3 w-3 animate-spin" />
                    ) : (
                      <Send className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Amount + Date / Process button */}
        <div className="text-right shrink-0">
          {isUnprocessed ? (
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              {data.email_date && (
                <p className="text-xs text-muted-foreground">
                  {formatDate(data.email_date)}
                </p>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewerOpen(true)}
                className="h-7 w-7"
                title="View Email"
              >
                <Eye className="h-3.5 w-3.5" />
              </Button>
              {onProcess && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onProcess(data.id)}
                  disabled={isProcessingExtraction}
                  className="h-7 text-xs"
                >
                  <Zap className="h-3 w-3 mr-1" />
                  {isProcessingExtraction ? "Processing..." : "Process"}
                </Button>
              )}
            </div>
          ) : extracted ? (
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <div className="text-right">
                <p className="text-sm font-semibold">
                  {formatAmount(data.amount, data.currency)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(displayDate)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewerOpen(true)}
                className="h-7 w-7"
                title="View Email"
              >
                <Eye className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <div>
                <p className="text-xs text-muted-foreground italic">
                  No data extracted
                </p>
                {data.email_date && (
                  <p className="text-xs text-muted-foreground">
                    {formatDate(data.email_date)}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewerOpen(true)}
                className="h-7 w-7"
                title="View Email"
              >
                <Eye className="h-3.5 w-3.5" />
              </Button>
              {onProcess && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onProcess(data.id)}
                  disabled={isProcessingExtraction}
                  className="h-7 text-xs"
                >
                  <RefreshCw className={cn("h-3 w-3 mr-1", isProcessingExtraction && "animate-spin")} />
                  {isProcessingExtraction ? "Processing..." : "Retry"}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Status */}
        <Badge
          variant="outline"
          className={cn("shrink-0 text-xs", statusBadge.className)}
        >
          {statusBadge.label}
        </Badge>

        {/* Expand chevron */}
        <div className="shrink-0 text-muted-foreground">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </div>
      </div>

      {/* Expanded detail panel */}
      {isExpanded && children && (
        <div className="border-t px-4 py-4">{children}</div>
      )}

      <EmailViewerModal
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        emailId={data.id}
        subject={data.subject}
        fromName={data.from_name}
        fromAddress={data.from_address}
        emailDate={data.email_date}
      />
    </div>
  )
}

/**
 * Skeleton for loading state
 */
export function EmailTransactionCardSkeleton() {
  return (
    <div className="bg-card rounded-lg border px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="h-4 w-4 rounded bg-muted animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-48 rounded bg-muted animate-pulse" />
          <div className="h-3 w-32 rounded bg-muted animate-pulse" />
        </div>
        <div className="h-4 w-16 rounded bg-muted animate-pulse" />
        <div className="h-5 w-16 rounded bg-muted animate-pulse" />
      </div>
    </div>
  )
}
