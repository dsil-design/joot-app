"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DetailRow } from "@/components/ui/detail-row"
import {
  ArrowRight,
  Calendar,
  Coins,
  CreditCard,
  FileText,
  Link2,
  Sparkles,
  Store,
  Tag as TagIcon,
  Unlink,
  UserCheck,
} from "lucide-react"
import { cn, formatAmountOrDash } from "@/lib/utils"

export interface LinkedTransactionCardData {
  id: string
  description: string | null
  amount: number | null
  original_currency: string | null
  transaction_date: string | null
  reference_amount: number | null
  reference_currency: string | null
  vendor: { id: string; name: string } | null
  payment_method: { id: string; name: string; card_last_four: string | null } | null
  tags: Array<{ id: string; name: string; color: string }>
}

interface LinkedTransactionCardProps {
  transaction: LinkedTransactionCardData
  /** "matched" rows distinguish auto/manual; "imported" rows mean the
   * transaction was created from this email. */
  matchMethod: string | null
  matchConfidence: number | null
  isImported: boolean
  onUnlink?: () => void
  onNavigated?: () => void
  isUnlinking?: boolean
  /** When false (peek modal), navigation closes the host modal first. */
  closeOnNavigate?: boolean
}

/**
 * Shared transaction summary card. Used in two places:
 *   1. Inside LinkedTransactionPeekModal (compact, modal-shaped)
 *   2. Inside the expanded EmailDetailPanel right column
 * Both surface the same data with the same actions.
 */
export function LinkedTransactionCard({
  transaction,
  matchMethod,
  matchConfidence,
  isImported,
  onUnlink,
  onNavigated,
  isUnlinking,
  closeOnNavigate,
}: LinkedTransactionCardProps) {
  const router = useRouter()

  const navigate = () => {
    if (closeOnNavigate && onNavigated) {
      onNavigated()
    }
    router.push(`/transactions/${transaction.id}`)
  }

  return (
    <div className="space-y-3">
      <ProvenanceLine
        matchMethod={matchMethod}
        matchConfidence={matchConfidence}
        isImported={isImported}
      />

      <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
        <DetailRow
          icon={<Store className="h-4 w-4" />}
          label="Vendor"
          value={transaction.vendor?.name || transaction.description || "—"}
        />
        <DetailRow
          icon={<Coins className="h-4 w-4" />}
          label="Amount"
          value={
            <span className="flex flex-wrap items-baseline gap-x-2">
              <span>{formatAmountOrDash(transaction.amount, transaction.original_currency)}</span>
              {transaction.reference_amount != null && transaction.reference_currency && (
                <span className="text-xs text-muted-foreground font-normal">
                  ({formatAmountOrDash(transaction.reference_amount, transaction.reference_currency)})
                </span>
              )}
            </span>
          }
        />
        <DetailRow
          icon={<Calendar className="h-4 w-4" />}
          label="Date"
          value={
            transaction.transaction_date
              ? new Date(transaction.transaction_date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })
              : "—"
          }
        />
        <DetailRow
          icon={<CreditCard className="h-4 w-4" />}
          label="Payment"
          value={
            transaction.payment_method
              ? transaction.payment_method.card_last_four
                ? `${transaction.payment_method.name} •••• ${transaction.payment_method.card_last_four}`
                : transaction.payment_method.name
              : "—"
          }
        />
        {transaction.tags.length > 0 && (
          <DetailRow
            icon={<TagIcon className="h-4 w-4" />}
            label="Tags"
            value={
              <span className="flex flex-wrap gap-1">
                {transaction.tags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant="outline"
                    className="text-xs font-normal"
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.name}
                  </Badge>
                ))}
              </span>
            }
          />
        )}
        {transaction.description && (
          <DetailRow
            icon={<FileText className="h-4 w-4" />}
            label="Notes"
            value={transaction.description}
          />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={navigate} size="sm" className="gap-1.5">
          View Transaction
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
        {onUnlink && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onUnlink}
            disabled={isUnlinking}
            className="text-muted-foreground hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 gap-1.5"
          >
            <Unlink className="h-3.5 w-3.5" />
            {isUnlinking ? "Unlinking..." : "Unlink"}
          </Button>
        )}
      </div>
    </div>
  )
}

function ProvenanceLine({
  matchMethod,
  matchConfidence,
  isImported,
}: {
  matchMethod: string | null
  matchConfidence: number | null
  isImported: boolean
}) {
  const lowConfidence = matchConfidence != null && matchConfidence < 70

  let icon: React.ReactNode
  let label: string
  if (isImported) {
    icon = <Sparkles className="h-3.5 w-3.5" />
    label = "Created from this email"
  } else if (matchMethod === "manual") {
    icon = <UserCheck className="h-3.5 w-3.5" />
    label = "Linked manually"
  } else {
    icon = <Link2 className="h-3.5 w-3.5" />
    label = "Auto-linked"
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded",
        lowConfidence
          ? "bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200"
          : "bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-200"
      )}
    >
      {icon}
      <span>{label}</span>
      {matchConfidence != null && !isImported && (
        <span className="opacity-80">· {matchConfidence}% confidence</span>
      )}
      {lowConfidence && <span className="opacity-80">· review suggested</span>}
    </div>
  )
}
