"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { getCurrencySymbolSync } from "@/lib/utils/currency-symbols"
import { format } from "date-fns"
import type { ExpectedTransaction } from "@/lib/types/recurring-transactions"

export interface SkipTransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  expectedTransaction: ExpectedTransaction | null
  onSkip: (id: string, notes?: string) => Promise<void>
}

/**
 * Dialog to skip an expected transaction
 * Allows user to add optional notes explaining why it's being skipped
 */
export function SkipTransactionDialog({
  open,
  onOpenChange,
  expectedTransaction,
  onSkip,
}: SkipTransactionDialogProps) {
  const [notes, setNotes] = React.useState("")
  const [isSkipping, setIsSkipping] = React.useState(false)

  // Reset notes when dialog opens/closes
  React.useEffect(() => {
    if (!open) {
      setNotes("")
    }
  }, [open])

  if (!expectedTransaction) return null

  const handleSkip = async () => {
    setIsSkipping(true)
    try {
      await onSkip(expectedTransaction.id, notes || undefined)
      onOpenChange(false)
    } finally {
      setIsSkipping(false)
    }
  }

  const currencySymbol = getCurrencySymbolSync(expectedTransaction.original_currency)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Skip Transaction</DialogTitle>
          <DialogDescription>
            Mark this expected transaction as skipped for this month
          </DialogDescription>
        </DialogHeader>

        {/* Transaction Info */}
        <div className="border rounded-lg p-4 bg-zinc-50">
          <div className="space-y-1">
            <h4 className="font-medium text-sm text-zinc-900">
              {expectedTransaction.vendor?.name || expectedTransaction.description}
            </h4>
            <p className="text-xs text-zinc-500">
              Expected on {format(new Date(expectedTransaction.expected_date), "MMM d, yyyy")}
            </p>
            <p className="text-sm font-semibold text-zinc-900 mt-2">
              {currencySymbol}
              {expectedTransaction.expected_amount.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">
            Notes <span className="text-zinc-400">(optional)</span>
          </Label>
          <Textarea
            id="notes"
            placeholder="Why are you skipping this transaction? e.g., 'Already paid in advance' or 'Not applicable this month'"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="resize-none"
          />
        </div>

        {/* Explanation */}
        <div className="text-xs text-zinc-500 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <strong className="text-blue-900">What does "skip" mean?</strong>
          <p className="mt-1">
            Skipping marks this transaction as not applicable for this month. It won't count
            towards your variance calculations and won't appear as pending or overdue.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSkipping}>
            Cancel
          </Button>
          <Button onClick={handleSkip} disabled={isSkipping}>
            {isSkipping ? "Skipping..." : "Skip Transaction"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
