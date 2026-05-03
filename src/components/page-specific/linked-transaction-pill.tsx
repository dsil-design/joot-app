"use client"

import * as React from "react"
import { Link2 } from "lucide-react"
import { cn, formatAmountOrDash } from "@/lib/utils"
import type { LinkedTransactionSummary } from "@/hooks/use-email-transactions"

interface LinkedTransactionPillProps {
  linked: LinkedTransactionSummary
  /**
   * When true, the linked transaction is reachable but the match is below the
   * usual confidence threshold. Surfaces an amber border instead of green.
   */
  lowConfidence?: boolean
  onClick: () => void
  className?: string
}

/**
 * Compact button shown on a linked email row in the Email Hub. Mirrors the
 * EmailSourceCard pattern (which lives on the transaction page) so the inverse
 * pairing reads as a sibling.
 */
export function LinkedTransactionPill({
  linked,
  lowConfidence,
  onClick,
  className,
}: LinkedTransactionPillProps) {
  const vendor = linked.vendor_name || linked.description || "Linked transaction"
  const amount = formatAmountOrDash(linked.amount, linked.original_currency)

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors",
        "max-w-[180px] sm:max-w-[220px]",
        lowConfidence
          ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100 hover:bg-amber-100 dark:hover:bg-amber-950/50"
          : "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100 hover:bg-green-100 dark:hover:bg-green-950/50",
        className
      )}
      title={`${vendor} — ${amount}`}
    >
      <Link2 className="h-3 w-3 shrink-0" />
      <span className="truncate font-medium">{vendor}</span>
      <span className="shrink-0 opacity-80">·</span>
      <span className="shrink-0 tabular-nums">{amount}</span>
    </button>
  )
}
