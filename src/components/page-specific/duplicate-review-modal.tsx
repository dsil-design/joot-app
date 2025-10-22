"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ConfidenceBadge } from "@/components/ui/confidence-badge"
import { ArrowRight, Check, AlertCircle } from "lucide-react"
import { DuplicateSuggestionData } from "./duplicate-suggestion-card"
import { createClient } from "@/lib/supabase/client"
import { TransactionWithVendorAndPayment } from "@/lib/supabase/types"
import { formatCurrency } from "@/lib/utils"

interface DuplicateReviewModalProps {
  suggestion: DuplicateSuggestionData | null
  open: boolean
  onClose: () => void
  onMerge: (suggestionId: string, sourceId: string, targetId: string) => void
  onIgnore: (suggestionId: string) => void
}

export function DuplicateReviewModal({
  suggestion,
  open,
  onClose,
  onMerge,
  onIgnore,
}: DuplicateReviewModalProps) {
  const [sourceTransactions, setSourceTransactions] = useState<
    TransactionWithVendorAndPayment[]
  >([])
  const [targetTransactions, setTargetTransactions] = useState<
    TransactionWithVendorAndPayment[]
  >([])
  const [isLoading, setIsLoading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    if (open && suggestion) {
      fetchTransactions()
    }
  }, [open, suggestion])

  const fetchTransactions = async () => {
    if (!suggestion) return

    setIsLoading(true)
    try {
      const supabase = createClient()

      // Fetch transactions for source vendor
      const { data: sourceData } = await supabase
        .from("transactions")
        .select("*")
        .eq("vendor_id", suggestion.sourceVendor.id)
        .order("transaction_date", { ascending: false })
        .limit(10)

      // Fetch transactions for target vendor
      const { data: targetData } = await supabase
        .from("transactions")
        .select("*")
        .eq("vendor_id", suggestion.targetVendor.id)
        .order("transaction_date", { ascending: false })
        .limit(10)

      setSourceTransactions((sourceData as TransactionWithVendorAndPayment[]) || [])
      setTargetTransactions((targetData as TransactionWithVendorAndPayment[]) || [])
    } catch (error) {
      console.error("Error fetching transactions:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleMerge = async () => {
    if (!suggestion) return
    setIsProcessing(true)
    try {
      await onMerge(
        suggestion.id,
        suggestion.sourceVendor.id,
        suggestion.targetVendor.id
      )
      onClose()
    } finally {
      setIsProcessing(false)
    }
  }

  const handleIgnore = async () => {
    if (!suggestion) return
    setIsProcessing(true)
    try {
      await onIgnore(suggestion.id)
      onClose()
    } finally {
      setIsProcessing(false)
    }
  }

  if (!suggestion) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review Duplicate Merge</DialogTitle>
          <DialogDescription>
            Review the details below to decide if these vendors should be merged.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Confidence Badge */}
          <div className="flex items-center justify-center">
            <ConfidenceBadge
              confidence={suggestion.confidence}
              showPercentage
              className="text-base px-4 py-2"
            />
          </div>

          {/* Vendor Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-4 items-start">
            {/* Source Vendor */}
            <div className="border rounded-lg p-4 space-y-2">
              <div className="text-sm font-medium text-muted-foreground">
                MERGE FROM (Source)
              </div>
              <div className="text-lg font-semibold">
                {suggestion.sourceVendor.name}
              </div>
              <div className="text-sm text-muted-foreground">
                {suggestion.sourceVendor.transactionCount} transaction
                {suggestion.sourceVendor.transactionCount !== 1 ? "s" : ""}
              </div>
            </div>

            {/* Arrow */}
            <div className="flex items-center justify-center py-8 md:py-0">
              <ArrowRight className="h-6 w-6 text-muted-foreground" />
            </div>

            {/* Target Vendor */}
            <div className="border rounded-lg p-4 space-y-2 bg-green-50 dark:bg-green-950">
              <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                MERGE INTO (Target) <Check className="h-4 w-4 text-green-600" />
              </div>
              <div className="text-lg font-semibold">
                {suggestion.targetVendor.name}
              </div>
              <div className="text-sm text-muted-foreground">
                {suggestion.targetVendor.transactionCount} transaction
                {suggestion.targetVendor.transactionCount !== 1 ? "s" : ""}
              </div>
            </div>
          </div>

          {/* Reasons */}
          <div className="border rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <AlertCircle className="h-4 w-4" />
              Why are these similar?
            </div>
            <ul className="text-sm text-muted-foreground space-y-1 ml-6">
              {suggestion.reasons.map((reason, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span>•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Transaction Previews */}
          <div className="space-y-4">
            <div className="text-sm font-medium">Transaction Previews</div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Source Transactions */}
              <div className="border rounded-lg p-4 space-y-3">
                <div className="text-sm font-medium">
                  {suggestion.sourceVendor.name} ({sourceTransactions.length})
                </div>
                {isLoading ? (
                  <div className="text-sm text-muted-foreground">Loading...</div>
                ) : sourceTransactions.length > 0 ? (
                  <div className="space-y-2">
                    {sourceTransactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="text-sm flex justify-between items-start gap-2 pb-2 border-b last:border-b-0"
                      >
                        <div className="flex-1">
                          <div className="font-medium">
                            {new Date(transaction.transaction_date).toLocaleDateString()}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {transaction.description || "No description"}
                          </div>
                        </div>
                        <div className="font-medium whitespace-nowrap">
                          {formatCurrency(
                            transaction.amount,
                            transaction.original_currency
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    No transactions found
                  </div>
                )}
                {sourceTransactions.length > 0 &&
                  sourceTransactions.length < suggestion.sourceVendor.transactionCount && (
                    <div className="text-xs text-muted-foreground">
                      Showing {sourceTransactions.length} of{" "}
                      {suggestion.sourceVendor.transactionCount} transactions
                    </div>
                  )}
              </div>

              {/* Target Transactions */}
              <div className="border rounded-lg p-4 space-y-3">
                <div className="text-sm font-medium">
                  {suggestion.targetVendor.name} ({targetTransactions.length})
                </div>
                {isLoading ? (
                  <div className="text-sm text-muted-foreground">Loading...</div>
                ) : targetTransactions.length > 0 ? (
                  <div className="space-y-2">
                    {targetTransactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="text-sm flex justify-between items-start gap-2 pb-2 border-b last:border-b-0"
                      >
                        <div className="flex-1">
                          <div className="font-medium">
                            {new Date(transaction.transaction_date).toLocaleDateString()}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {transaction.description || "No description"}
                          </div>
                        </div>
                        <div className="font-medium whitespace-nowrap">
                          {formatCurrency(
                            transaction.amount,
                            transaction.original_currency
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    No transactions found
                  </div>
                )}
                {targetTransactions.length > 0 &&
                  targetTransactions.length < suggestion.targetVendor.transactionCount && (
                    <div className="text-xs text-muted-foreground">
                      Showing {targetTransactions.length} of{" "}
                      {suggestion.targetVendor.transactionCount} transactions
                    </div>
                  )}
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <div className="font-medium text-yellow-900 dark:text-yellow-100 mb-1">
                  This action cannot be undone
                </div>
                <div className="text-yellow-800 dark:text-yellow-200">
                  Merging will move all {suggestion.sourceVendor.transactionCount}{" "}
                  transaction{suggestion.sourceVendor.transactionCount !== 1 ? "s" : ""}{" "}
                  from <span className="font-medium">{suggestion.sourceVendor.name}</span>{" "}
                  to <span className="font-medium">{suggestion.targetVendor.name}</span> and
                  delete the source vendor.
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button
            variant="outline"
            onClick={handleIgnore}
            disabled={isProcessing}
          >
            Ignore
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} disabled={isProcessing}>
              Cancel
            </Button>
            <Button onClick={handleMerge} disabled={isProcessing}>
              {isProcessing ? "Merging..." : "Merge Vendors"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
