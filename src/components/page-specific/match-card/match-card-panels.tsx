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
  Coins,
  Store,
  FileText,
  CreditCard,
  ArrowLeftRight,
  ExternalLink,
  Eye,
  Zap,
  Tag,
  Receipt,
  Mail,
  Copy,
  Check,
} from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { parseImportId } from "@/lib/utils/import-id"
import { StatementViewerModal } from "@/components/page-specific/statement-viewer-modal"
import { PaymentSlipViewerModal } from "@/components/page-specific/payment-slip-viewer-modal"
import { EmailViewerModal } from "@/components/page-specific/email-viewer-modal"
import { cn } from "@/lib/utils"
import { getParserTag } from "@/lib/utils/parser-tags"
import type { MatchCardData, EmailMetadata, MergedPaymentSlipData } from "./types"

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
  if (parsed.type === "payment_slip") {
    return `/imports/payment-slips/${parsed.slipId}`
  }
  if (parsed.type === "merged_slip_email") {
    return `/imports/payment-slips/${parsed.slipId}`
  }
  if (parsed.type === "merged_slip_stmt") {
    return `/imports/payment-slips/${parsed.slipId}`
  }
  if (parsed.type === "merged_slip_email_stmt") {
    return `/imports/payment-slips/${parsed.slipId}`
  }
  return null
}

function getMergedEmailLink(id: string): string | null {
  const parsed = parseImportId(id)
  if (parsed?.type === "merged" || parsed?.type === "merged_slip_email_stmt") {
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

/**
 * Email-specific left panel — shows email context fields consistent with Email Hub.
 */
function EmailSourcePanel({
  data,
  meta,
  sourceLabel,
  emailId,
}: {
  data: MatchCardData
  meta: EmailMetadata
  sourceLabel: React.ReactNode
  emailId?: string
}) {
  const parserTag = getParserTag(meta.fromAddress, meta.parserKey)

  return (
    <div className="space-y-1.5">
      {sourceLabel}

      {/* From name + address */}
      {(meta.fromName || meta.fromAddress) && (
        <TransactionDetailRow icon={<Mail className="h-3.5 w-3.5" />}>
          <div className="min-w-0">
            <span className="font-medium truncate block">
              {meta.fromName || meta.fromAddress}
            </span>
            {meta.fromName && meta.fromAddress && (
              <span className="text-[11px] text-muted-foreground truncate block">
                {meta.fromAddress}
              </span>
            )}
          </div>
          {parserTag && (
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ml-1", parserTag.className)}>
              {parserTag.label}
            </span>
          )}
        </TransactionDetailRow>
      )}

      {/* Subject line */}
      {meta.subject && (
        <TransactionDetailRow icon={<FileText className="h-3.5 w-3.5" />}>
          <span className="truncate text-muted-foreground" title={meta.subject}>
            {meta.subject}
          </span>
        </TransactionDetailRow>
      )}

      {/* Amount */}
      <TransactionDetailRow icon={<Coins className="h-3.5 w-3.5" />}>
        <span className="font-medium">
          {formatMatchAmount(
            data.statementTransaction.amount,
            data.statementTransaction.currency
          )}
        </span>
      </TransactionDetailRow>

      {/* Transaction date */}
      <TransactionDetailRow icon={<Calendar className="h-3.5 w-3.5" />}>
        <span>{formatMatchDate(data.statementTransaction.date)}</span>
      </TransactionDetailRow>

      {/* Received date (email date) */}
      {meta.emailDate && (
        <TransactionDetailRow icon={<Calendar className="h-3.5 w-3.5" />}>
          <span className="text-muted-foreground">
            {formatMatchDate(meta.emailDate.split("T")[0])}
            <span className="text-[10px] ml-1">(received)</span>
          </span>
        </TransactionDetailRow>
      )}

      {/* Raw vendor name */}
      {meta.vendorNameRaw && (
        <TransactionDetailRow icon={<Store className="h-3.5 w-3.5" />}>
          <span className="text-muted-foreground truncate" title={meta.vendorNameRaw}>
            {meta.vendorNameRaw}
          </span>
        </TransactionDetailRow>
      )}

      {/* Email ID — subtle, with copy button */}
      {emailId && (
        <CopyableId id={emailId} />
      )}
    </div>
  )
}

/**
 * Subtle copyable ID row for traceability.
 */
function CopyableId({ id }: { id: string }) {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center gap-1.5 pt-1">
      <span className="text-[10px] text-muted-foreground/50 font-mono truncate">{id}</span>
      <button
        onClick={(e) => {
          e.stopPropagation()
          handleCopy()
        }}
        className="text-muted-foreground/40 hover:text-muted-foreground transition-colors p-0.5 shrink-0"
        aria-label="Copy email ID"
      >
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      </button>
    </div>
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
    | { type: "payment_slip"; slipId: string; filename: string }
    | null
  >(null)

  const parsed = React.useMemo(() => parseImportId(data.id), [data.id])

  const openStatementPreview = React.useCallback(() => {
    if (parsed && (parsed.type === "statement" || parsed.type === "merged" || parsed.type === "merged_slip_stmt" || parsed.type === "merged_slip_email_stmt")) {
      setPreviewModal({
        type: "statement",
        statementId: parsed.statementId,
        filename: data.statementTransaction.sourceFilename || "Statement",
      })
    }
  }, [parsed, data.statementTransaction.sourceFilename])

  const openEmailPreview = React.useCallback(() => {
    if (parsed && (parsed.type === "email" || parsed.type === "merged" || parsed.type === "merged_slip_email" || parsed.type === "merged_slip_email_stmt")) {
      setPreviewModal({ type: "email", emailId: parsed.emailId })
    }
  }, [parsed])

  const openSlipPreview = React.useCallback(() => {
    if (parsed && (parsed.type === "payment_slip" || parsed.type === "merged_slip_email" || parsed.type === "merged_slip_stmt" || parsed.type === "merged_slip_email_stmt")) {
      setPreviewModal({
        type: "payment_slip",
        slipId: parsed.slipId,
        filename: data.statementTransaction.sourceFilename || "Payment Slip",
      })
    }
  }, [parsed, data.statementTransaction.sourceFilename])

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
      {previewModal?.type === "payment_slip" && (
        <PaymentSlipViewerModal
          open
          onOpenChange={(open) => { if (!open) setPreviewModal(null) }}
          slipId={previewModal.slipId}
          filename={previewModal.filename}
        />
      )}
    </>
  )

  // Merged card layout — 3-way: payment slip + email + statement
  if (data.source === "merged" && data.mergedEmailData && data.mergedPaymentSlipData) {
    const slip = data.mergedPaymentSlipData
    const email = data.mergedEmailData
    return (
      <div className="space-y-3">
        {previewModals}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Payment slip */}
          <div className="space-y-1.5">
            <SourceLabel
              label="From Payment Slip"
              href={getSourceLink(data.id)}
              onPreview={openSlipPreview}
            />
            <TransactionDetailRow icon={<Calendar className="h-3.5 w-3.5" />}>
              <span>{formatMatchDate(slip.date)}</span>
            </TransactionDetailRow>
            <TransactionDetailRow icon={<FileText className="h-3.5 w-3.5" />}>
              <span className="font-medium truncate" title={slip.description}>
                {slip.description}
              </span>
            </TransactionDetailRow>
            <TransactionDetailRow icon={<Coins className="h-3.5 w-3.5" />}>
              <span className="font-medium">
                {formatMatchAmount(slip.amount, slip.currency)}
              </span>
            </TransactionDetailRow>
            {slip.metadata.senderName && (
              <TransactionDetailRow icon={<Store className="h-3.5 w-3.5" />}>
                <span className="text-muted-foreground truncate">
                  {slip.metadata.senderName}
                </span>
              </TransactionDetailRow>
            )}
          </div>

          {/* Email */}
          <EmailSourcePanel
            data={{
              ...data,
              statementTransaction: {
                ...data.statementTransaction,
                date: email.date,
                description: email.description,
                amount: email.amount,
                currency: email.currency,
              },
            }}
            meta={email.metadata}
            sourceLabel={
              <SourceLabel
                label="From Email"
                href={getMergedEmailLink(data.id)}
                onPreview={openEmailPreview}
              />
            }
            emailId={parsed?.type === "merged_slip_email_stmt" ? parsed.emailId : undefined}
          />

          {/* Statement */}
          <div className="space-y-1.5 md:border-l md:pl-3">
            <SourceLabel label="From Statement" href={null} onPreview={openStatementPreview} />
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
            <TransactionDetailRow icon={<Coins className="h-3.5 w-3.5" />}>
              <span className="font-medium">
                {formatMatchAmount(
                  data.statementTransaction.amount,
                  data.statementTransaction.currency
                )}
              </span>
            </TransactionDetailRow>
          </div>
        </div>

        {data.matchedTransaction && !data.isNew && (
          <div className="border-t pt-3 space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Matched Joot Transaction
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-1.5">
              <TransactionDetailRow icon={<Calendar className="h-3.5 w-3.5" />}>
                <span>{formatMatchDate(data.matchedTransaction.date)}</span>
              </TransactionDetailRow>
              <TransactionDetailRow icon={<Coins className="h-3.5 w-3.5" />}>
                <span className="font-medium">
                  {formatMatchAmount(
                    data.matchedTransaction.amount,
                    data.matchedTransaction.currency
                  )}
                </span>
              </TransactionDetailRow>
            </div>
          </div>
        )}

        {data.isNew && data.proposal && (
          <div className="border-t pt-3">
            <ProposalPanel proposal={data.proposal} />
          </div>
        )}
      </div>
    )
  }

  // Merged card layout — email + statement side-by-side (with optional conversion bar)
  if (data.source === "merged" && data.mergedEmailData) {
    const cx = data.crossCurrencyInfo
    return (
      <div className="space-y-3">
        {previewModals}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Left panel: Email data — enriched with email metadata */}
          <EmailSourcePanel
            data={{
              ...data,
              statementTransaction: {
                ...data.statementTransaction,
                date: data.mergedEmailData.date,
                description: data.mergedEmailData.description,
                amount: data.mergedEmailData.amount,
                currency: data.mergedEmailData.currency,
              },
            }}
            meta={data.mergedEmailData.metadata}
            sourceLabel={
              <SourceLabel
                label="From Email"
                href={getMergedEmailLink(data.id)}
                onPreview={openEmailPreview}
              />
            }
            emailId={parsed?.type === "merged" ? parsed.emailId : undefined}
          />

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
            <TransactionDetailRow icon={<Coins className="h-3.5 w-3.5" />}>
              <span className="font-medium">
                {formatMatchAmount(
                  data.statementTransaction.amount,
                  data.statementTransaction.currency
                )}
              </span>
            </TransactionDetailRow>
          </div>
        </div>

        {/* Cross-currency conversion info bar (only for cross-currency pairs) */}
        {cx && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-blue-50 rounded px-3 py-1.5">
            <ArrowLeftRight className="h-3.5 w-3.5 text-blue-500 shrink-0" />
            <span>
              {cx.emailCurrency} {cx.emailAmount.toFixed(2)} ≈ {cx.statementCurrency} {cx.statementAmount.toFixed(2)}, rate: {cx.rate.toFixed(4)}, {cx.percentDiff.toFixed(1)}% diff
            </span>
          </div>
        )}

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
              <TransactionDetailRow icon={<Coins className="h-3.5 w-3.5" />}>
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
              <TransactionDetailRow icon={<FileText className="h-3.5 w-3.5" />}>
                <span className="font-medium truncate" title={data.matchedTransaction.description}>
                  {data.matchedTransaction.description || "—"}
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

  // Merged card layout — payment slip + statement side-by-side
  if (data.source === "merged" && data.mergedPaymentSlipData) {
    const slip = data.mergedPaymentSlipData
    return (
      <div className="space-y-3">
        {previewModals}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Left panel: Payment slip data */}
          <div className="space-y-1.5">
            <SourceLabel
              label="From Payment Slip"
              href={getSourceLink(data.id)}
              onPreview={openSlipPreview}
            />
            <TransactionDetailRow icon={<Calendar className="h-3.5 w-3.5" />}>
              <span>{formatMatchDate(slip.date)}</span>
            </TransactionDetailRow>
            <TransactionDetailRow icon={<FileText className="h-3.5 w-3.5" />}>
              <span
                className="font-medium truncate"
                title={slip.description}
              >
                {slip.description}
              </span>
            </TransactionDetailRow>
            <TransactionDetailRow icon={<Coins className="h-3.5 w-3.5" />}>
              <span className="font-medium">
                {formatMatchAmount(slip.amount, slip.currency)}
              </span>
            </TransactionDetailRow>
            {slip.metadata.senderName && (
              <TransactionDetailRow icon={<Store className="h-3.5 w-3.5" />}>
                <span className="text-muted-foreground truncate">
                  {slip.metadata.senderName}
                </span>
              </TransactionDetailRow>
            )}
            {slip.metadata.bankDetected && (
              <TransactionDetailRow icon={<CreditCard className="h-3.5 w-3.5" />}>
                <span className="text-muted-foreground">
                  {slip.metadata.bankDetected}
                </span>
              </TransactionDetailRow>
            )}
          </div>

          {/* Right panel: Statement data */}
          <div className="space-y-1.5 md:border-l md:pl-3">
            <SourceLabel label="From Statement" href={null} onPreview={openStatementPreview} />
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
            <TransactionDetailRow icon={<Coins className="h-3.5 w-3.5" />}>
              <span className="font-medium">
                {formatMatchAmount(
                  data.statementTransaction.amount,
                  data.statementTransaction.currency
                )}
              </span>
            </TransactionDetailRow>
          </div>
        </div>

        {/* Matched Joot transaction (when a DB match exists) */}
        {data.matchedTransaction && !data.isNew && (
          <div className="border-t pt-3 space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Matched Joot Transaction
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-1.5">
              <TransactionDetailRow icon={<Calendar className="h-3.5 w-3.5" />}>
                <span>{formatMatchDate(data.matchedTransaction.date)}</span>
              </TransactionDetailRow>
              <TransactionDetailRow icon={<Coins className="h-3.5 w-3.5" />}>
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
              <TransactionDetailRow icon={<FileText className="h-3.5 w-3.5" />}>
                <span className="font-medium truncate" title={data.matchedTransaction.description}>
                  {data.matchedTransaction.description || "\u2014"}
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
  const isPaymentSlip = data.source === "payment_slip"
  const displayDescription = isEmail || isPaymentSlip
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
      {/* Left panel: Email-enriched or statement data */}
      {isEmail && data.emailMetadata ? (
        <EmailSourcePanel
          data={data}
          meta={data.emailMetadata}
          sourceLabel={
            <SourceLabel
              label="From Email"
              href={getSourceLink(data.id)}
              onPreview={openEmailPreview}
            />
          }
          emailId={parsed?.type === "email" ? parsed.emailId : undefined}
        />
      ) : (
        <div className="space-y-1.5">
          <SourceLabel
            label={isPaymentSlip ? "From Payment Slip" : "From Statement"}
            href={getSourceLink(data.id)}
            onPreview={isPaymentSlip ? openSlipPreview : openStatementPreview}
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
          <TransactionDetailRow icon={<Coins className="h-3.5 w-3.5" />}>
            <span className="font-medium">
              {formatMatchAmount(
                data.statementTransaction.amount,
                data.statementTransaction.currency
              )}
            </span>
          </TransactionDetailRow>
        </div>
      )}

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
          <TransactionDetailRow icon={<FileText className="h-3.5 w-3.5" />}>
            <span className="font-medium truncate" title={data.matchedTransaction.description}>
              {data.matchedTransaction.description || "—"}
            </span>
          </TransactionDetailRow>
          <TransactionDetailRow icon={<Coins className="h-3.5 w-3.5" />}>
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

      {/* Right panel: Info + proposal for new/unmatched transactions */}
      {data.isNew && data.source !== "merged" && (
        <div className="space-y-3 md:border-l md:pl-3">
          <p className="text-sm text-muted-foreground italic">
            No matching transaction found
          </p>
          {data.proposal && (
            <ProposalPanel proposal={data.proposal} />
          )}
        </div>
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
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
        Proposed Txn
        <Zap className="h-3 w-3 text-purple-500" aria-hidden="true" />
      </p>

      {/* Type */}
      {proposal.transactionType && (
        <TransactionDetailRow icon={<Receipt className="h-3.5 w-3.5" />}>
          <span className="capitalize">{proposal.transactionType.value}</span>
        </TransactionDetailRow>
      )}

      {/* Description */}
      {proposal.description && (
        <TransactionDetailRow icon={<FileText className="h-3.5 w-3.5" />}>
          <span className="truncate" title={proposal.description.value}>
            {proposal.description.value}
          </span>
          <ConfidenceDot confidence={proposal.description.confidence} />
        </TransactionDetailRow>
      )}

      {/* Amount */}
      {proposal.amount && proposal.currency && (
        <TransactionDetailRow icon={<Coins className="h-3.5 w-3.5" />}>
          <span className="font-medium">
            {formatMatchAmount(proposal.amount.value, proposal.currency.value)}
          </span>
        </TransactionDetailRow>
      )}

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

      {/* Payment Method */}
      {proposal.paymentMethod && (
        <TransactionDetailRow icon={<CreditCard className="h-3.5 w-3.5" />}>
          <span>{proposal.paymentMethod.value.name}</span>
          <ConfidenceDot confidence={proposal.paymentMethod.confidence} />
        </TransactionDetailRow>
      )}

      {/* Tags — always shown, em dash if empty */}
      <TransactionDetailRow icon={<Tag className="h-3.5 w-3.5" />}>
        {proposal.tags && proposal.tags.value.length > 0 ? (
          <>
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
          </>
        ) : (
          <span className="text-muted-foreground">&mdash;</span>
        )}
      </TransactionDetailRow>
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
