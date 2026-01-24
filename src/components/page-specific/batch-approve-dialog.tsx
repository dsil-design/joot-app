"use client"

import * as React from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Progress } from "@/components/ui/progress"
import { Check, AlertCircle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Item preview for batch approve
 */
export interface BatchApproveItem {
  id: string
  description: string
  amount: number
  currency: string
  date: string
  confidence?: number
}

/**
 * BatchApproveDialog props
 */
export interface BatchApproveDialogProps {
  /**
   * Whether the dialog is open
   */
  open: boolean

  /**
   * Callback when dialog closed
   */
  onOpenChange: (open: boolean) => void

  /**
   * Items to approve
   */
  items: BatchApproveItem[]

  /**
   * Callback when confirmed
   */
  onConfirm: () => Promise<void>

  /**
   * Title override
   */
  title?: string

  /**
   * Description override
   */
  description?: string
}

/**
 * Format currency amount
 */
function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount))
}

/**
 * Format date
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
  } catch {
    return dateString
  }
}

/**
 * BatchApproveDialog Component
 *
 * Confirmation dialog for batch approving high-confidence matches.
 * Shows:
 * - Count of items to approve
 * - Total amount
 * - Preview of first 5 transactions
 * - Progress indicator during operation
 */
export function BatchApproveDialog({
  open,
  onOpenChange,
  items,
  onConfirm,
  title = "Approve All High-Confidence Matches",
  description,
}: BatchApproveDialogProps) {
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [progress, setProgress] = React.useState(0)
  const [error, setError] = React.useState<string | null>(null)

  // Calculate totals by currency
  const totalsByCurrency = React.useMemo(() => {
    const totals: Record<string, number> = {}
    items.forEach((item) => {
      if (!totals[item.currency]) {
        totals[item.currency] = 0
      }
      totals[item.currency] += Math.abs(item.amount)
    })
    return totals
  }, [items])

  // First 5 items for preview
  const previewItems = items.slice(0, 5)
  const remainingCount = items.length - previewItems.length

  const handleConfirm = async () => {
    setIsProcessing(true)
    setProgress(10)
    setError(null)

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90))
      }, 200)

      await onConfirm()

      clearInterval(progressInterval)
      setProgress(100)

      // Close after short delay to show completion
      setTimeout(() => {
        setIsProcessing(false)
        setProgress(0)
        onOpenChange(false)
      }, 500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve items")
      setIsProcessing(false)
      setProgress(0)
    }
  }

  const handleCancel = () => {
    if (!isProcessing) {
      onOpenChange(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleCancel}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-500" />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {description || (
              <>
                You are about to approve <strong>{items.length}</strong>{" "}
                high-confidence match{items.length !== 1 ? "es" : ""}.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Summary */}
        <div className="space-y-4">
          {/* Total amounts */}
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-sm text-muted-foreground mb-1">Total amount:</p>
            <div className="flex flex-wrap gap-3">
              {Object.entries(totalsByCurrency).map(([currency, amount]) => (
                <span
                  key={currency}
                  className="text-lg font-semibold"
                >
                  {formatAmount(amount, currency)}
                </span>
              ))}
            </div>
          </div>

          {/* Preview list */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Transactions to approve:
            </p>
            <ul className="space-y-2 text-sm">
              {previewItems.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between py-1 border-b last:border-0"
                >
                  <span className="truncate max-w-[200px]">
                    {item.description}
                  </span>
                  <span className="text-muted-foreground shrink-0 ml-2">
                    {formatAmount(item.amount, item.currency)}{" "}
                    <span className="text-xs">({formatDate(item.date)})</span>
                  </span>
                </li>
              ))}
            </ul>
            {remainingCount > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                ...and {remainingCount} more
              </p>
            )}
          </div>

          {/* Progress indicator */}
          {isProcessing && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                Processing... {Math.round(progress)}%
              </p>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleConfirm()
            }}
            disabled={isProcessing || items.length === 0}
            className={cn(
              "bg-green-600 hover:bg-green-700",
              isProcessing && "opacity-50"
            )}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Approve {items.length} Match{items.length !== 1 ? "es" : ""}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
