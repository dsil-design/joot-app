"use client"

import * as React from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { LinkedTransactionCard, type LinkedTransactionCardData } from "./linked-transaction-card"

interface LinkedTransactionSectionProps {
  transactionId: string
  matchMethod: string | null
  matchConfidence: number | null
  isImported: boolean
  /** Underlying email_transactions.id, needed by the unlink endpoint. */
  emailTransactionId: string | null
  onUnlinked?: () => void
}

interface FetchResponse {
  transaction: LinkedTransactionCardData
}

/**
 * In-panel variant of the linked-transaction view. Lives in the right column
 * of the expanded EmailDetailPanel when the email is matched/imported.
 * Lazy-loads the transaction once the panel mounts.
 */
export function LinkedTransactionSection({
  transactionId,
  matchMethod,
  matchConfidence,
  isImported,
  emailTransactionId,
  onUnlinked,
}: LinkedTransactionSectionProps) {
  const [transaction, setTransaction] = React.useState<LinkedTransactionCardData | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [isUnlinking, setIsUnlinking] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    fetch(`/api/transactions/${transactionId}`)
      .then(async (res) => {
        if (res.status === 404) {
          throw new Error("This transaction no longer exists.")
        }
        if (!res.ok) throw new Error("Failed to load transaction")
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
  }, [transactionId])

  const handleUnlink = async () => {
    if (!emailTransactionId) {
      toast.error("Cannot unlink: missing email transaction reference")
      return
    }
    setIsUnlinking(true)
    try {
      const res = await fetch("/api/imports/unlink", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionId,
          sourceType: "email",
          emailTransactionId,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to unlink")
      }
      toast.success("Email unlinked from transaction")
      onUnlinked?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to unlink")
    } finally {
      setIsUnlinking(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-32" />
        <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
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
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Unable to load linked transaction</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>{error}</p>
          {emailTransactionId && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleUnlink}
              disabled={isUnlinking}
            >
              {isUnlinking ? "Unlinking..." : "Unlink"}
            </Button>
          )}
        </AlertDescription>
      </Alert>
    )
  }

  if (!transaction) return null

  return (
    <LinkedTransactionCard
      transaction={transaction}
      matchMethod={matchMethod}
      matchConfidence={matchConfidence}
      isImported={isImported}
      onUnlink={emailTransactionId ? handleUnlink : undefined}
      isUnlinking={isUnlinking}
    />
  )
}
