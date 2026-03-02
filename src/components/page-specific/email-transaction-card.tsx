"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { ConfidenceIndicatorBadgeOnly } from "@/components/ui/confidence-indicator"
import { ChevronDown, ChevronRight } from "lucide-react"
import type { EmailTransactionRow } from "@/hooks/use-email-transactions"

interface EmailTransactionCardProps {
  data: EmailTransactionRow
  isExpanded: boolean
  isSelected: boolean
  onToggleExpand: () => void
  onToggleSelect: (selected: boolean) => void
  children?: React.ReactNode
}

/**
 * Status badge color mapping
 */
function getStatusBadge(status: string) {
  switch (status) {
    case "pending_review":
      return { label: "Pending", className: "bg-amber-100 text-amber-800 border-amber-200" }
    case "matched":
      return { label: "Matched", className: "bg-green-100 text-green-800 border-green-200" }
    case "waiting_for_statement":
      return { label: "Waiting", className: "bg-blue-100 text-blue-800 border-blue-200" }
    case "ready_to_import":
      return { label: "Ready", className: "bg-purple-100 text-purple-800 border-purple-200" }
    case "imported":
      return { label: "Imported", className: "bg-green-50 text-green-700 border-green-200" }
    case "skipped":
      return { label: "Skipped", className: "bg-gray-100 text-gray-600 border-gray-200" }
    default:
      return { label: status, className: "bg-gray-100 text-gray-600 border-gray-200" }
  }
}

/**
 * Parser/sender tag color based on from_address
 */
function getParserTag(fromAddress: string | null): { label: string; className: string } | null {
  if (!fromAddress) return null
  const addr = fromAddress.toLowerCase()

  if (addr.includes("grab")) return { label: "Grab", className: "bg-orange-100 text-orange-700" }
  if (addr.includes("bolt")) return { label: "Bolt", className: "bg-green-100 text-green-700" }
  if (addr.includes("lazada")) return { label: "Lazada", className: "bg-blue-100 text-blue-700" }
  if (addr.includes("shopee")) return { label: "Shopee", className: "bg-red-100 text-red-700" }
  if (addr.includes("foodpanda")) return { label: "FoodPanda", className: "bg-pink-100 text-pink-700" }
  if (addr.includes("agoda")) return { label: "Agoda", className: "bg-indigo-100 text-indigo-700" }
  if (addr.includes("line")) return { label: "LINE", className: "bg-emerald-100 text-emerald-700" }
  return null
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
  children,
}: EmailTransactionCardProps) {
  const statusBadge = getStatusBadge(data.status)
  const parserTag = getParserTag(data.from_address)
  const vendorName = data.vendors?.name || data.vendor_name_raw || data.from_name || "Unknown sender"
  const extracted = hasExtractedData(data)

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
        </div>

        {/* Amount + Date */}
        <div className="text-right shrink-0">
          {extracted ? (
            <>
              <p className="text-sm font-semibold">
                {formatAmount(data.amount, data.currency)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDate(displayDate)}
              </p>
            </>
          ) : (
            <>
              <p className="text-xs text-muted-foreground italic">
                No data extracted
              </p>
              {data.email_date && (
                <p className="text-xs text-muted-foreground">
                  {formatDate(data.email_date)}
                </p>
              )}
            </>
          )}
        </div>

        {/* Confidence */}
        <div className="shrink-0 hidden sm:block">
          {data.extraction_confidence != null && data.extraction_confidence > 0 ? (
            <ConfidenceIndicatorBadgeOnly
              score={data.extraction_confidence}
              size="sm"
              showPercentage={false}
            />
          ) : null}
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
