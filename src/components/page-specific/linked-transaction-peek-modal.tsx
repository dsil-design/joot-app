"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertCircle, Receipt } from "lucide-react"
import { LinkedTransactionCard, type LinkedTransactionCardData } from "./linked-transaction-card"

interface LinkedTransactionPeekModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transactionId: string
  matchMethod: string | null
  matchConfidence: number | null
  isImported: boolean
}

interface FetchResponse {
  transaction: LinkedTransactionCardData
}

export function LinkedTransactionPeekModal({
  open,
  onOpenChange,
  transactionId,
  matchMethod,
  matchConfidence,
  isImported,
}: LinkedTransactionPeekModalProps) {
  const [transaction, setTransaction] = React.useState<LinkedTransactionCardData | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) {
      // Reset on close so the next open shows fresh loading state.
      setTransaction(null)
      setError(null)
      return
    }

    let cancelled = false
    setIsLoading(true)
    setError(null)

    fetch(`/api/transactions/${transactionId}`)
      .then(async (res) => {
        if (res.status === 404) {
          throw new Error("This transaction no longer exists. It may have been deleted.")
        }
        if (!res.ok) {
          throw new Error("Failed to load transaction")
        }
        const data = (await res.json()) as FetchResponse
        if (!cancelled) setTransaction(data.transaction)
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, transactionId])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Linked Transaction
          </DialogTitle>
          <DialogDescription>
            Quick preview of the transaction this email is linked to.
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-6 w-32" />
            <div className="rounded-lg border p-3 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-2">
                  <Skeleton className="h-4 w-4 shrink-0" />
                  <Skeleton className="h-4 w-20 shrink-0" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </div>
            <Skeleton className="h-9 w-40" />
          </div>
        )}

        {error && !isLoading && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Unable to load</AlertTitle>
            <AlertDescription className="space-y-3">
              <p>{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {transaction && !isLoading && !error && (
          <LinkedTransactionCard
            transaction={transaction}
            matchMethod={matchMethod}
            matchConfidence={matchConfidence}
            isImported={isImported}
            closeOnNavigate
            onNavigated={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
