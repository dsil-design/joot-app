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
import { Input } from "@/components/ui/input"
import { DatePicker } from "@/components/ui/date-picker"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Checkbox } from "@/components/ui/checkbox"
import { getCurrencySymbolSync } from "@/lib/utils/currency-symbols"
import { format } from "date-fns"
import type { ExpectedTransaction } from "@/lib/types/recurring-transactions"
import type { CurrencyType } from "@/lib/supabase/types"

export interface MarkPaidDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  expectedTransaction: ExpectedTransaction | null
  onMarkPaid: (data: MarkPaidData) => Promise<void>
}

export interface MarkPaidData {
  expectedTransactionId: string
  createActualTransaction: boolean
  actualAmount?: number
  transactionDate?: Date
  description?: string
}

/**
 * Dialog to manually mark expected transaction as paid
 * Optionally creates an actual transaction record
 */
export function MarkPaidDialog({
  open,
  onOpenChange,
  expectedTransaction,
  onMarkPaid,
}: MarkPaidDialogProps) {
  const [createActual, setCreateActual] = React.useState(true)
  const [amount, setAmount] = React.useState("")
  const [transactionDate, setTransactionDate] = React.useState<Date | undefined>(undefined)
  const [description, setDescription] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Initialize form when transaction changes
  React.useEffect(() => {
    if (expectedTransaction && open) {
      setAmount(expectedTransaction.expected_amount.toString())
      setTransactionDate(new Date(expectedTransaction.expected_date))
      setDescription(
        expectedTransaction.vendor?.name || expectedTransaction.description
      )
      setCreateActual(true)
    }
  }, [expectedTransaction, open])

  // Reset form when dialog closes
  React.useEffect(() => {
    if (!open) {
      setAmount("")
      setTransactionDate(undefined)
      setDescription("")
      setCreateActual(true)
    }
  }, [open])

  if (!expectedTransaction) return null

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const data: MarkPaidData = {
        expectedTransactionId: expectedTransaction.id,
        createActualTransaction: createActual,
      }

      if (createActual) {
        data.actualAmount = parseFloat(amount)
        data.transactionDate = transactionDate
        data.description = description
      }

      await onMarkPaid(data)
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const currencySymbol = getCurrencySymbolSync(expectedTransaction.original_currency)
  const isFormValid =
    !createActual ||
    (amount && parseFloat(amount) > 0 && transactionDate && description.trim())

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Mark as Paid</DialogTitle>
          <DialogDescription>
            Manually mark this expected transaction as paid
          </DialogDescription>
        </DialogHeader>

        {/* Expected Transaction Info */}
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

        {/* Create Actual Transaction Option */}
        <div className="flex items-start gap-3 p-4 border rounded-lg">
          <Checkbox
            id="create-actual"
            checked={createActual}
            onCheckedChange={(checked) => setCreateActual(checked === true)}
          />
          <div className="flex-1">
            <Label
              htmlFor="create-actual"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Create actual transaction record
            </Label>
            <p className="text-xs text-zinc-500 mt-1">
              This will create a transaction in your transaction list
            </p>
          </div>
        </div>

        {/* Actual Transaction Form */}
        {createActual && (
          <div className="space-y-4 border-t pt-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Actual Amount</Label>
              <CurrencyInput
                id="amount"
                value={amount}
                onChange={setAmount}
                currency={expectedTransaction.original_currency as CurrencyType}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Transaction Date</Label>
              <DatePicker
                date={transactionDate}
                onDateChange={setTransactionDate}
                placeholder="Select date"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)}
                placeholder="Transaction description"
              />
            </div>

            <div className="text-xs text-zinc-500">
              Payment method and vendor will be copied from the expected transaction.
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isFormValid || isSubmitting}>
            {isSubmitting ? "Saving..." : "Mark as Paid"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
