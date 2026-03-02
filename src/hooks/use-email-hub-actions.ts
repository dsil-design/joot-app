"use client"

import * as React from "react"
import { toast } from "sonner"

interface PendingUndo {
  id: string
  action: "skip"
  previousStatus: string
  timeoutId: NodeJS.Timeout
}

export interface UseEmailHubActionsOptions {
  onStatusChange?: (id: string, status: string) => void
  onItemRemove?: (id: string) => void
  undoDuration?: number
}

/**
 * Hook for email hub actions with optimistic updates and undo support
 */
export function useEmailHubActions({
  onStatusChange,
  onItemRemove,
  undoDuration = 5000,
}: UseEmailHubActionsOptions = {}) {
  const [processingId, setProcessingId] = React.useState<string | null>(null)
  const pendingUndosRef = React.useRef<Map<string, PendingUndo>>(new Map())

  const clearPendingUndo = React.useCallback((id: string) => {
    const pending = pendingUndosRef.current.get(id)
    if (pending) {
      clearTimeout(pending.timeoutId)
      pendingUndosRef.current.delete(id)
    }
  }, [])

  /**
   * Skip a single email transaction
   */
  const skip = React.useCallback(
    async (id: string) => {
      setProcessingId(id)

      // Optimistic update
      onStatusChange?.(id, "skipped")

      try {
        const response = await fetch(`/api/emails/transactions/${id}/skip`, {
          method: "POST",
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Failed to skip")
        }

        setProcessingId(null)

        // Toast with undo
        const timeoutId = setTimeout(() => {
          clearPendingUndo(id)
          onItemRemove?.(id)
        }, undoDuration)

        pendingUndosRef.current.set(id, {
          id,
          action: "skip",
          previousStatus: "pending_review",
          timeoutId,
        })

        toast.success("Email skipped", {
          description: "Marked as non-transaction.",
          action: {
            label: "Undo",
            onClick: () => undoSkip(id),
          },
          duration: undoDuration,
        })

        return true
      } catch (error) {
        // Rollback
        onStatusChange?.(id, "pending_review")
        setProcessingId(null)

        const message = error instanceof Error ? error.message : "Failed to skip"
        toast.error("Failed to skip", { description: message })
        return false
      }
    },
    [clearPendingUndo, onItemRemove, onStatusChange, undoDuration]
  )

  /**
   * Undo a skip action
   */
  const undoSkip = React.useCallback(
    async (id: string) => {
      const pending = pendingUndosRef.current.get(id)
      if (!pending) return

      clearPendingUndo(id)
      onStatusChange?.(id, pending.previousStatus)

      // Call bulk API to mark as pending again
      try {
        await fetch("/api/emails/transactions/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "mark_pending", ids: [id] }),
        })
      } catch {
        // Best-effort undo
      }

      toast.info("Skip undone")
    },
    [clearPendingUndo, onStatusChange]
  )

  /**
   * Link an email transaction to an existing transaction
   */
  const linkToTransaction = React.useCallback(
    async (emailId: string, transactionId: string) => {
      setProcessingId(emailId)
      onStatusChange?.(emailId, "matched")

      try {
        const response = await fetch("/api/imports/link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            compositeId: `email:${emailId}`,
            transactionId,
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Failed to link")
        }

        setProcessingId(null)
        toast.success("Linked to existing transaction")

        // Remove after short delay
        setTimeout(() => {
          onItemRemove?.(emailId)
        }, 2000)

        return true
      } catch (error) {
        onStatusChange?.(emailId, "pending_review")
        setProcessingId(null)

        const message = error instanceof Error ? error.message : "Failed to link"
        toast.error("Failed to link", { description: message })
        return false
      }
    },
    [onItemRemove, onStatusChange]
  )

  /**
   * Batch skip multiple email transactions
   */
  const batchSkip = React.useCallback(
    async (ids: string[]) => {
      setProcessingId("batch")
      ids.forEach((id) => onStatusChange?.(id, "skipped"))

      try {
        const response = await fetch("/api/emails/transactions/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "skip", ids }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Failed to batch skip")
        }

        const result = await response.json()
        setProcessingId(null)

        toast.success(`${result.updated} email(s) skipped`)

        // Remove after delay
        setTimeout(() => {
          ids.forEach((id) => onItemRemove?.(id))
        }, 1000)

        return true
      } catch (error) {
        ids.forEach((id) => onStatusChange?.(id, "pending_review"))
        setProcessingId(null)

        const message = error instanceof Error ? error.message : "Failed to batch skip"
        toast.error("Failed to skip", { description: message })
        return false
      }
    },
    [onItemRemove, onStatusChange]
  )

  /**
   * Batch mark as pending
   */
  const batchMarkPending = React.useCallback(
    async (ids: string[]) => {
      setProcessingId("batch")
      ids.forEach((id) => onStatusChange?.(id, "pending_review"))

      try {
        const response = await fetch("/api/emails/transactions/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "mark_pending", ids }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Failed to update")
        }

        const result = await response.json()
        setProcessingId(null)

        toast.success(`${result.updated} email(s) marked as pending`)
        return true
      } catch (error) {
        setProcessingId(null)

        const message = error instanceof Error ? error.message : "Failed to update"
        toast.error("Failed to update", { description: message })
        return false
      }
    },
    [onStatusChange]
  )

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      pendingUndosRef.current.forEach((pending) => {
        clearTimeout(pending.timeoutId)
      })
      pendingUndosRef.current.clear()
    }
  }, [])

  return {
    skip,
    linkToTransaction,
    batchSkip,
    batchMarkPending,
    isProcessing: (id: string) =>
      processingId === id || processingId === "batch",
  }
}
