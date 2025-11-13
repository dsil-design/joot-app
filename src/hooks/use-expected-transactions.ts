"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type {
  ExpectedTransaction,
  CreateExpectedTransactionData,
  UpdateExpectedTransactionData,
  ExpectedTransactionFilters,
  ExpectedTransactionsResponse,
  MatchTransactionRequest,
  SkipExpectedTransactionRequest,
} from "@/lib/types/recurring-transactions"

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Fetch expected transactions with filters
 */
export function useExpectedTransactions(
  monthPlanId: string | null,
  filters?: Omit<ExpectedTransactionFilters, "month_plan_id">
) {
  return useQuery<ExpectedTransactionsResponse>({
    queryKey: ["expected-transactions", monthPlanId, filters],
    queryFn: async () => {
      if (!monthPlanId) {
        throw new Error("Month plan ID is required")
      }

      const params = new URLSearchParams()
      params.set("month_plan_id", monthPlanId)

      if (filters?.status) {
        const statuses = Array.isArray(filters.status) ? filters.status : [filters.status]
        params.set("status", statuses.join(","))
      }
      if (filters?.transaction_type) {
        params.set("transaction_type", filters.transaction_type)
      }
      if (filters?.vendor_ids && filters.vendor_ids.length > 0) {
        params.set("vendor_ids", filters.vendor_ids.join(","))
      }
      if (filters?.include_matched !== undefined) {
        params.set("include_matched", filters.include_matched.toString())
      }

      const response = await fetch(`/api/expected-transactions?${params.toString()}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to fetch expected transactions")
      }

      return response.json()
    },
    enabled: !!monthPlanId,
    staleTime: 30000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Fetch a single expected transaction by ID
 */
export function useExpectedTransaction(id: string | null) {
  return useQuery<ExpectedTransaction>({
    queryKey: ["expected-transactions", id],
    queryFn: async () => {
      if (!id) {
        throw new Error("Expected transaction ID is required")
      }

      const response = await fetch(`/api/expected-transactions/${id}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to fetch expected transaction")
      }

      const data = await response.json()
      return data.expected_transaction
    },
    enabled: !!id,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  })
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create a new expected transaction (manual entry)
 */
export function useCreateExpectedTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateExpectedTransactionData) => {
      const response = await fetch("/api/expected-transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create expected transaction")
      }

      return response.json()
    },
    onSuccess: (data, variables) => {
      // Invalidate expected transactions list for this month plan
      queryClient.invalidateQueries({
        queryKey: ["expected-transactions", variables.month_plan_id],
      })

      // Invalidate month plan to refetch stats
      queryClient.invalidateQueries({ queryKey: ["month-plans", variables.month_plan_id] })

      // Add the new expected transaction to the cache
      queryClient.setQueryData(
        ["expected-transactions", data.expected_transaction.id],
        data.expected_transaction
      )

      toast.success("Expected transaction created successfully")
    },
    onError: (error: Error) => {
      console.error("Failed to create expected transaction:", error)
      toast.error(error.message || "Failed to create expected transaction")
    },
  })
}

/**
 * Update an existing expected transaction
 */
export function useUpdateExpectedTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateExpectedTransactionData }) => {
      const response = await fetch(`/api/expected-transactions/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update expected transaction")
      }

      return response.json()
    },
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["expected-transactions", id] })

      // Snapshot the previous value
      const previousExpectedTransaction = queryClient.getQueryData([
        "expected-transactions",
        id,
      ])

      // Optimistically update the cache
      if (previousExpectedTransaction) {
        queryClient.setQueryData(["expected-transactions", id], (old: any) => ({
          ...old,
          ...data,
        }))
      }

      return { previousExpectedTransaction }
    },
    onSuccess: (data, variables) => {
      // Update the specific expected transaction in cache
      queryClient.setQueryData(
        ["expected-transactions", variables.id],
        data.expected_transaction
      )

      // Invalidate the month plan's expected transactions list
      const monthPlanId = data.expected_transaction.month_plan_id
      queryClient.invalidateQueries({ queryKey: ["expected-transactions", monthPlanId] })

      // Invalidate month plan to refetch stats
      queryClient.invalidateQueries({ queryKey: ["month-plans", monthPlanId] })

      toast.success("Expected transaction updated successfully")
    },
    onError: (error: Error, variables, context) => {
      // Rollback optimistic update on error
      if (context?.previousExpectedTransaction) {
        queryClient.setQueryData(
          ["expected-transactions", variables.id],
          context.previousExpectedTransaction
        )
      }

      console.error("Failed to update expected transaction:", error)
      toast.error(error.message || "Failed to update expected transaction")
    },
    onSettled: (data, error, variables) => {
      // Always invalidate after error or success to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["expected-transactions", variables.id] })
    },
  })
}

/**
 * Delete an expected transaction
 */
export function useDeleteExpectedTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/expected-transactions/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete expected transaction")
      }

      return response.json()
    },
    onSuccess: (data, id) => {
      // Get the expected transaction from cache to find its month_plan_id
      const expectedTransaction = queryClient.getQueryData([
        "expected-transactions",
        id,
      ]) as ExpectedTransaction | undefined

      // Remove the expected transaction from cache
      queryClient.removeQueries({ queryKey: ["expected-transactions", id] })

      // Invalidate expected transactions list if we know the month plan ID
      if (expectedTransaction?.month_plan_id) {
        queryClient.invalidateQueries({
          queryKey: ["expected-transactions", expectedTransaction.month_plan_id],
        })

        // Invalidate month plan to refetch stats
        queryClient.invalidateQueries({
          queryKey: ["month-plans", expectedTransaction.month_plan_id],
        })
      }

      toast.success("Expected transaction deleted successfully")
    },
    onError: (error: Error) => {
      console.error("Failed to delete expected transaction:", error)
      toast.error(error.message || "Failed to delete expected transaction")
    },
  })
}

/**
 * Match an expected transaction to an actual transaction
 */
export function useMatchTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      expectedTransactionId,
      data,
    }: {
      expectedTransactionId: string
      data: MatchTransactionRequest
    }) => {
      const response = await fetch(`/api/expected-transactions/${expectedTransactionId}/match`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to match transaction")
      }

      return response.json()
    },
    onMutate: async ({ expectedTransactionId, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["expected-transactions", expectedTransactionId] })

      // Snapshot the previous value
      const previousExpectedTransaction = queryClient.getQueryData([
        "expected-transactions",
        expectedTransactionId,
      ])

      // Optimistically update the status to 'matched'
      if (previousExpectedTransaction) {
        queryClient.setQueryData(
          ["expected-transactions", expectedTransactionId],
          (old: any) => ({
            ...old,
            status: "matched",
            matched_transaction_id: data.transaction_id,
          })
        )
      }

      return { previousExpectedTransaction }
    },
    onSuccess: (data, variables) => {
      // Update the expected transaction in cache
      queryClient.setQueryData(
        ["expected-transactions", variables.expectedTransactionId],
        data.expected_transaction
      )

      // Invalidate expected transactions list
      const monthPlanId = data.expected_transaction.month_plan_id
      queryClient.invalidateQueries({ queryKey: ["expected-transactions", monthPlanId] })

      // Invalidate month plan to refetch stats
      queryClient.invalidateQueries({ queryKey: ["month-plans", monthPlanId] })

      // Invalidate match suggestions since a match was made
      queryClient.invalidateQueries({
        queryKey: ["month-plans", monthPlanId, "match-suggestions"],
      })

      toast.success("Transaction matched successfully")
    },
    onError: (error: Error, variables, context) => {
      // Rollback optimistic update on error
      if (context?.previousExpectedTransaction) {
        queryClient.setQueryData(
          ["expected-transactions", variables.expectedTransactionId],
          context.previousExpectedTransaction
        )
      }

      console.error("Failed to match transaction:", error)
      toast.error(error.message || "Failed to match transaction")
    },
    onSettled: (data, error, variables) => {
      // Always invalidate after error or success to ensure consistency
      queryClient.invalidateQueries({
        queryKey: ["expected-transactions", variables.expectedTransactionId],
      })
    },
  })
}

/**
 * Unmatch a previously matched expected transaction
 */
export function useUnmatchTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (expectedTransactionId: string) => {
      const response = await fetch(`/api/expected-transactions/${expectedTransactionId}/unmatch`, {
        method: "POST",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to unmatch transaction")
      }

      return response.json()
    },
    onMutate: async (expectedTransactionId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["expected-transactions", expectedTransactionId] })

      // Snapshot the previous value
      const previousExpectedTransaction = queryClient.getQueryData([
        "expected-transactions",
        expectedTransactionId,
      ])

      // Optimistically update the status to 'pending'
      if (previousExpectedTransaction) {
        queryClient.setQueryData(["expected-transactions", expectedTransactionId], (old: any) => ({
          ...old,
          status: "pending",
          matched_transaction_id: null,
        }))
      }

      return { previousExpectedTransaction }
    },
    onSuccess: (data, expectedTransactionId) => {
      // Update the expected transaction in cache
      queryClient.setQueryData(
        ["expected-transactions", expectedTransactionId],
        data.expected_transaction
      )

      // Invalidate expected transactions list
      const monthPlanId = data.expected_transaction.month_plan_id
      queryClient.invalidateQueries({ queryKey: ["expected-transactions", monthPlanId] })

      // Invalidate month plan to refetch stats
      queryClient.invalidateQueries({ queryKey: ["month-plans", monthPlanId] })

      // Invalidate match suggestions since we have a new unmatched transaction
      queryClient.invalidateQueries({
        queryKey: ["month-plans", monthPlanId, "match-suggestions"],
      })

      toast.success("Transaction unmatched successfully")
    },
    onError: (error: Error, expectedTransactionId, context) => {
      // Rollback optimistic update on error
      if (context?.previousExpectedTransaction) {
        queryClient.setQueryData(
          ["expected-transactions", expectedTransactionId],
          context.previousExpectedTransaction
        )
      }

      console.error("Failed to unmatch transaction:", error)
      toast.error(error.message || "Failed to unmatch transaction")
    },
    onSettled: (data, error, expectedTransactionId) => {
      // Always invalidate after error or success to ensure consistency
      queryClient.invalidateQueries({
        queryKey: ["expected-transactions", expectedTransactionId],
      })
    },
  })
}

/**
 * Skip an expected transaction (mark as not happening this month)
 */
export function useSkipTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      expectedTransactionId,
      data,
    }: {
      expectedTransactionId: string
      data?: SkipExpectedTransactionRequest
    }) => {
      const response = await fetch(`/api/expected-transactions/${expectedTransactionId}/skip`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data || {}),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to skip transaction")
      }

      return response.json()
    },
    onMutate: async ({ expectedTransactionId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["expected-transactions", expectedTransactionId] })

      // Snapshot the previous value
      const previousExpectedTransaction = queryClient.getQueryData([
        "expected-transactions",
        expectedTransactionId,
      ])

      // Optimistically update the status to 'skipped'
      if (previousExpectedTransaction) {
        queryClient.setQueryData(["expected-transactions", expectedTransactionId], (old: any) => ({
          ...old,
          status: "skipped",
        }))
      }

      return { previousExpectedTransaction }
    },
    onSuccess: (data, variables) => {
      // Update the expected transaction in cache
      queryClient.setQueryData(
        ["expected-transactions", variables.expectedTransactionId],
        data.expected_transaction
      )

      // Invalidate expected transactions list
      const monthPlanId = data.expected_transaction.month_plan_id
      queryClient.invalidateQueries({ queryKey: ["expected-transactions", monthPlanId] })

      // Invalidate month plan to refetch stats
      queryClient.invalidateQueries({ queryKey: ["month-plans", monthPlanId] })

      toast.success("Transaction skipped successfully")
    },
    onError: (error: Error, variables, context) => {
      // Rollback optimistic update on error
      if (context?.previousExpectedTransaction) {
        queryClient.setQueryData(
          ["expected-transactions", variables.expectedTransactionId],
          context.previousExpectedTransaction
        )
      }

      console.error("Failed to skip transaction:", error)
      toast.error(error.message || "Failed to skip transaction")
    },
    onSettled: (data, error, variables) => {
      // Always invalidate after error or success to ensure consistency
      queryClient.invalidateQueries({
        queryKey: ["expected-transactions", variables.expectedTransactionId],
      })
    },
  })
}
