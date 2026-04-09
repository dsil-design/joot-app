"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { ConfidenceIndicator } from "@/components/ui/confidence-indicator"
import { cn } from "@/lib/utils"
import {
  Calendar,
  Coins,
  Tag,
  Mail,
  Zap,
  RefreshCw,
  Eye,
  Copy,
  Check,
  AlertTriangle,
  Bot,
  Store,
  CreditCard,
  FileText,
  ArrowRight,
  Trash2,
  Send,
} from "lucide-react"
import type { EmailTransactionRow } from "@/hooks/use-email-transactions"
import { EmailViewerModal } from "./email-viewer-modal"
import { createClient } from "@/lib/supabase/client"
import { findPaymentMethodByParserKey, findPaymentMethodByCardLastFour } from "@/lib/proposals/payment-method-mapper"

interface EmailDetailPanelProps {
  emailTransaction: EmailTransactionRow
  onProcess?: (emailId: string) => void
  onDelete?: () => void
  onReopen?: (emailId: string) => void
  onFeedbackReprocess?: (emailId: string, userHint: string) => void
  isProcessing: boolean
  isProcessingExtraction?: boolean
  isDeleting?: boolean
  isReopening?: boolean
  isFeedbackProcessing?: boolean
}

export function EmailDetailPanel({
  emailTransaction,
  onProcess,
  onDelete,
  onReopen,
  onFeedbackReprocess,
  isProcessing,
  isProcessingExtraction,
  isDeleting,
  isReopening,
  isFeedbackProcessing,
}: EmailDetailPanelProps) {
  const [viewerOpen, setViewerOpen] = React.useState(false)

  const isUnprocessed = !emailTransaction.is_processed

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

          <div className="flex items-center justify-between w-full">
            <CopyableId id={emailTransaction.id} />
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                disabled={isDeleting}
                className="text-muted-foreground hover:text-red-600 hover:bg-red-50 gap-1.5"
              >
                <Trash2 className="size-3.5" />
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
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
            icon={<Coins className="h-4 w-4" />}
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
        {onProcess && !["matched", "imported", "skipped"].includes(emailTransaction.status) && (
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

        {/* Reopen button — only for rejected (skipped) emails */}
        {onReopen && emailTransaction.status === "skipped" && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onReopen(emailTransaction.id)}
            disabled={isReopening}
          >
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1", isReopening && "animate-spin")} />
            {isReopening ? "Reopening..." : "Reopen for review"}
          </Button>
        )}

        <div className="flex items-center justify-between w-full">
          <CopyableId id={emailTransaction.id} />
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              disabled={isDeleting}
              className="text-muted-foreground hover:text-red-600 hover:bg-red-50 gap-1.5"
            >
              <Trash2 className="size-3.5" />
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          )}
        </div>
      </div>

      {/* Right: Transaction Preview + AI Analysis */}
      <div className="space-y-6">
        <section className="space-y-4">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Transaction Preview
          </h4>
          <TransactionPreview emailTransaction={emailTransaction} />
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            AI Analysis
          </h4>
          <AiAnalysisBody emailTransaction={emailTransaction} />
          {onFeedbackReprocess && (
            <MessageAiControl
              emailId={emailTransaction.id}
              isProcessing={isFeedbackProcessing}
              onSubmit={onFeedbackReprocess}
            />
          )}
        </section>
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
    <div className="flex items-center gap-2 pt-2 min-w-0">
      <span className="text-[11px] text-muted-foreground font-mono truncate min-w-0">{id}</span>
      <button
        onClick={handleCopy}
        className="text-muted-foreground hover:text-foreground transition-colors p-2 -mr-2 shrink-0"
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

/**
 * Read-only preview of what a transaction would look like if created from this email.
 * Shows the smart/mapped values: amount, date, vendor mapping, payment method.
 */
function TransactionPreview({
  emailTransaction,
}: {
  emailTransaction: EmailTransactionRow
}) {
  const [vendorName, setVendorName] = React.useState<string | null>(null)
  const [paymentMethodName, setPaymentMethodName] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    async function loadMappings() {
      setIsLoading(true)

      try {
        // Look up vendor name if we have a vendor_id
        if (emailTransaction.vendor_id) {
          const { data: vendor } = await supabase
            .from("vendors")
            .select("name")
            .eq("id", emailTransaction.vendor_id)
            .single()
          if (!cancelled && vendor) setVendorName(vendor.name)
        }

        // Look up payment method: card last 4 takes priority, then parser_key
        if (emailTransaction.payment_card_last_four || emailTransaction.parser_key) {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const { data: methods } = await supabase
              .from("payment_methods")
              .select("id, name, card_last_four")
              .eq("user_id", user.id)
            if (!cancelled && methods) {
              // Try card last four first (most specific)
              let matched = emailTransaction.payment_card_last_four
                ? findPaymentMethodByCardLastFour(emailTransaction.payment_card_last_four, methods)
                : null
              // Fall back to parser key
              if (!matched && emailTransaction.parser_key) {
                matched = findPaymentMethodByParserKey(emailTransaction.parser_key, methods)
              }
              if (matched) setPaymentMethodName(matched.name)
            }
          }
        }
      } catch {
        // Silently fail — preview is informational only
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadMappings()
    return () => { cancelled = true }
  }, [emailTransaction.vendor_id, emailTransaction.parser_key, emailTransaction.payment_card_last_four])

  const hasAmount = emailTransaction.amount != null
  const hasDate = !!emailTransaction.transaction_date
  const hasVendorRaw = !!emailTransaction.vendor_name_raw
  const hasDescription = !!emailTransaction.description

  // Nothing extracted at all
  if (!hasAmount && !hasDate && !hasVendorRaw && !hasDescription) {
    return (
      <p className="text-sm text-muted-foreground italic">
        No transaction data extracted from this email.
      </p>
    )
  }

  return (
    <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
      {/* Date */}
      <PreviewRow
        icon={<Calendar className="h-4 w-4" />}
        label="Date"
        value={
          hasDate
            ? new Date(emailTransaction.transaction_date!).toLocaleDateString("en-US", {
                year: "numeric", month: "short", day: "numeric",
              })
            : emailTransaction.email_date
              ? new Date(emailTransaction.email_date).toLocaleDateString("en-US", {
                  year: "numeric", month: "short", day: "numeric",
                }) + " (email date)"
              : "—"
        }
      />

      {/* Description */}
      <PreviewRow
        icon={<FileText className="h-4 w-4" />}
        label="Description"
        value={hasDescription ? emailTransaction.description! : "—"}
      />

      {/* Vendor mapping */}
      <PreviewRow
        icon={<Store className="h-4 w-4" />}
        label="Vendor"
        value={
          <span className="flex items-center gap-1.5 flex-wrap">
            <span className="text-muted-foreground">{emailTransaction.vendor_name_raw || "—"}</span>
            {vendorName && (
              <>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <Badge variant="outline" className="text-xs font-medium">
                  {vendorName}
                </Badge>
              </>
            )}
            {!vendorName && hasVendorRaw && !isLoading && (
              <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-200">
                Unmapped
              </Badge>
            )}
          </span>
        }
      />

      {/* Payment method */}
      <PreviewRow
        icon={<CreditCard className="h-4 w-4" />}
        label="Payment"
        value={
          paymentMethodName
            ? paymentMethodName
            : emailTransaction.payment_card_last_four
              ? <span className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">
                    {emailTransaction.payment_card_type || "Card"} •••• {emailTransaction.payment_card_last_four}
                  </span>
                  <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-200">
                    Unmapped
                  </Badge>
                </span>
              : "—"
        }
      />

      {/* Amount */}
      <PreviewRow
        icon={<Coins className="h-4 w-4" />}
        label="Amount"
        value={
          hasAmount
            ? formatAmount(emailTransaction.amount, emailTransaction.currency)
            : "—"
        }
      />
    </div>
  )
}

function PreviewRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="text-muted-foreground mt-0.5">{icon}</span>
      <span className="text-muted-foreground shrink-0 w-20">{label}</span>
      <span className="font-medium break-words min-w-0">{value}</span>
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

function AiAnalysisBody({
  emailTransaction,
}: {
  emailTransaction: EmailTransactionRow
}) {
  const reasoning = emailTransaction.ai_reasoning

  if (!reasoning) {
    return (
      <p className="text-sm text-muted-foreground italic">
        No AI analysis available yet.
      </p>
    )
  }

  if (isAiError(reasoning)) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>AI Processing Error</AlertTitle>
        <AlertDescription>{reasoning}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="flex items-start gap-2 text-sm text-muted-foreground">
      <Bot className="h-4 w-4 shrink-0 mt-0.5" />
      <p className="leading-relaxed">{reasoning}</p>
    </div>
  )
}

function MessageAiControl({
  emailId,
  isProcessing,
  onSubmit,
}: {
  emailId: string
  isProcessing?: boolean
  onSubmit: (emailId: string, hint: string) => void
}) {
  const [open, setOpen] = React.useState(false)
  const [text, setText] = React.useState("")

  const submit = () => {
    const hint = text.trim()
    if (!hint) return
    onSubmit(emailId, hint)
    setOpen(false)
    setText("")
  }

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={isProcessing}
      >
        <Bot className={cn("h-3.5 w-3.5 mr-1", isProcessing && "animate-spin")} />
        {isProcessing ? "Processing..." : "Message AI"}
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit()
          if (e.key === "Escape") {
            setOpen(false)
            setText("")
          }
        }}
        placeholder="e.g. bank transfer for $50"
        className="h-8 text-sm flex-1"
        style={{ fontSize: "16px" }}
        autoFocus
        disabled={isProcessing}
      />
      <Button
        variant="ghost"
        size="sm"
        onClick={submit}
        disabled={!text.trim() || isProcessing}
        className="h-8 w-8 p-0"
      >
        {isProcessing ? (
          <Bot className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Send className="h-3.5 w-3.5" />
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
