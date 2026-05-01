"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Bot, Check, Copy, ExternalLink, Eye, Mail, Send, Unlink } from "lucide-react"
import { format, parseISO } from "date-fns"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/utils"
import { EmailViewerModal } from "./email-viewer-modal"

export interface EmailSourceCardData {
  id: string
  email_transaction_id?: string | null
  subject: string | null
  from_address: string | null
  from_name: string | null
  email_date: string | null
  amount: number | null
  currency: string | null
  extraction_confidence: number | null
  match_confidence: number | null
  match_method: string | null
  status: string
  ai_classification?: string | null
  ai_suggested_skip?: boolean | null
}

function MatchMethodBadge({ method, status }: { method: string | null; status: string | null }) {
  if (status === "imported") {
    return (
      <Badge className="bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-0 text-[12px] font-normal">
        Created from email
      </Badge>
    )
  }
  if (method === "auto") {
    return (
      <Badge className="bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300 border-0 text-[12px] font-normal">
        Auto-linked
      </Badge>
    )
  }
  if (method === "manual") {
    return (
      <Badge className="bg-muted text-muted-foreground border-0 text-[12px] font-normal">
        Manually linked
      </Badge>
    )
  }
  return null
}

export function EmailSourceCard({
  source,
  onUnlink,
  onReprocessed,
}: {
  source: EmailSourceCardData
  onUnlink?: () => void
  onReprocessed?: () => void
}) {
  const [viewerOpen, setViewerOpen] = React.useState(false)
  const [feedbackOpen, setFeedbackOpen] = React.useState(false)
  const [feedbackText, setFeedbackText] = React.useState("")
  const [isProcessing, setIsProcessing] = React.useState(false)

  const canMessageAi = !!source.email_transaction_id

  const sendFeedback = async () => {
    const hint = feedbackText.trim()
    if (!hint || !source.email_transaction_id) return
    setIsProcessing(true)
    try {
      const res = await fetch(`/api/emails/${source.id}/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedback: {
            emailTransactionId: source.email_transaction_id,
            originalClassification: source.ai_classification ?? null,
            originalSkip: source.ai_suggested_skip ?? null,
            subject: source.subject,
            fromAddress: source.from_address,
            userHint: hint,
          },
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to reprocess")
      }
      const result = await res.json()
      const et = result?.emailTransaction
      toast.success("Email reprocessed with feedback", {
        description: et?.amount
          ? `Extracted ${et.currency} ${et.amount} from ${et.vendor_name_raw || "email"}`
          : "Reprocessed but no transaction data found",
      })
      setFeedbackOpen(false)
      setFeedbackText("")
      onReprocessed?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reprocess")
    } finally {
      setIsProcessing(false)
    }
  }

  const formattedDate = source.email_date
    ? format(parseISO(source.email_date), "MMM d, yyyy")
    : null

  const fromLine = source.from_name
    ? `${source.from_name} <${source.from_address}>`
    : source.from_address

  return (
    <>
      <div className="bg-muted rounded-lg border border-border p-4 w-full text-left">
        <div className="flex items-start gap-3">
          <Mail className="size-4 text-muted-foreground mt-0.5 shrink-0" strokeWidth={1.5} />
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <p className="text-[14px] font-normal text-foreground truncate">
              {source.subject || "No subject"}
            </p>
            {fromLine && (
              <p className="text-[14px] font-normal text-muted-foreground truncate">
                {fromLine}
              </p>
            )}
            {formattedDate && (
              <p className="text-[14px] font-normal text-muted-foreground">
                {formattedDate}
              </p>
            )}
            {source.amount != null && source.currency && (
              <p className="text-[14px] font-normal text-foreground">
                {formatCurrency(source.amount, source.currency)} {source.currency}
              </p>
            )}
            {source.extraction_confidence !== null && (
              <p className="text-[14px] font-normal text-muted-foreground">
                {source.extraction_confidence}% extraction confidence
              </p>
            )}
            <div className="flex items-center gap-2 mt-1">
              <MatchMethodBadge method={source.match_method} status={source.status} />
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setViewerOpen(true)}
              >
                <Eye className="size-3.5 mr-1" />
                View Email
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                asChild
              >
                <a
                  href={`/imports/emails?search=${encodeURIComponent(source.id)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="size-3.5 mr-1" />
                  Open in Email Hub
                </a>
              </Button>
              {canMessageAi && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setFeedbackOpen((v) => !v)}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <Bot className="size-3.5 mr-1 animate-spin" />
                  ) : (
                    <Bot className="size-3.5 mr-1" />
                  )}
                  {isProcessing ? "Processing..." : "Message AI"}
                </Button>
              )}
              {onUnlink && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                  onClick={onUnlink}
                >
                  <Unlink className="size-3.5 mr-1" />
                  Unlink
                </Button>
              )}
            </div>
            {feedbackOpen && canMessageAi && (
              <div className="flex items-center gap-1.5 mt-1">
                <Input
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && feedbackText.trim()) {
                      sendFeedback()
                    }
                    if (e.key === "Escape") {
                      setFeedbackOpen(false)
                      setFeedbackText("")
                    }
                  }}
                  placeholder="e.g. this IS a transaction, extract THB 399"
                  className="h-9 text-sm sm:h-7 sm:text-xs flex-1"
                  style={{ fontSize: "16px" }}
                  autoFocus
                  disabled={isProcessing}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={sendFeedback}
                  disabled={!feedbackText.trim() || isProcessing}
                  className="h-9 w-9 sm:h-7 sm:w-auto sm:px-2 p-0"
                >
                  {isProcessing ? (
                    <Bot className="size-3.5 animate-spin" />
                  ) : (
                    <Send className="size-3.5" />
                  )}
                </Button>
              </div>
            )}
            <CopyableEmailId id={source.id} />
          </div>
        </div>
      </div>

      <EmailViewerModal
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        emailId={source.id}
        subject={source.subject}
        fromName={source.from_name}
        fromAddress={source.from_address}
        emailDate={source.email_date}
      />
    </>
  )
}

function CopyableEmailId({ id }: { id: string }) {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center gap-1.5 mt-1">
      <span className="text-[12px] text-muted-foreground font-mono truncate">{id}</span>
      <button
        onClick={handleCopy}
        className="text-muted-foreground hover:text-foreground transition-colors p-0.5 shrink-0"
        aria-label="Copy email ID"
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </button>
    </div>
  )
}
