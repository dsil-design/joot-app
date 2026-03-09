"use client"

import * as React from "react"
import { toast } from "sonner"
import { SkipFeedbackToast } from "@/components/page-specific/skip-feedback-toast"

/** Split array into chunks of given size */
function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

const SKIP_FEEDBACK_DURATION = 10_000

/** Submit skip reason feedback for one or more email transactions */
async function submitSkipFeedback(emailTransactionIds: string[], reason: string) {
  await Promise.allSettled(
    emailTransactionIds.map((id) =>
      fetch(`/api/emails/transactions/${id}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedback_type: "skip_reason",
          reason,
        }),
      })
    )
  )
}

interface PendingUndo {
  id: string
  action: "skip"
  previousStatus: string
  timeoutId: NodeJS.Timeout
}

export interface UseEmailHubActionsOptions {
  onStatusChange?: (id: string, status: string) => void
  onItemRemove?: (id: string) => void
  onItemUpdate?: (id: string, data: Record<string, unknown>) => void
  undoDuration?: number
}

/**
 * Hook for email hub actions with optimistic updates and undo support
 */
export function useEmailHubActions({
  onStatusChange,
  onItemRemove,
  onItemUpdate,
  undoDuration = 5000,
}: UseEmailHubActionsOptions = {}) {
  const [processingId, setProcessingId] = React.useState<string | null>(null)
  const [extractingId, setExtractingId] = React.useState<string | null>(null)
  const [feedbackProcessingId, setFeedbackProcessingId] = React.useState<string | null>(null)
  const pendingUndosRef = React.useRef<Map<string, PendingUndo>>(new Map())
  const undoSkipRef = React.useRef<(id: string) => void>(() => {})

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

        const result = await response.json()
        const emailTxId = result.emailTransactionId || id

        setProcessingId(null)

        // Set up undo timer
        const timeoutId = setTimeout(() => {
          clearPendingUndo(id)
          onItemRemove?.(id)
        }, SKIP_FEEDBACK_DURATION)

        pendingUndosRef.current.set(id, {
          id,
          action: "skip",
          previousStatus: "pending_review",
          timeoutId,
        })

        // Custom toast with feedback options
        toast.custom(
          (t) =>
            React.createElement(SkipFeedbackToast, {
              emailTransactionIds: [emailTxId],
              count: 1,
              onSubmitFeedback: (ids: string[], reason: string) => submitSkipFeedback(ids, reason),
              onUndo: () => {
                toast.dismiss(t)
                undoSkipRef.current(id)
              },
              onDismiss: () => toast.dismiss(t),
            }),
          { duration: SKIP_FEEDBACK_DURATION }
        )

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
    [clearPendingUndo, onItemRemove, onStatusChange]
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
  undoSkipRef.current = undoSkip

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
   * Batch skip multiple email transactions.
   * Handles arbitrarily large lists by chunking into groups of 50 for the API.
   */
  const batchSkip = React.useCallback(
    async (ids: string[]) => {
      setProcessingId("batch")
      ids.forEach((id) => onStatusChange?.(id, "skipped"))

      const chunks = chunkArray(ids, 50)
      let totalUpdated = 0
      const allEmailTxIds: string[] = []

      try {
        for (const chunk of chunks) {
          const response = await fetch("/api/emails/transactions/bulk", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "skip", ids: chunk }),
          })

          if (!response.ok) {
            const data = await response.json()
            throw new Error(data.error || "Failed to batch skip")
          }

          const result = await response.json()
          totalUpdated += result.updated || chunk.length
          if (result.emailTransactionIds) {
            allEmailTxIds.push(...result.emailTransactionIds)
          }
        }

        setProcessingId(null)

        // Remove after delay
        setTimeout(() => {
          ids.forEach((id) => onItemRemove?.(id))
        }, SKIP_FEEDBACK_DURATION)

        // Custom toast with feedback for the whole batch
        toast.custom(
          (t) =>
            React.createElement(SkipFeedbackToast, {
              emailTransactionIds: allEmailTxIds,
              count: totalUpdated,
              onSubmitFeedback: (txIds: string[], reason: string) => submitSkipFeedback(txIds, reason),
              onDismiss: () => toast.dismiss(t),
            }),
          { duration: SKIP_FEEDBACK_DURATION }
        )

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
   * Batch mark as pending.
   * Handles arbitrarily large lists by chunking into groups of 50 for the API.
   */
  const batchMarkPending = React.useCallback(
    async (ids: string[]) => {
      setProcessingId("batch")
      ids.forEach((id) => onStatusChange?.(id, "pending_review"))

      const chunks = chunkArray(ids, 50)
      let totalUpdated = 0

      try {
        for (const chunk of chunks) {
          const response = await fetch("/api/emails/transactions/bulk", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "mark_pending", ids: chunk }),
          })

          if (!response.ok) {
            const data = await response.json()
            throw new Error(data.error || "Failed to update")
          }

          const result = await response.json()
          totalUpdated += result.updated || chunk.length
        }

        setProcessingId(null)
        toast.success(`${totalUpdated} email(s) marked as pending`)
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

  /**
   * Batch process (extract) multiple emails.
   * Handles arbitrarily large lists — processes sequentially, keeps
   * processingId="batch" for the entire run, and shows a single toast
   * at the end with a running progress toast during processing.
   */
  const batchProcess = React.useCallback(
    async (ids: string[]) => {
      setProcessingId("batch")
      let successCount = 0
      let failCount = 0
      const total = ids.length

      // Show a persistent progress toast
      const progressToastId = toast.loading(`Processing 0 / ${total} emails...`)

      for (const emailId of ids) {
        setExtractingId(emailId)
        try {
          const response = await fetch(`/api/emails/${emailId}/extract`, {
            method: "POST",
          })

          if (!response.ok) {
            failCount++
          } else {
            const result = await response.json()
            const et = result.emailTransaction

            if (et) {
              onItemUpdate?.(emailId, {
                email_transaction_id: et.id,
                status: et.status,
                classification: et.classification,
                vendor_id: et.vendor_id,
                vendor_name_raw: et.vendor_name_raw,
                amount: et.amount,
                currency: et.currency,
                transaction_date: et.transaction_date,
                description: et.description,
                order_id: et.order_id,
                payment_card_last_four: et.payment_card_last_four,
                payment_card_type: et.payment_card_type,
                extraction_confidence: et.extraction_confidence,
                extraction_notes: et.extraction_notes,
                ai_reasoning: et.ai_reasoning,
                parser_key: et.parser_key,
                processed_at: et.processed_at,
                is_processed: true,
              })
            }

            successCount++
          }
        } catch {
          failCount++
        }

        // Update progress toast
        const done = successCount + failCount
        toast.loading(`Processing ${done} / ${total} emails...`, {
          id: progressToastId,
        })
      }

      setExtractingId(null)
      setProcessingId(null)

      // Dismiss progress toast and show final result
      toast.dismiss(progressToastId)

      if (successCount > 0) {
        toast.success(`Processed ${successCount} email(s)`, {
          description: failCount > 0 ? `${failCount} failed` : undefined,
        })
      } else if (failCount > 0) {
        toast.error(`Failed to process ${failCount} email(s)`)
      }

      return successCount > 0
    },
    [onItemUpdate]
  )

  /**
   * Process (extract) a single unprocessed email
   */
  const processEmail = React.useCallback(
    async (emailId: string) => {
      setExtractingId(emailId)

      try {
        const response = await fetch(`/api/emails/${emailId}/extract`, {
          method: "POST",
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Failed to process email")
        }

        const result = await response.json()
        const et = result.emailTransaction

        if (et) {
          // Update the row in-place with extraction results
          onItemUpdate?.(emailId, {
            email_transaction_id: et.id,
            status: et.status,
            classification: et.classification,
            vendor_id: et.vendor_id,
            vendor_name_raw: et.vendor_name_raw,
            amount: et.amount,
            currency: et.currency,
            transaction_date: et.transaction_date,
            description: et.description,
            order_id: et.order_id,
            payment_card_last_four: et.payment_card_last_four,
            payment_card_type: et.payment_card_type,
            extraction_confidence: et.extraction_confidence,
            extraction_notes: et.extraction_notes,
            ai_reasoning: et.ai_reasoning,
            parser_key: et.parser_key,
            processed_at: et.processed_at,
            is_processed: true,
            matched_transaction_id: et.matched_transaction_id,
            match_confidence: et.match_confidence,
            matched_at: et.matched_at,
          })
        }

        setExtractingId(null)
        toast.success("Email processed", {
          description: et?.amount
            ? `Extracted ${et.currency} ${et.amount} from ${et.vendor_name_raw || "email"}`
            : "Extraction complete (no transaction data found)",
        })

        return result
      } catch (error) {
        setExtractingId(null)
        const message = error instanceof Error ? error.message : "Failed to process"
        toast.error("Failed to process email", { description: message })
        return null
      }
    },
    [onItemUpdate]
  )

  /**
   * Reprocess an email with user feedback that it IS a transaction
   */
  const processWithFeedback = React.useCallback(
    async (
      emailId: string,
      feedback: {
        emailTransactionId: string
        originalClassification: string | null
        originalSkip: boolean | null
        subject: string | null
        fromAddress: string | null
        userHint?: string
      }
    ) => {
      setFeedbackProcessingId(emailId)

      try {
        const response = await fetch(`/api/emails/${emailId}/extract`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ feedback }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Failed to reprocess with feedback")
        }

        const result = await response.json()
        const et = result.emailTransaction

        if (et) {
          onItemUpdate?.(emailId, {
            email_transaction_id: et.id,
            status: et.status,
            classification: et.classification,
            vendor_id: et.vendor_id,
            vendor_name_raw: et.vendor_name_raw,
            amount: et.amount,
            currency: et.currency,
            transaction_date: et.transaction_date,
            description: et.description,
            order_id: et.order_id,
            payment_card_last_four: et.payment_card_last_four,
            payment_card_type: et.payment_card_type,
            extraction_confidence: et.extraction_confidence,
            extraction_notes: et.extraction_notes,
            ai_reasoning: et.ai_reasoning,
            parser_key: et.parser_key,
            processed_at: et.processed_at,
            is_processed: true,
            matched_transaction_id: et.matched_transaction_id,
            match_confidence: et.match_confidence,
            matched_at: et.matched_at,
          })
        }

        setFeedbackProcessingId(null)
        toast.success("Email reprocessed with feedback", {
          description: et?.amount
            ? `Extracted ${et.currency} ${et.amount} from ${et.vendor_name_raw || "email"}`
            : "Reprocessed but no transaction data found",
        })

        return result
      } catch (error) {
        setFeedbackProcessingId(null)
        const message = error instanceof Error ? error.message : "Failed to reprocess"
        toast.error("Failed to reprocess", { description: message })
        return null
      }
    },
    [onItemUpdate]
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
    batchProcess,
    processEmail,
    processWithFeedback,
    isProcessing: (id: string) =>
      processingId === id || processingId === "batch",
    isExtracting: (id: string) => extractingId === id,
    isFeedbackProcessing: (id: string) => feedbackProcessingId === id,
  }
}
