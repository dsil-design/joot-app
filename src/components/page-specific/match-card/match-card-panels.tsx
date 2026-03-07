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
  Eye,
  Zap,
  Tag,
  Receipt,
} from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { parseImportId } from "@/lib/utils/import-id"
import { StatementViewerModal } from "@/components/page-specific/statement-viewer-modal"
import { EmailViewerModal } from "@/components/page-specific/email-viewer-modal"
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

function SourceLabel({
  label,
  href,
  onPreview,
}: {
  label: string
  href: string | null
  onPreview?: () => void
}) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
      {label}
      {onPreview && (
        <button
          type="button"
          className="inline-flex items-center text-muted-foreground/60 hover:text-foreground transition-colors"
          title={`Preview ${label.toLowerCase()}`}
          onClick={(e) => {
            e.stopPropagation()
            onPreview()
          }}
        >
          <Eye className="h-3 w-3" />
        </button>
      )}
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
  const [previewModal, setPreviewModal] = React.useState<
    | { type: "statement"; statementId: string; filename: string }
    | { type: "email"; emailId: string }
    | null
  >(null)

  const parsed = React.useMemo(() => parseImportId(data.id), [data.id])

  const openStatementPreview = React.useCallback(() => {
    if (parsed && (parsed.type === "statement" || parsed.type === "merged")) {
      setPreviewModal({
        type: "statement",
        statementId: parsed.statementId,
        filename: data.statementTransaction.sourceFilename || "Statement",
      })
    }
  }, [parsed, data.statementTransaction.sourceFilename])

  const openEmailPreview = React.useCallback(() => {
    if (parsed && (parsed.type === "email" || parsed.type === "merged")) {
      setPreviewModal({ type: "email", emailId: parsed.emailId })
    }
  }, [parsed])

  const previewModals = (
    <>
      {previewModal?.type === "statement" && (
        <StatementViewerModal
          open
          onOpenChange={(open) => { if (!open) setPreviewModal(null) }}
          statementId={previewModal.statementId}
          filename={previewModal.filename}
        />
      )}
      {previewModal?.type === "email" && (
        <EmailViewerModal
          open
          onOpenChange={(open) => { if (!open) setPreviewModal(null) }}
          emailId={previewModal.emailId}
          subject={data.emailMetadata?.subject ?? data.mergedEmailData?.metadata.subject ?? null}
          fromName={data.emailMetadata?.fromName ?? data.mergedEmailData?.metadata.fromName ?? null}
          fromAddress={data.emailMetadata?.fromAddress ?? data.mergedEmailData?.metadata.fromAddress ?? null}
          emailDate={data.emailMetadata?.emailDate ?? data.mergedEmailData?.metadata.emailDate ?? null}
        />
      )}
    </>
  )

  // Merged card layout — email + statement side-by-side with conversion bar
  if (data.source === "merged" && data.mergedEmailData && data.crossCurrencyInfo) {
    const cx = data.crossCurrencyInfo
    return (
      <div className="space-y-3">
        {previewModals}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Left panel: Email data */}
          <div className="space-y-1.5">
            <SourceLabel label="From Email" href={getMergedEmailLink(data.id)} onPreview={openEmailPreview} />
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
            <SourceLabel label="From Statement" href={getSourceLink(data.id)} onPreview={openStatementPreview} />
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

        {/* Matched Joot transaction (when a DB match exists for this merged pair) */}
        {data.matchedTransaction && !data.isNew && (
          <div className="border-t pt-3 space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Proposed Link — Joot Transaction
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-1.5">
              <TransactionDetailRow icon={<Calendar className="h-3.5 w-3.5" />}>
                <span>{formatMatchDate(data.matchedTransaction.date)}</span>
              </TransactionDetailRow>
              <TransactionDetailRow icon={<DollarSign className="h-3.5 w-3.5" />}>
                <span className="font-medium">
                  {formatMatchAmount(
                    data.matchedTransaction.amount,
                    data.matchedTransaction.currency
                  )}
                </span>
              </TransactionDetailRow>
              <TransactionDetailRow icon={<Store className="h-3.5 w-3.5" />}>
                <span className="font-medium truncate">
                  {data.matchedTransaction.vendor_name || "Unknown vendor"}
                </span>
              </TransactionDetailRow>
              {data.matchedTransaction.payment_method_name && (
                <TransactionDetailRow
                  icon={<CreditCard className="h-3.5 w-3.5" />}
                  className="text-muted-foreground"
                >
                  <span>{data.matchedTransaction.payment_method_name}</span>
                </TransactionDetailRow>
              )}
              {data.matchedTransaction.description && (
                <TransactionDetailRow icon={<FileText className="h-3.5 w-3.5" />}>
                  <span className="font-medium truncate">
                    {data.matchedTransaction.description}
                  </span>
                </TransactionDetailRow>
              )}
            </div>
          </div>
        )}

        {/* Proposal for unmatched merged items */}
        {data.isNew && data.proposal && (
          <div className="border-t pt-3">
            <ProposalPanel proposal={data.proposal} />
          </div>
        )}
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
      {previewModals}
      {/* Left panel: Statement data */}
      <div className="space-y-1.5">
        <SourceLabel
          label={isEmail ? "From Email" : "From Statement"}
          href={getSourceLink(data.id)}
          onPreview={isEmail ? openEmailPreview : openStatementPreview}
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

      {/* Right panel: Proposal or placeholder for new/unmatched transactions */}
      {data.isNew && data.source !== "merged" && (
        data.proposal ? (
          <ProposalPanel proposal={data.proposal} />
        ) : (
          <div className="space-y-1.5 md:border-l md:pl-3 flex items-center justify-center">
            <p className="text-sm text-muted-foreground italic">
              No matching transaction found
            </p>
          </div>
        )
      )}
    </div>
  )
}

// ── Proposal Panel ──────────────────────────────────────────────────────

function ConfidenceDot({ confidence }: { confidence?: number }) {
  if (confidence === undefined || confidence >= 80) return null
  const isLow = confidence < 50
  return (
    <span
      className={`h-2 w-2 rounded-full inline-block ml-1.5 shrink-0 ${
        isLow ? "bg-orange-400" : "bg-amber-400"
      }`}
      role="img"
      aria-label={isLow ? "Low confidence" : "Medium confidence"}
    />
  )
}

function ProposalPanel({
  proposal,
}: {
  proposal: NonNullable<MatchCardData["proposal"]>
}) {

  return (
    <div className="space-y-1.5 border-t pt-3 md:border-t-0 md:pt-0 md:border-l md:pl-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
        Proposed Txn
        <Zap className="h-3 w-3 text-purple-500" aria-hidden="true" />
      </p>

      {/* Date */}
      {proposal.date && (
        <TransactionDetailRow icon={<Calendar className="h-3.5 w-3.5" />}>
          <span>{formatMatchDate(proposal.date.value)}</span>
        </TransactionDetailRow>
      )}

      {/* Vendor */}
      {proposal.vendor && (
        <TransactionDetailRow icon={<Store className="h-3.5 w-3.5" />}>
          <span className="font-medium truncate">
            {proposal.vendor.value.name}
            {proposal.vendor.confidence < 50 && " ?"}
          </span>
          <ConfidenceDot confidence={proposal.vendor.confidence} />
        </TransactionDetailRow>
      )}

      {/* Amount */}
      {proposal.amount && proposal.currency && (
        <TransactionDetailRow icon={<DollarSign className="h-3.5 w-3.5" />}>
          <span className="font-medium">
            {formatMatchAmount(proposal.amount.value, proposal.currency.value)}
          </span>
        </TransactionDetailRow>
      )}

      {/* Payment Method */}
      {proposal.paymentMethod && (
        <TransactionDetailRow icon={<CreditCard className="h-3.5 w-3.5" />}>
          <span>{proposal.paymentMethod.value.name}</span>
          <ConfidenceDot confidence={proposal.paymentMethod.confidence} />
        </TransactionDetailRow>
      )}

      {/* Tags */}
      {proposal.tags && proposal.tags.value.length > 0 && (
        <TransactionDetailRow icon={<Tag className="h-3.5 w-3.5" />}>
          <div className="flex flex-col gap-0.5">
            {proposal.tags.value.slice(0, 3).map((tag) => (
              <Badge key={tag.id} variant="secondary" className="text-[10px] px-1.5 py-0 h-4 w-fit">
                {tag.name}
              </Badge>
            ))}
            {proposal.tags.value.length > 3 && (
              <span className="text-[10px] text-muted-foreground">
                +{proposal.tags.value.length - 3} more
              </span>
            )}
          </div>
          <ConfidenceDot confidence={proposal.tags.confidence} />
        </TransactionDetailRow>
      )}

      {/* Transaction Type */}
      {proposal.transactionType && (
        <TransactionDetailRow icon={<Receipt className="h-3.5 w-3.5" />}>
          <span className="capitalize">{proposal.transactionType.value}</span>
        </TransactionDetailRow>
      )}
    </div>
  )
}

/**
 * Confidence bar shown below panels on proposal cards.
 */
export function ProposalConfidenceBar({
  score,
}: {
  score: number
}) {
  const barColor =
    score >= 85
      ? "[&>div]:bg-green-500"
      : score >= 55
        ? "[&>div]:bg-amber-500"
        : "[&>div]:bg-orange-500"

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Proposal Confidence</span>
        <span className="text-xs font-medium text-muted-foreground">{score}%</span>
      </div>
      <Progress
        value={score}
        className={`h-1.5 [&>div]:transition-none ${barColor}`}
        aria-label={`Proposal confidence: ${score} out of 100`}
      />
    </div>
  )
}
