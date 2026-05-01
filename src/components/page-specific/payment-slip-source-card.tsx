"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Check, Copy, Eye, Receipt, Unlink } from "lucide-react"
import { format, parseISO } from "date-fns"
import { formatCurrency } from "@/lib/utils"
import { PaymentSlipViewerModal } from "./payment-slip-viewer-modal"

export interface PaymentSlipSourceCardData {
  id: string
  filename: string | null
  amount: number | null
  currency: string | null
  transaction_date: string | null
  sender_name: string | null
  recipient_name: string | null
  sender_bank: string | null
  recipient_bank: string | null
  extraction_confidence: number | null
  match_confidence: number | null
  status: string | null
}

export function PaymentSlipSourceCard({
  source,
  onUnlink,
}: {
  source: PaymentSlipSourceCardData
  onUnlink?: () => void
}) {
  const [viewerOpen, setViewerOpen] = React.useState(false)
  const formattedDate = source.transaction_date
    ? format(parseISO(source.transaction_date), "MMM d, yyyy")
    : null

  const transferLine = [
    source.sender_name && `From ${source.sender_name}`,
    source.recipient_name && `to ${source.recipient_name}`,
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <>
    <div className="bg-muted rounded-lg border border-border p-4 w-full text-left">
      <div className="flex items-start gap-3">
        <Receipt className="size-4 text-muted-foreground mt-0.5 shrink-0" strokeWidth={1.5} />
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <p className="text-[14px] font-normal text-foreground truncate">
            {source.filename || "Payment slip"}
          </p>
          {transferLine && (
            <p className="text-[14px] font-normal text-muted-foreground truncate">
              {transferLine}
            </p>
          )}
          {formattedDate && (
            <p className="text-[14px] font-normal text-muted-foreground">{formattedDate}</p>
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
            <Badge className="bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-0 text-[12px] font-normal">
              Payment slip
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setViewerOpen(true)}
            >
              <Eye className="size-3.5 mr-1" />
              View slip
            </Button>
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
          <CopyableId id={source.id} />
        </div>
      </div>
    </div>
    <PaymentSlipViewerModal
      open={viewerOpen}
      onOpenChange={setViewerOpen}
      slipId={source.id}
      filename={source.filename ?? "Payment slip"}
    />
    </>
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
    <div className="flex items-center gap-1.5 mt-1">
      <span className="text-[12px] text-muted-foreground font-mono truncate">{id}</span>
      <button
        onClick={handleCopy}
        className="text-muted-foreground hover:text-foreground transition-colors p-0.5 shrink-0"
        aria-label="Copy payment slip ID"
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </button>
    </div>
  )
}
