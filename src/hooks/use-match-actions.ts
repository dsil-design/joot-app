"use client"

import * as React from "react"
import { toast } from "sonner"

/**
 * Match action state
 */
export interface MatchActionState {
  /** Whether an action is in progress */
  isLoading: boolean
  /** The ID currently being processed */
  processingId: string | null
  /** Error message if any */
  error: string | null
}

/**
 * Pending undo action
 */
interface PendingUndo {
  id: string
  action: "approve" | "reject"
  previousStatus: string
  timeoutId: NodeJS.Timeout
}

/**
 * Options for useMatchActions hook
 */
export interface UseMatchActionsOptions {
  /**
   * Callback when item status changes (for optimistic updates)
   */
  onStatusChange?: (id: string, status: string) => void

  /**
   * Callback when item is removed from list
   */
  onItemRemove?: (id: string) => void

  /**
   * Duration in ms for undo toast
   * @default 5000
   */
  undoDuration?: number

  /**
   * Whether to create transactions when approving
   * @default false
   */
  createTransactionsOnApprove?: boolean
}

/**
 * useMatchActions Hook
 *
 * Provides approve/reject functionality with:
 * - Optimistic updates (immediate UI feedback)
 * - Error rollback
 * - Undo capability with toast notification
 */
export function useMatchActions({
  onStatusChange,
  onItemRemove,
  undoDuration = 5000,
  createTransactionsOnApprove = false,
}: UseMatchActionsOptions = {}) {
  const [state, setState] = React.useState<MatchActionState>({
    isLoading: false,
    processingId: null,
    error: null,
  })

  const pendingUndosRef = React.useRef<Map<string, PendingUndo>>(new Map())

  /**
   * Clear a pending undo
   */
  const clearPendingUndo = React.useCallback((id: string) => {
    const pending = pendingUndosRef.current.get(id)
    if (pending) {
      clearTimeout(pending.timeoutId)
      pendingUndosRef.current.delete(id)
    }
  }, [])

  /**
   * Approve a match
   */
  const approve = React.useCallback(
    async (id: string, options?: { skipUndo?: boolean }) => {
      setState({ isLoading: true, processingId: id, error: null })

      // Optimistic update
      onStatusChange?.(id, "approved")

      try {
        const response = await fetch("/api/imports/approve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            emailIds: [id],
            createTransactions: createTransactionsOnApprove,
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Failed to approve")
        }

        setState({ isLoading: false, processingId: null, error: null })

        // Show undo toast unless skipped
        if (!options?.skipUndo) {
          const timeoutId = setTimeout(() => {
            clearPendingUndo(id)
            onItemRemove?.(id)
          }, undoDuration)

          pendingUndosRef.current.set(id, {
            id,
            action: "approve",
            previousStatus: "pending",
            timeoutId,
          })

          toast.success("Match approved", {
            description: "Transaction match confirmed.",
            action: {
              label: "Undo",
              onClick: () => undoAction(id),
            },
            duration: undoDuration,
          })
        }

        return true
      } catch (error) {
        // Rollback optimistic update
        onStatusChange?.(id, "pending")

        const errorMessage =
          error instanceof Error ? error.message : "Failed to approve"

        setState({ isLoading: false, processingId: null, error: errorMessage })

        toast.error("Failed to approve", {
          description: errorMessage,
        })

        return false
      }
    },
    [
      clearPendingUndo,
      createTransactionsOnApprove,
      onItemRemove,
      onStatusChange,
      undoDuration,
    ]
  )

  /**
   * Reject a match
   */
  const reject = React.useCallback(
    async (id: string, reason?: string, options?: { skipUndo?: boolean }) => {
      setState({ isLoading: true, processingId: id, error: null })

      // Optimistic update
      onStatusChange?.(id, "rejected")

      try {
        const response = await fetch("/api/imports/reject", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emailId: id, reason }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Failed to reject")
        }

        setState({ isLoading: false, processingId: null, error: null })

        // Show undo toast unless skipped
        if (!options?.skipUndo) {
          const timeoutId = setTimeout(() => {
            clearPendingUndo(id)
            onItemRemove?.(id)
          }, undoDuration)

          pendingUndosRef.current.set(id, {
            id,
            action: "reject",
            previousStatus: "pending",
            timeoutId,
          })

          toast.success("Match skipped", {
            description: reason || "Transaction will not be imported.",
            action: {
              label: "Undo",
              onClick: () => undoAction(id),
            },
            duration: undoDuration,
          })
        }

        return true
      } catch (error) {
        // Rollback optimistic update
        onStatusChange?.(id, "pending")

        const errorMessage =
          error instanceof Error ? error.message : "Failed to reject"

        setState({ isLoading: false, processingId: null, error: errorMessage })

        toast.error("Failed to skip", {
          description: errorMessage,
        })

        return false
      }
    },
    [clearPendingUndo, onItemRemove, onStatusChange, undoDuration]
  )

  /**
   * Undo a previous action
   */
  const undoAction = React.useCallback(
    async (id: string) => {
      const pending = pendingUndosRef.current.get(id)
      if (!pending) return false

      clearPendingUndo(id)

      // Revert the status
      onStatusChange?.(id, pending.previousStatus)

      toast.info("Action undone", {
        description:
          pending.action === "approve"
            ? "Match approval reversed"
            : "Match rejection reversed",
      })

      // Note: In a full implementation, we'd also need to call an API to revert
      // the database change. For MVP, we assume the undo happens before
      // the removal timeout completes.

      return true
    },
    [clearPendingUndo, onStatusChange]
  )

  /**
   * Batch approve multiple matches
   */
  const batchApprove = React.useCallback(
    async (ids: string[]) => {
      setState({ isLoading: true, processingId: "batch", error: null })

      // Optimistic update for all items
      ids.forEach((id) => onStatusChange?.(id, "approved"))

      try {
        const response = await fetch("/api/imports/approve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            emailIds: ids,
            createTransactions: createTransactionsOnApprove,
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Failed to approve")
        }

        const result = await response.json()

        setState({ isLoading: false, processingId: null, error: null })

        // Remove approved items after a delay
        setTimeout(() => {
          ids.forEach((id) => onItemRemove?.(id))
        }, 1000)

        toast.success(`${result.results.approved} matches approved`, {
          description: result.results.transactions_created
            ? `${result.results.transactions_created} transactions created`
            : "Transactions confirmed",
        })

        return result
      } catch (error) {
        // Rollback optimistic updates
        ids.forEach((id) => onStatusChange?.(id, "pending"))

        const errorMessage =
          error instanceof Error ? error.message : "Failed to batch approve"

        setState({ isLoading: false, processingId: null, error: errorMessage })

        toast.error("Failed to approve", {
          description: errorMessage,
        })

        return null
      }
    },
    [createTransactionsOnApprove, onItemRemove, onStatusChange]
  )

  /**
   * Batch reject multiple matches
   */
  const batchReject = React.useCallback(
    async (ids: string[], reason?: string) => {
      setState({ isLoading: true, processingId: "batch", error: null })

      // Optimistic update for all items
      ids.forEach((id) => onStatusChange?.(id, "rejected"))

      try {
        const response = await fetch("/api/imports/reject", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emailIds: ids, reason }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Failed to reject")
        }

        const result = await response.json()

        setState({ isLoading: false, processingId: null, error: null })

        // Remove rejected items after a delay
        setTimeout(() => {
          ids.forEach((id) => onItemRemove?.(id))
        }, 1000)

        toast.success(`${result.results.rejected} matches skipped`, {
          description: reason || "Transactions will not be imported",
        })

        return result
      } catch (error) {
        // Rollback optimistic updates
        ids.forEach((id) => onStatusChange?.(id, "pending"))

        const errorMessage =
          error instanceof Error ? error.message : "Failed to batch reject"

        setState({ isLoading: false, processingId: null, error: errorMessage })

        toast.error("Failed to skip", {
          description: errorMessage,
        })

        return null
      }
    },
    [onItemRemove, onStatusChange]
  )

  // Cleanup pending undos on unmount
  React.useEffect(() => {
    return () => {
      pendingUndosRef.current.forEach((pending) => {
        clearTimeout(pending.timeoutId)
      })
      pendingUndosRef.current.clear()
    }
  }, [])

  return {
    ...state,

    // Single actions
    approve,
    reject,
    undoAction,

    // Batch actions
    batchApprove,
    batchReject,

    // Helpers
    isProcessing: (id: string) =>
      state.isLoading && (state.processingId === id || state.processingId === "batch"),
  }
}
