"use client"

import * as React from "react"
import { TransactionDetailRow } from "@/components/ui/transaction-detail-row"
import { cleanStatementDescription } from "@/lib/utils/statement-description"
import {
  formatMatchAmount,
  formatMatchDate,
  computeMatchDeltas,
} from "@/lib/utils/match-formatting"
import {
  Calendar,
  DollarSign,
  Store,
  FileText,
  CreditCard,
  ArrowLeftRight,
  ExternalLink,
} from "lucide-react"
import Link from "next/link"
import { parseImportId } from "@/lib/utils/import-id"
import type { MatchCardData } from "./types"

/**
 * Build a link to the source page (statement or email) from the queue item ID.
 */
function getSourceLink(id: string): string | null {
  const parsed = parseImportId(id)
  if (!parsed) return null
  if (parsed.type === "statement") {
    return `/imports/statements/${parsed.statementId}/results`
  }
  if (parsed.type === "email") {
    return `/imports/emails/${parsed.emailId}`
  }
  if (parsed.type === "merged") {
    // Default to statement for merged items
    return `/imports/statements/${parsed.statementId}/results`
  }
  return null
}

function getMergedEmailLink(id: string): string | null {
  const parsed = parseImportId(id)
  if (parsed?.type === "merged") {
    return `/imports/emails/${parsed.emailId}`
  }
  return null
}

function SourceLabel({ label, href }: { label: string; href: string | null }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
      {label}
      {href && (
        <Link
          href={href}
          className="inline-flex items-center text-muted-foreground/60 hover:text-foreground transition-colors"
          title={`View ${label.toLowerCase()}`}
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="h-3 w-3" />
        </Link>
      )}
    </p>
  )
}

interface MatchCardPanelsProps {
  data: MatchCardData
}

/**
 * Two-panel comparison layout:
 * Left = statement data, Right = matched transaction (or empty placeholder)
 */
export function MatchCardPanels({ data }: MatchCardPanelsProps) {
  // Merged card layout — email + statement side-by-side with conversion bar
  if (data.source === "merged" && data.mergedEmailData && data.crossCurrencyInfo) {
    const cx = data.crossCurrencyInfo
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Left panel: Email data */}
          <div className="space-y-1.5">
            <SourceLabel label="From Email" href={getMergedEmailLink(data.id)} />
            <TransactionDetailRow icon={<Calendar className="h-3.5 w-3.5" />}>
              <span>{formatMatchDate(data.mergedEmailData.date)}</span>
            </TransactionDetailRow>
            <TransactionDetailRow icon={<FileText className="h-3.5 w-3.5" />}>
              <span
                className="font-medium truncate"
                title={data.mergedEmailData.description}
              >
                {data.mergedEmailData.description}
              </span>
            </TransactionDetailRow>
            <TransactionDetailRow icon={<DollarSign className="h-3.5 w-3.5" />}>
              <span className="font-medium">
                {formatMatchAmount(
                  data.mergedEmailData.amount,
                  data.mergedEmailData.currency
                )}
              </span>
            </TransactionDetailRow>
          </div>

          {/* Right panel: Statement data */}
          <div className="space-y-1.5 md:border-l md:pl-3">
            <SourceLabel label="From Statement" href={getSourceLink(data.id)} />
            <TransactionDetailRow icon={<Calendar className="h-3.5 w-3.5" />}>
              <span>{formatMatchDate(data.statementTransaction.date)}</span>
            </TransactionDetailRow>
            <TransactionDetailRow icon={<FileText className="h-3.5 w-3.5" />}>
              <span
                className="font-medium truncate"
                title={data.statementTransaction.description}
              >
                {cleanStatementDescription(data.statementTransaction.description)}
              </span>
            </TransactionDetailRow>
            <TransactionDetailRow icon={<DollarSign className="h-3.5 w-3.5" />}>
              <span className="font-medium">
                {formatMatchAmount(
                  data.statementTransaction.amount,
                  data.statementTransaction.currency
                )}
              </span>
            </TransactionDetailRow>
          </div>
        </div>

        {/* Cross-currency conversion info bar */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-blue-50 rounded px-3 py-1.5">
          <ArrowLeftRight className="h-3.5 w-3.5 text-blue-500 shrink-0" />
          <span>
            {cx.emailCurrency} {cx.emailAmount.toFixed(2)} ≈ {cx.statementCurrency} {cx.statementAmount.toFixed(2)}, rate: {cx.rate.toFixed(4)}, {cx.percentDiff.toFixed(1)}% diff
          </span>
        </div>
      </div>
    )
  }

  const isEmail = data.source === "email"
  const displayDescription = isEmail
    ? data.statementTransaction.description
    : cleanStatementDescription(data.statementTransaction.description)

  const deltas =
    data.matchedTransaction && !data.isNew
      ? computeMatchDeltas(
          data.statementTransaction.date,
          data.statementTransaction.amount,
          data.statementTransaction.currency,
          data.matchedTransaction.date,
          data.matchedTransaction.amount
        )
      : null

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {/* Left panel: Statement data */}
      <div className="space-y-1.5">
        <SourceLabel
          label={isEmail ? "From Email" : "From Statement"}
          href={getSourceLink(data.id)}
        />
        <TransactionDetailRow icon={<Calendar className="h-3.5 w-3.5" />}>
          <span>{formatMatchDate(data.statementTransaction.date)}</span>
        </TransactionDetailRow>
        <TransactionDetailRow icon={<FileText className="h-3.5 w-3.5" />}>
          <span
            className="font-medium truncate"
            title={data.statementTransaction.description}
          >
            {displayDescription}
          </span>
        </TransactionDetailRow>
        <TransactionDetailRow icon={<DollarSign className="h-3.5 w-3.5" />}>
          <span className="font-medium">
            {formatMatchAmount(
              data.statementTransaction.amount,
              data.statementTransaction.currency
            )}
          </span>
        </TransactionDetailRow>
      </div>

      {/* Right panel: Matched transaction data */}
      {data.matchedTransaction && !data.isNew && (
        <div className="space-y-1.5 md:border-l md:pl-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Matched Joot Transaction
          </p>
          <TransactionDetailRow icon={<Calendar className="h-3.5 w-3.5" />}>
            <span>{formatMatchDate(data.matchedTransaction.date)}</span>
            {deltas?.dateDelta && (
              <span className="text-xs text-muted-foreground">
                {deltas.dateDelta}
              </span>
            )}
          </TransactionDetailRow>
          <TransactionDetailRow icon={<Store className="h-3.5 w-3.5" />}>
            <span className="font-medium truncate">
              {data.matchedTransaction.vendor_name || "Unknown vendor"}
            </span>
          </TransactionDetailRow>
          {data.matchedTransaction.description && (
            <TransactionDetailRow icon={<FileText className="h-3.5 w-3.5" />}>
              <span className="font-medium truncate">
                {data.matchedTransaction.description}
              </span>
            </TransactionDetailRow>
          )}
          <TransactionDetailRow icon={<DollarSign className="h-3.5 w-3.5" />}>
            <span className="font-medium">
              {formatMatchAmount(
                data.matchedTransaction.amount,
                data.matchedTransaction.currency
              )}
            </span>
            {deltas?.amountDelta && (
              <span className="text-xs text-muted-foreground">
                {deltas.amountDelta}
              </span>
            )}
          </TransactionDetailRow>
          {data.matchedTransaction.payment_method_name && (
            <TransactionDetailRow
              icon={<CreditCard className="h-3.5 w-3.5" />}
              className="text-muted-foreground"
            >
              <span>{data.matchedTransaction.payment_method_name}</span>
            </TransactionDetailRow>
          )}
        </div>
      )}

      {/* Right panel placeholder for new/unmatched transactions */}
      {data.isNew && data.source !== "merged" && (
        <div className="space-y-1.5 md:border-l md:pl-3 flex items-center justify-center">
          <p className="text-sm text-muted-foreground italic">
            No matching transaction found
          </p>
        </div>
      )}
    </div>
  )
}
