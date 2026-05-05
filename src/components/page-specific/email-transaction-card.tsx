"use client"

import * as React from "react"
import { cn, formatAmountOrDash } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Bot, ChevronDown, ChevronRight, Eye, RefreshCw, SkipForward, Zap } from "lucide-react"
import type { EmailTransactionRow } from "@/hooks/use-email-transactions"
import { EmailViewerModal } from "./email-viewer-modal"
import { LinkedTransactionPill } from "./linked-transaction-pill"
import { LinkedTransactionPeekModal } from "./linked-transaction-peek-modal"
import { getParserTag } from "@/lib/utils/parser-tags"

interface EmailTransactionCardProps {
  data: EmailTransactionRow
  isExpanded: boolean
  isSelected: boolean
  onToggleExpand: () => void
  onToggleSelect: (selected: boolean) => void
  onProcess?: (emailId: string) => void
  onSkip?: (emailId: string) => void
  isProcessingExtraction?: boolean
  isSkipping?: boolean
  children?: React.ReactNode
}

/**
 * Status badge color mapping
 */
function getStatusBadge(status: string) {
  switch (status) {
    case "unprocessed":
      return { label: "Unprocessed", className: "bg-muted text-muted-foreground border-border" }
    case "pending_review":
      return { label: "Pending", className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30" }
    case "matched":
      return { label: "Linked", className: "bg-green-100 text-green-700 border-green-200 dark:bg-green-500/15 dark:text-green-300 dark:border-green-500/30" }
    case "waiting_for_statement":
      return { label: "Waiting (Statement)", className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30" }
    case "waiting_for_email":
      return { label: "Waiting (Email)", className: "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30" }
    case "waiting_for_slip":
      return { label: "Waiting (Slip)", className: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/30" }
    case "ready_to_import":
      return { label: "Ready to Import", className: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/30" }
    case "imported":
      return { label: "Imported", className: "bg-green-100 text-green-700 border-green-200 dark:bg-green-500/15 dark:text-green-300 dark:border-green-500/30" }
    case "skipped":
      return { label: "Skipped", className: "bg-muted text-muted-foreground border-border" }
    default:
      return { label: status, className: "bg-muted text-muted-foreground border-border" }
  }
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
  onSkip,
  isProcessingExtraction,
  isSkipping,
  children,
}: EmailTransactionCardProps) {
  const [viewerOpen, setViewerOpen] = React.useState(false)
  const [peekOpen, setPeekOpen] = React.useState(false)
  const statusBadge = getStatusBadge(data.status)
  const parserTag = getParserTag(data.from_address)
  const vendorName = data.vendor_name_raw || data.from_name || "Unknown sender"
  const extracted = hasExtractedData(data)
  const isUnprocessed = !data.is_processed

  // Use transaction_date if extracted, fall back to email_date
  const displayDate = data.transaction_date || data.email_date

  // The pill renders only when the row is linked AND the linked transaction
  // still exists. matched_transaction_id may point to a deleted row (FK is
  // ON DELETE SET NULL); the list endpoint returns linked_transaction: null
  // in that case, which we treat the same as no link for the row affordance.
  const isLinked = data.status === "matched" || data.status === "imported"
  const linked = data.linked_transaction ?? null
  const showLinkedPill = isLinked && !!linked
  const lowConfidence = data.match_confidence != null && data.match_confidence < 70

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
                className="h-9 w-9 sm:h-7 sm:w-7"
                title="View Email"
              >
                <Eye className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              </Button>
              {onSkip && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSkip(data.id)}
                  disabled={isSkipping || isProcessingExtraction}
                  className="h-9 sm:h-7 text-xs text-muted-foreground"
                  title="Skip this email"
                >
                  <SkipForward className="h-3 w-3 mr-1" />
                  Skip
                </Button>
              )}
              {onProcess && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onProcess(data.id)}
                  disabled={isProcessingExtraction || isSkipping}
                  className="h-9 sm:h-7 text-xs"
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
                  {formatAmountOrDash(data.amount, data.currency)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(displayDate)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewerOpen(true)}
                className="h-9 w-9 sm:h-7 sm:w-7"
                title="View Email"
              >
                <Eye className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
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
                className="h-9 w-9 sm:h-7 sm:w-7"
                title="View Email"
              >
                <Eye className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              </Button>
              {onProcess && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onProcess(data.id)}
                  disabled={isProcessingExtraction}
                  className="h-9 sm:h-7 text-xs"
                >
                  <RefreshCw className={cn("h-3 w-3 mr-1", isProcessingExtraction && "animate-spin")} />
                  {isProcessingExtraction ? "Processing..." : "Retry"}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Status — for linked rows the pill takes the badge slot and routes
            to the linked transaction; other statuses keep their text badge. */}
        {showLinkedPill && linked ? (
          <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
            <LinkedTransactionPill
              linked={linked}
              lowConfidence={lowConfidence}
              onClick={() => setPeekOpen(true)}
            />
          </div>
        ) : (
          <Badge
            variant="outline"
            className={cn("shrink-0 text-xs", statusBadge.className)}
          >
            {statusBadge.label}
          </Badge>
        )}

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

      {linked && (
        <LinkedTransactionPeekModal
          open={peekOpen}
          onOpenChange={setPeekOpen}
          transactionId={linked.id}
          matchMethod={data.match_method}
          matchConfidence={data.match_confidence}
          isImported={data.status === "imported"}
        />
      )}
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
