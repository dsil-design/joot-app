"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { SearchableComboBox } from "@/components/ui/searchable-combobox"
import { ComboBox } from "@/components/ui/combobox"
import { MultiSelectComboBox } from "@/components/ui/multi-select-combobox"
import { DatePicker } from "@/components/ui/date-picker"
import { TransactionDetailRow } from "@/components/ui/transaction-detail-row"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Progress } from "@/components/ui/progress"
import { StatementViewerModal } from "./statement-viewer-modal"
import { EmailViewerModal } from "./email-viewer-modal"
import { cn } from "@/lib/utils"
import { useVendorSearch } from "@/hooks/use-vendor-search"
import { usePaymentMethodOptions, useTagOptions } from "@/hooks"
import { toast } from "sonner"
import {
  formatMatchAmount,
  formatMatchDate,
  computeMatchDeltas,
} from "@/lib/utils/match-formatting"
import { cleanStatementDescription } from "@/lib/utils/statement-description"
import { getParserTag } from "@/lib/utils/parser-tags"
import { parseImportId } from "@/lib/utils/import-id"
import { PARSER_PAYMENT_METHOD_MAP } from "@/lib/proposals/payment-method-mapper"
import { getConfidenceLevel } from "@/components/ui/confidence-indicator"
import Link from "next/link"
import type { MatchCardData } from "./match-card/types"
import type { ProposalMeta } from "./create-from-import-dialog"
import {
  ChevronLeft,
  ChevronRight,
  X,
  Mail,
  Calendar,
  DollarSign,
  FileText,
  Store,
  CreditCard,
  ArrowLeftRight,
  Zap,
  Loader2,
  Eye,
  ExternalLink,
  CheckCircle2,
  Ban,
  ArrowRight,
} from "lucide-react"

// ── Types ────────────────────────────────────────────────────────────────

interface ReviewFocusModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: MatchCardData[]
  currentIndex: number
  onIndexChange: (index: number) => void
  onApprove: (id: string) => void
  onReject: (id: string) => void
  onLinkManually: (id: string) => void
  onCreateTransaction: (
    compositeId: string,
    transactionData: {
      description: string
      amount: number
      currency: string
      date: string
      vendorId?: string
      paymentMethodId?: string
      tagIds?: string[]
      transactionType: string
    },
    meta?: ProposalMeta
  ) => Promise<void>
  isProcessing: (id: string) => boolean
}

// ── Helpers ──────────────────────────────────────────────────────────────

function ReasoningZap({ reasoning }: { reasoning?: string }) {
  if (!reasoning) {
    return (
      <span className="text-purple-500">
        <Zap className="h-3.5 w-3.5" />
      </span>
    )
  }
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-purple-500 cursor-help" tabIndex={0}>
            <Zap className="h-3.5 w-3.5" />
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs text-left leading-relaxed">
          {reasoning}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function getSourceLink(id: string): string | null {
  const parsed = parseImportId(id)
  if (!parsed) return null
  if (parsed.type === "statement") return `/imports/statements/${parsed.statementId}/results`
  if (parsed.type === "email") return `/imports/emails/${parsed.emailId}`
  if (parsed.type === "merged") return `/imports/statements/${parsed.statementId}/results`
  return null
}

function getMergedEmailLink(id: string): string | null {
  const parsed = parseImportId(id)
  if (parsed?.type === "merged") return `/imports/emails/${parsed.emailId}`
  return null
}

// ── Source Info Panel (Left Side) ────────────────────────────────────────

function SourceInfoPanel({ data }: { data: MatchCardData }) {
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

  // Merged layout: email + statement + cross-currency
  if (data.source === "merged" && data.mergedEmailData && data.crossCurrencyInfo) {
    const cx = data.crossCurrencyInfo
    const meta = data.mergedEmailData.metadata
    const parserTag = getParserTag(meta.fromAddress, meta.parserKey)

    return (
      <div className="space-y-4">
        {/* Email section */}
        <div className="space-y-2">
          <SourceSectionLabel
            label="From Email"
            href={getMergedEmailLink(data.id)}
            onPreview={openEmailPreview}
          />
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
          {meta.subject && (
            <TransactionDetailRow icon={<FileText className="h-3.5 w-3.5" />}>
              <span className="truncate text-muted-foreground" title={meta.subject}>
                {meta.subject}
              </span>
            </TransactionDetailRow>
          )}
          <TransactionDetailRow icon={<DollarSign className="h-3.5 w-3.5" />}>
            <span className="font-medium">
              {formatMatchAmount(data.mergedEmailData.amount, data.mergedEmailData.currency)}
            </span>
          </TransactionDetailRow>
          <TransactionDetailRow icon={<Calendar className="h-3.5 w-3.5" />}>
            <span>{formatMatchDate(data.mergedEmailData.date)}</span>
          </TransactionDetailRow>
          {meta.vendorNameRaw && (
            <TransactionDetailRow icon={<Store className="h-3.5 w-3.5" />}>
              <span className="text-muted-foreground truncate">{meta.vendorNameRaw}</span>
            </TransactionDetailRow>
          )}
        </div>

        {/* Statement section */}
        <div className="space-y-2 border-t pt-3">
          <SourceSectionLabel
            label="From Statement"
            href={getSourceLink(data.id)}
            onPreview={openStatementPreview}
          />
          <TransactionDetailRow icon={<Calendar className="h-3.5 w-3.5" />}>
            <span>{formatMatchDate(data.statementTransaction.date)}</span>
          </TransactionDetailRow>
          <TransactionDetailRow icon={<FileText className="h-3.5 w-3.5" />}>
            <span className="font-medium truncate" title={data.statementTransaction.description}>
              {cleanStatementDescription(data.statementTransaction.description)}
            </span>
          </TransactionDetailRow>
          <TransactionDetailRow icon={<DollarSign className="h-3.5 w-3.5" />}>
            <span className="font-medium">
              {formatMatchAmount(data.statementTransaction.amount, data.statementTransaction.currency)}
            </span>
          </TransactionDetailRow>
        </div>

        {/* Cross-currency bar */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/30 rounded px-3 py-1.5">
          <ArrowLeftRight className="h-3.5 w-3.5 text-blue-500 shrink-0" />
          <span>
            {cx.emailCurrency} {cx.emailAmount.toFixed(2)} ≈ {cx.statementCurrency}{" "}
            {cx.statementAmount.toFixed(2)}, rate: {cx.rate.toFixed(4)}, {cx.percentDiff.toFixed(1)}% diff
          </span>
        </div>

        {/* Preview modals */}
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
            subject={data.mergedEmailData?.metadata.subject ?? null}
            fromName={data.mergedEmailData?.metadata.fromName ?? null}
            fromAddress={data.mergedEmailData?.metadata.fromAddress ?? null}
            emailDate={data.mergedEmailData?.metadata.emailDate ?? null}
          />
        )}
      </div>
    )
  }

  // Email source
  if (data.source === "email" && data.emailMetadata) {
    const meta = data.emailMetadata
    const parserTag = getParserTag(meta.fromAddress, meta.parserKey)

    return (
      <div className="space-y-2">
        <SourceSectionLabel
          label="From Email"
          href={getSourceLink(data.id)}
          onPreview={openEmailPreview}
        />
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
        {meta.subject && (
          <TransactionDetailRow icon={<FileText className="h-3.5 w-3.5" />}>
            <span className="truncate text-muted-foreground" title={meta.subject}>
              {meta.subject}
            </span>
          </TransactionDetailRow>
        )}
        <TransactionDetailRow icon={<DollarSign className="h-3.5 w-3.5" />}>
          <span className="font-medium">
            {formatMatchAmount(data.statementTransaction.amount, data.statementTransaction.currency)}
          </span>
        </TransactionDetailRow>
        <TransactionDetailRow icon={<Calendar className="h-3.5 w-3.5" />}>
          <span>{formatMatchDate(data.statementTransaction.date)}</span>
        </TransactionDetailRow>
        {meta.emailDate && (
          <TransactionDetailRow icon={<Calendar className="h-3.5 w-3.5" />}>
            <span className="text-muted-foreground">
              {formatMatchDate(meta.emailDate.split("T")[0])}
              <span className="text-[10px] ml-1">(received)</span>
            </span>
          </TransactionDetailRow>
        )}
        {meta.vendorNameRaw && (
          <TransactionDetailRow icon={<Store className="h-3.5 w-3.5" />}>
            <span className="text-muted-foreground truncate">{meta.vendorNameRaw}</span>
          </TransactionDetailRow>
        )}
        {meta.paymentCardLastFour && (
          <TransactionDetailRow icon={<CreditCard className="h-3.5 w-3.5" />}>
            <span className="text-muted-foreground">
              {meta.paymentCardType ? `${meta.paymentCardType} ` : ""}*{meta.paymentCardLastFour}
            </span>
          </TransactionDetailRow>
        )}

        {previewModal?.type === "email" && (
          <EmailViewerModal
            open
            onOpenChange={(open) => { if (!open) setPreviewModal(null) }}
            emailId={previewModal.emailId}
            subject={meta.subject ?? null}
            fromName={meta.fromName ?? null}
            fromAddress={meta.fromAddress ?? null}
            emailDate={meta.emailDate ?? null}
          />
        )}
      </div>
    )
  }

  // Statement source (default)
  return (
    <div className="space-y-2">
      <SourceSectionLabel
        label="From Statement"
        href={getSourceLink(data.id)}
        onPreview={openStatementPreview}
      />
      <TransactionDetailRow icon={<Calendar className="h-3.5 w-3.5" />}>
        <span>{formatMatchDate(data.statementTransaction.date)}</span>
      </TransactionDetailRow>
      <TransactionDetailRow icon={<FileText className="h-3.5 w-3.5" />}>
        <span className="font-medium truncate" title={data.statementTransaction.description}>
          {cleanStatementDescription(data.statementTransaction.description)}
        </span>
      </TransactionDetailRow>
      <TransactionDetailRow icon={<DollarSign className="h-3.5 w-3.5" />}>
        <span className="font-medium">
          {formatMatchAmount(data.statementTransaction.amount, data.statementTransaction.currency)}
        </span>
      </TransactionDetailRow>
      {data.statementTransaction.sourceFilename && (
        <TransactionDetailRow icon={<FileText className="h-3.5 w-3.5" />}>
          <span className="text-xs text-muted-foreground truncate">
            {data.statementTransaction.sourceFilename}
          </span>
        </TransactionDetailRow>
      )}

      {previewModal?.type === "statement" && (
        <StatementViewerModal
          open
          onOpenChange={(open) => { if (!open) setPreviewModal(null) }}
          statementId={previewModal.statementId}
          filename={previewModal.filename}
        />
      )}
    </div>
  )
}

function SourceSectionLabel({
  label,
  href,
  onPreview,
}: {
  label: string
  href: string | null
  onPreview?: () => void
}) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-1">
      {label}
      {onPreview && (
        <button
          type="button"
          className="inline-flex items-center text-muted-foreground/60 hover:text-foreground transition-colors"
          title={`Preview ${label.toLowerCase()}`}
          onClick={(e) => { e.stopPropagation(); onPreview() }}
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

// ── Matched Transaction Panel (Right Side for match items) ───────────────

function MatchedTransactionPanel({
  data,
  onApprove,
  onReject,
  onLinkManually,
  isProcessing,
}: {
  data: MatchCardData
  onApprove: () => void
  onReject: () => void
  onLinkManually: () => void
  isProcessing: boolean
}) {
  const deltas = data.matchedTransaction
    ? computeMatchDeltas(
        data.statementTransaction.date,
        data.statementTransaction.amount,
        data.statementTransaction.currency,
        data.matchedTransaction.date,
        data.matchedTransaction.amount
      )
    : null

  const confidenceLevel = getConfidenceLevel(data.confidence)
  const barColor =
    confidenceLevel === "high"
      ? "[&>div]:bg-green-500"
      : confidenceLevel === "medium"
        ? "[&>div]:bg-amber-500"
        : "[&>div]:bg-orange-500"

  return (
    <div className="space-y-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Matched Transaction in Joot
      </p>

      {data.matchedTransaction && (
        <div className="space-y-2">
          <TransactionDetailRow icon={<Calendar className="h-3.5 w-3.5" />}>
            <span>{formatMatchDate(data.matchedTransaction.date)}</span>
            {deltas?.dateDelta && (
              <span className="text-xs text-muted-foreground">{deltas.dateDelta}</span>
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
              {formatMatchAmount(data.matchedTransaction.amount, data.matchedTransaction.currency)}
            </span>
            {deltas?.amountDelta && (
              <span className="text-xs text-muted-foreground">{deltas.amountDelta}</span>
            )}
          </TransactionDetailRow>
          {data.matchedTransaction.payment_method_name && (
            <TransactionDetailRow icon={<CreditCard className="h-3.5 w-3.5" />}>
              <span className="text-muted-foreground">
                {data.matchedTransaction.payment_method_name}
              </span>
            </TransactionDetailRow>
          )}
        </div>
      )}

      {/* Confidence bar */}
      <div className="space-y-1 pt-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Match Confidence</span>
          <span className="text-xs font-medium text-muted-foreground">{data.confidence}%</span>
        </div>
        <Progress
          value={data.confidence}
          className={`h-1.5 [&>div]:transition-none ${barColor}`}
        />
      </div>

      {/* Match reasons */}
      {data.reasons && data.reasons.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Why this match
          </p>
          <ul className="text-xs text-muted-foreground space-y-0.5">
            {data.reasons.map((reason, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-muted-foreground/50 mt-0.5">•</span>
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t">
        <Button
          variant="ghost"
          size="sm"
          onClick={onReject}
          disabled={isProcessing}
          className="text-muted-foreground"
        >
          <Ban className="h-3.5 w-3.5 mr-1.5" />
          Reject
        </Button>
        <div className="flex-1" />
        <Button
          variant="outline"
          size="sm"
          onClick={onLinkManually}
          disabled={isProcessing}
        >
          Link to Different
        </Button>
        <Button
          size="sm"
          onClick={onApprove}
          disabled={isProcessing}
          className="bg-green-600 hover:bg-green-700"
        >
          {isProcessing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
          )}
          Approve & Continue
        </Button>
      </div>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────

export function ReviewFocusModal({
  open,
  onOpenChange,
  items,
  currentIndex,
  onIndexChange,
  onApprove,
  onReject,
  onLinkManually,
  onCreateTransaction,
  isProcessing,
}: ReviewFocusModalProps) {
  const item = items[currentIndex]
  const total = items.length

  // ── Form state (for new items) ──

  const [description, setDescription] = React.useState("")
  const [amount, setAmount] = React.useState("")
  const [date, setDate] = React.useState<Date>(new Date())
  const [vendor, setVendor] = React.useState("")
  const [vendorLabel, setVendorLabel] = React.useState("")
  const [paymentMethod, setPaymentMethod] = React.useState("")
  const [tags, setTags] = React.useState<string[]>([])
  const [transactionType, setTransactionType] = React.useState<"expense" | "income">("expense")
  const [isSaving, setIsSaving] = React.useState(false)

  // AI prefill tracking
  const [aiPrefilled, setAiPrefilled] = React.useState<Set<string>>(new Set())
  const [fieldReasoning, setFieldReasoning] = React.useState<Record<string, string>>({})
  const proposalValuesRef = React.useRef<Record<string, unknown>>({})

  // Form hooks
  const { searchVendors, getVendorById, createVendor } = useVendorSearch()
  const {
    options: paymentOptions,
    addCustomOption: addPaymentMethod,
    loading: paymentsLoading,
  } = usePaymentMethodOptions()
  const {
    options: tagOptions,
    addCustomOption: addTag,
    loading: tagsLoading,
  } = useTagOptions()

  const paymentOptionsRef = React.useRef(paymentOptions)
  paymentOptionsRef.current = paymentOptions

  // Proposal-derived suggestions
  const proposal = item?.proposal
  const vendorAlternatives = proposal?.vendor?.value.alternatives?.slice(0, 3) || []
  const showVendorSuggestions = proposal?.vendor && proposal.vendor.confidence < 60 && vendorAlternatives.length > 0
  const suggestedTags = React.useMemo(() => {
    if (!proposal?.tags?.value) return []
    return proposal.tags.value.filter((t) => !tags.includes(t.id))
  }, [proposal, tags])

  // Clear AI flag when user edits a field
  const clearAiFlag = React.useCallback((field: string) => {
    setAiPrefilled((prev) => {
      if (!prev.has(field)) return prev
      const next = new Set(prev)
      next.delete(field)
      return next
    })
  }, [])

  // ── Pre-fill form when item changes ──

  React.useEffect(() => {
    if (!open || !item) return

    // Reset
    setAiPrefilled(new Set())
    setFieldReasoning({})
    proposalValuesRef.current = {}

    // Base pre-fill from source data
    setDescription(item.statementTransaction.description)
    setAmount(Math.abs(item.statementTransaction.amount).toFixed(2))
    const dateStr = item.statementTransaction.date.split("T")[0]
    setDate(new Date(dateStr + "T00:00:00"))
    setPaymentMethod("")
    setVendor("")
    setVendorLabel("")
    setTags([])
    setTransactionType("expense")

    // Proposal pre-fill (priority 1)
    if (item.proposal) {
      const p = item.proposal
      const prefilledFields = new Set<string>()
      const reasoning: Record<string, string> = {}
      const originalValues: Record<string, unknown> = {}

      if (p.transactionType) {
        setTransactionType(p.transactionType.value)
        prefilledFields.add("transactionType")
        reasoning.transactionType = p.transactionType.reasoning
        originalValues.transactionType = p.transactionType.value
      }
      if (p.description) {
        setDescription(p.description.value)
        prefilledFields.add("description")
        reasoning.description = p.description.reasoning
        originalValues.description = p.description.value
      }
      if (p.vendor?.value.id) {
        setVendor(p.vendor.value.id)
        setVendorLabel(p.vendor.value.name)
        prefilledFields.add("vendor")
        reasoning.vendor = p.vendor.reasoning
        originalValues.vendor = p.vendor.value.id
      }
      if (p.paymentMethod?.value.id) {
        setPaymentMethod(p.paymentMethod.value.id)
        prefilledFields.add("paymentMethod")
        reasoning.paymentMethod = p.paymentMethod.reasoning
        originalValues.paymentMethod = p.paymentMethod.value.id
      }
      if (p.tags?.value && p.tags.value.length > 0) {
        setTags(p.tags.value.map((t) => t.id))
        prefilledFields.add("tags")
        reasoning.tags = p.tags.reasoning
        originalValues.tags = p.tags.value.map((t) => t.id)
      }

      if (prefilledFields.size > 0) {
        setAiPrefilled(prefilledFields)
        setFieldReasoning(reasoning)
        proposalValuesRef.current = originalValues
      }
      return
    }

    // Smart hints from email metadata (priority 2)
    const meta = item.emailMetadata || item.mergedEmailData?.metadata
    if (meta) {
      const resolve = async () => {
        const prefilledFields = new Set<string>()

        if (meta.vendorId) {
          const vendorData = await getVendorById(meta.vendorId)
          if (vendorData) {
            setVendor(vendorData.id)
            setVendorLabel(vendorData.name)
            prefilledFields.add("vendor")
          }
        } else if (meta.vendorNameRaw) {
          const results = await searchVendors(meta.vendorNameRaw, 5)
          const exactMatch = results.find(
            (v) => v.name.toLowerCase() === meta.vendorNameRaw!.toLowerCase()
          )
          if (exactMatch) {
            setVendor(exactMatch.id)
            setVendorLabel(exactMatch.name)
            prefilledFields.add("vendor")
          }
        }

        if (meta.parserKey && PARSER_PAYMENT_METHOD_MAP[meta.parserKey]) {
          const patterns = PARSER_PAYMENT_METHOD_MAP[meta.parserKey]
          const matched = paymentOptionsRef.current.find((opt) =>
            patterns.some((p) => opt.label.toLowerCase().includes(p))
          )
          if (matched) {
            setPaymentMethod(matched.value)
            prefilledFields.add("paymentMethod")
          }
        }

        if (
          meta.parserKey &&
          meta.parserKey !== "ai-fallback" &&
          (meta.extractionConfidence ?? 0) >= 75
        ) {
          // Use email-derived description if high confidence parser
          prefilledFields.add("description")
        }

        if (prefilledFields.size > 0) {
          setAiPrefilled(prefilledFields)
        }
      }
      resolve()
    }
  }, [open, item?.id, getVendorById, searchVendors]) // eslint-disable-line react-hooks/exhaustive-deps

  // Retry payment method pre-fill when options load
  React.useEffect(() => {
    if (!open || !item || paymentsLoading || paymentMethod) return
    const meta = item.emailMetadata || item.mergedEmailData?.metadata
    if (!meta?.parserKey) return
    const patterns = PARSER_PAYMENT_METHOD_MAP[meta.parserKey]
    if (!patterns) return
    const matched = paymentOptions.find((opt) =>
      patterns.some((p) => opt.label.toLowerCase().includes(p))
    )
    if (matched) {
      setPaymentMethod(matched.value)
      setAiPrefilled((prev) => new Set([...prev, "paymentMethod"]))
    }
  }, [open, item?.id, paymentsLoading, paymentOptions, paymentMethod]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Navigation ──

  const goNext = React.useCallback(() => {
    if (currentIndex < total - 1) onIndexChange(currentIndex + 1)
  }, [currentIndex, total, onIndexChange])

  const goPrev = React.useCallback(() => {
    if (currentIndex > 0) onIndexChange(currentIndex - 1)
  }, [currentIndex, onIndexChange])

  // Keyboard navigation (skip when focused on form fields)
  React.useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault()
        goNext()
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault()
        goPrev()
      }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [open, goNext, goPrev])

  // Bounds check when items change
  React.useEffect(() => {
    if (!open) return
    if (items.length === 0) {
      // All items reviewed - close after brief delay
      const timeout = setTimeout(() => onOpenChange(false), 1500)
      return () => clearTimeout(timeout)
    }
    if (currentIndex >= items.length) {
      onIndexChange(items.length - 1)
    }
  }, [open, items.length, currentIndex, onIndexChange, onOpenChange])

  // ── Form handlers ──

  const handleSearchVendors = React.useCallback(
    async (query: string) => {
      const results = await searchVendors(query)
      return results.map((v) => ({ id: v.id, name: v.name }))
    },
    [searchVendors]
  )

  const handleAddVendor = async (vendorName: string): Promise<string | null> => {
    const newVendor = await createVendor(vendorName)
    if (newVendor) {
      setVendor(newVendor.id)
      setVendorLabel(newVendor.name)
      clearAiFlag("vendor")
      toast.success(`Added vendor: ${vendorName}`)
      return newVendor.id
    }
    toast.error("Failed to add vendor")
    return null
  }

  const handleAddPaymentMethod = async (methodName: string) => {
    const newMethod = await addPaymentMethod(methodName)
    if (newMethod) {
      setPaymentMethod(newMethod)
      clearAiFlag("paymentMethod")
      toast.success(`Added payment method: ${methodName}`)
      return newMethod
    }
    toast.error("Failed to add payment method")
    return null
  }

  const handleAddTag = async (tagName: string) => {
    const newTag = await addTag(tagName)
    if (newTag) {
      toast.success(`Added tag: ${tagName}`)
      return newTag
    }
    toast.error("Failed to add tag")
    return null
  }

  const buildProposalMeta = (): ProposalMeta | undefined => {
    if (!item?.proposal) return undefined

    const original = proposalValuesRef.current
    const modifiedFields: Record<string, { from: unknown; to: unknown }> = {}

    if (original.vendor !== undefined && original.vendor !== (vendor || undefined)) {
      modifiedFields.vendor_id = { from: original.vendor, to: vendor || null }
    }
    if (original.paymentMethod !== undefined && original.paymentMethod !== (paymentMethod || undefined)) {
      modifiedFields.payment_method_id = { from: original.paymentMethod, to: paymentMethod || null }
    }
    if (original.description !== undefined && original.description !== description.trim()) {
      modifiedFields.description = { from: original.description, to: description.trim() }
    }
    if (original.transactionType !== undefined && original.transactionType !== transactionType) {
      modifiedFields.transaction_type = { from: original.transactionType, to: transactionType }
    }
    if (original.tags !== undefined) {
      const origTags = (original.tags as string[]).sort().join(",")
      const newTags = [...tags].sort().join(",")
      if (origTags !== newTags) {
        modifiedFields.tag_ids = { from: original.tags, to: tags }
      }
    }

    return {
      proposalId: item.proposal.id,
      proposalFieldsModified: Object.keys(modifiedFields).length > 0,
      modifiedFields: Object.keys(modifiedFields).length > 0 ? modifiedFields : undefined,
    }
  }

  const isValid = description.trim() && amount && parseFloat(amount) > 0

  const handleCreate = async (closeAfter: boolean) => {
    if (!item || !isValid) return
    setIsSaving(true)
    try {
      await onCreateTransaction(
        item.id,
        {
          description: description.trim(),
          amount: parseFloat(amount),
          currency: item.statementTransaction.currency,
          date: date.toISOString().split("T")[0],
          vendorId: vendor || undefined,
          paymentMethodId: paymentMethod || undefined,
          tagIds: tags.length > 0 ? tags : undefined,
          transactionType,
        },
        buildProposalMeta()
      )
      if (closeAfter) {
        onOpenChange(false)
      }
      // If not closing, item gets removed and next item slides in
    } catch {
      // Error handled by parent
    } finally {
      setIsSaving(false)
    }
  }

  const handleReject = () => {
    if (!item) return
    onReject(item.id)
  }

  // ── Render ──

  // Completion state
  if (open && items.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle className="sr-only">Review complete</DialogTitle>
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-1">All caught up!</h3>
            <p className="text-sm text-muted-foreground">
              You&apos;ve reviewed all pending items.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!item) return null

  const hasAnyPrefill = aiPrefilled.size > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-5xl max-h-[90vh] p-0 gap-0 flex flex-col"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">
          Review item {currentIndex + 1} of {total}
        </DialogTitle>

        {/* ── Top navigation bar ── */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30 shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={goPrev}
              disabled={currentIndex === 0}
              className="h-8 w-8"
              title="Previous (Left arrow)"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium tabular-nums">
              {currentIndex + 1} of {total}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={goNext}
              disabled={currentIndex >= total - 1}
              className="h-8 w-8"
              title="Next (Right arrow)"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-3">
            {/* Source badge */}
            <Badge variant="outline" className="text-xs">
              {item.source === "email"
                ? "Email"
                : item.source === "merged"
                  ? "Cross-Source"
                  : "Statement"}
            </Badge>
            {item.isNew && (
              <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 text-xs">
                New
              </Badge>
            )}
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Arrow keys to navigate
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* ── Split pane content ── */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-[2fr_3fr] md:divide-x min-h-0">
          {/* Left panel: Source info */}
          <div className="overflow-y-auto p-5 border-b md:border-b-0">
            <SourceInfoPanel data={item} />
          </div>

          {/* Right panel: Form (new items) or Match info */}
          <div className="overflow-y-auto p-5">
            {item.isNew ? (
              <div className="space-y-4">
                {/* AI pre-fill banner */}
                {hasAnyPrefill && (
                  <div className="flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 dark:border-purple-800 dark:bg-purple-950/30">
                    <Zap className="h-4 w-4 text-purple-500 shrink-0" />
                    <p className="text-xs text-purple-700 dark:text-purple-300">
                      Some fields were auto-filled{item.proposal ? " by AI proposal" : " from the email"}.{" "}
                      <span className="text-purple-500">
                        <Zap className="inline h-3 w-3" />
                      </span>{" "}
                      indicates a smart pre-fill.
                    </p>
                  </div>
                )}

                {/* Transaction Type */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Type</Label>
                  <div className="relative flex gap-2" role="group" aria-label="Transaction type">
                    <Button
                      type="button"
                      size="sm"
                      variant={transactionType === "expense" ? "default" : "outline"}
                      className={cn("h-8", transactionType === "expense" && "bg-purple-600 hover:bg-purple-700")}
                      onClick={() => { setTransactionType("expense"); clearAiFlag("transactionType") }}
                    >
                      Expense
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={transactionType === "income" ? "default" : "outline"}
                      className={cn("h-8", transactionType === "income" && "bg-green-600 hover:bg-green-700")}
                      onClick={() => { setTransactionType("income"); clearAiFlag("transactionType") }}
                    >
                      Income
                    </Button>
                    {aiPrefilled.has("transactionType") && (
                      <ReasoningZap reasoning={fieldReasoning.transactionType} />
                    )}
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label htmlFor="review-description" className="text-xs font-medium">Description</Label>
                  <div className="relative">
                    <Input
                      id="review-description"
                      value={description}
                      onChange={(e) => { setDescription(e.target.value); clearAiFlag("description") }}
                      placeholder="Transaction description"
                      className={cn(
                        "h-9",
                        aiPrefilled.has("description") &&
                          "border-purple-300 bg-purple-50/50 pr-8 dark:border-purple-700 dark:bg-purple-950/20"
                      )}
                    />
                    {aiPrefilled.has("description") && (
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
                        <ReasoningZap reasoning={fieldReasoning.description} />
                      </span>
                    )}
                  </div>
                </div>

                {/* Amount */}
                <div className="space-y-1.5">
                  <Label htmlFor="review-amount" className="text-xs font-medium">Amount</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                      {item.statementTransaction.currency === "THB" ? "฿" : "$"}
                    </span>
                    <Input
                      id="review-amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="pl-7 h-9"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                      {item.statementTransaction.currency}
                    </span>
                  </div>
                </div>

                {/* Date */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Date</Label>
                  <DatePicker
                    date={date}
                    onDateChange={(d) => d && setDate(d)}
                    className="w-full h-9"
                  />
                </div>

                {/* Vendor */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Vendor</Label>
                  <div className="relative">
                    <SearchableComboBox
                      value={vendor}
                      selectedLabel={vendorLabel}
                      onValueChange={(val) => { setVendor(val); clearAiFlag("vendor") }}
                      onSearch={handleSearchVendors}
                      onAddNew={handleAddVendor}
                      placeholder="Search for vendor..."
                      searchPlaceholder="Type to search..."
                      emptyMessage="No vendors found."
                      label="Search or add a vendor"
                      className={cn(
                        "w-full",
                        aiPrefilled.has("vendor") &&
                          "border-purple-300 dark:border-purple-700 [&>button]:bg-purple-50/50 dark:[&>button]:bg-purple-950/20"
                      )}
                    />
                    {aiPrefilled.has("vendor") && (
                      <span className="absolute right-8 top-1/2 -translate-y-1/2 z-10">
                        <ReasoningZap reasoning={fieldReasoning.vendor} />
                      </span>
                    )}
                  </div>
                  {showVendorSuggestions && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs text-muted-foreground">Did you mean:</span>
                      {vendorAlternatives.map((alt) => (
                        <Badge
                          key={alt.id}
                          variant="outline"
                          className="cursor-pointer hover:bg-accent text-xs"
                          role="button"
                          tabIndex={0}
                          onClick={() => { setVendor(alt.id); setVendorLabel(alt.name); clearAiFlag("vendor") }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault()
                              setVendor(alt.id); setVendorLabel(alt.name); clearAiFlag("vendor")
                            }
                          }}
                        >
                          {alt.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Payment Method */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Payment Method</Label>
                  <div className="relative">
                    <ComboBox
                      options={paymentOptions}
                      value={paymentMethod}
                      onValueChange={(val) => { setPaymentMethod(val); clearAiFlag("paymentMethod") }}
                      onAddNew={handleAddPaymentMethod}
                      allowAdd={true}
                      placeholder="Select payment method"
                      searchPlaceholder="Search..."
                      addNewLabel="Add payment method"
                      label="Select or add a payment method"
                      disabled={paymentsLoading}
                      className={cn(
                        "w-full",
                        aiPrefilled.has("paymentMethod") &&
                          "border-purple-300 dark:border-purple-700 [&>button]:bg-purple-50/50 dark:[&>button]:bg-purple-950/20"
                      )}
                    />
                    {aiPrefilled.has("paymentMethod") && (
                      <span className="absolute right-8 top-1/2 -translate-y-1/2 z-10">
                        <ReasoningZap reasoning={fieldReasoning.paymentMethod} />
                      </span>
                    )}
                  </div>
                </div>

                {/* Tags */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Tags</Label>
                  <MultiSelectComboBox
                    options={tagOptions}
                    values={tags}
                    onValuesChange={setTags}
                    onAddNew={handleAddTag}
                    allowAdd={true}
                    placeholder="Select tags..."
                    searchPlaceholder="Search tags..."
                    addNewLabel="Add tag"
                    label="Select or add tags"
                    disabled={tagsLoading}
                    className="w-full"
                  />
                  {suggestedTags.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs text-muted-foreground">Suggested:</span>
                      {suggestedTags.map((tag) => (
                        <Badge
                          key={tag.id}
                          variant="secondary"
                          className="cursor-pointer hover:bg-secondary/80 text-xs"
                          role="button"
                          tabIndex={0}
                          onClick={() => setTags((prev) => [...prev, tag.id])}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault()
                              setTags((prev) => [...prev, tag.id])
                            }
                          }}
                        >
                          + {tag.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions for new items */}
                <div className="flex items-center gap-2 pt-3 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReject}
                    disabled={isSaving || isProcessing(item.id)}
                    className="text-muted-foreground"
                  >
                    <Ban className="h-3.5 w-3.5 mr-1.5" />
                    Reject
                  </Button>
                  <div className="flex-1" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCreate(true)}
                    disabled={!isValid || isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Create & Close
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleCreate(false)}
                    disabled={!isValid || isSaving}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {isSaving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    ) : (
                      <ArrowRight className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Create & Continue
                  </Button>
                </div>
              </div>
            ) : (
              /* Match items: show matched transaction info */
              <MatchedTransactionPanel
                data={item}
                onApprove={() => onApprove(item.id)}
                onReject={() => onReject(item.id)}
                onLinkManually={() => onLinkManually(item.id)}
                isProcessing={isProcessing(item.id)}
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
