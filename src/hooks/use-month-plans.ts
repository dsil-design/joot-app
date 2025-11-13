"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type {
  MonthPlan,
  MonthPlanWithStats,
  CreateMonthPlanData,
  UpdateMonthPlanData,
  MonthPlanFilters,
  MonthPlansResponse,
  GenerateExpectedOptions,
  GenerateExpectedResult,
  AutoMatchOptions,
  AutoMatchResult,
  MatchSuggestionsResponse,
  VarianceReport,
} from "@/lib/types/recurring-transactions"

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Fetch all month plans with optional filters
 */
export function useMonthPlans(filters?: MonthPlanFilters) {
  return useQuery<MonthPlansResponse>({
    queryKey: ["month-plans", filters],
    queryFn: async () => {
      const params = new URLSearchParams()

      if (filters?.year !== undefined) {
        params.set("year", filters.year.toString())
      }
      if (filters?.status) {
        params.set("status", filters.status)
      }
      if (filters?.limit !== undefined) {
        params.set("limit", filters.limit.toString())
      }

      const response = await fetch(`/api/month-plans?${params.toString()}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to fetch month plans")
      }

      return response.json()
    },
    staleTime: 30000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Fetch a single month plan by ID with stats
 */
export function useMonthPlan(id: string | null) {
  return useQuery<MonthPlanWithStats>({
    queryKey: ["month-plans", id, "stats"],
    queryFn: async () => {
      if (!id) {
        throw new Error("Month plan ID is required")
      }

      const response = await fetch(`/api/month-plans/${id}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to fetch month plan")
      }

      const data = await response.json()
      return data.month_plan
    },
    enabled: !!id,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  })
}

/**
 * Fetch match suggestions for a month plan
 */
export function useMatchSuggestions(monthPlanId: string | null) {
  return useQuery<MatchSuggestionsResponse>({
    queryKey: ["month-plans", monthPlanId, "match-suggestions"],
    queryFn: async () => {
      if (!monthPlanId) {
        throw new Error("Month plan ID is required")
      }

      const response = await fetch(`/api/month-plans/${monthPlanId}/match-suggestions`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to fetch match suggestions")
      }

      return response.json()
    },
    enabled: !!monthPlanId,
    staleTime: 60000, // 1 minute (suggestions can get stale quickly)
    gcTime: 5 * 60 * 1000,
  })
}

/**
 * Fetch variance report for a month plan
 */
export function useVarianceReport(monthPlanId: string | null) {
  return useQuery<VarianceReport>({
    queryKey: ["month-plans", monthPlanId, "variance-report"],
    queryFn: async () => {
      if (!monthPlanId) {
        throw new Error("Month plan ID is required")
      }

      const response = await fetch(`/api/month-plans/${monthPlanId}/variance-report`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to fetch variance report")
      }

      const data = await response.json()
      return data.report
    },
    enabled: !!monthPlanId,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  })
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create a new month plan
 */
export function useCreateMonthPlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateMonthPlanData) => {
      const response = await fetch("/api/month-plans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create month plan")
      }

      return response.json()
    },
    onSuccess: (data) => {
      // Invalidate month plans list to refetch
      queryClient.invalidateQueries({ queryKey: ["month-plans"] })

      // Add the new month plan to the cache
      queryClient.setQueryData(["month-plans", data.month_plan.id, "stats"], data.month_plan)

      toast.success("Month plan created successfully")
    },
    onError: (error: Error) => {
      console.error("Failed to create month plan:", error)
      toast.error(error.message || "Failed to create month plan")
    },
  })
}

/**
 * Update an existing month plan
 */
export function useUpdateMonthPlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateMonthPlanData }) => {
      const response = await fetch(`/api/month-plans/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update month plan")
      }

      return response.json()
    },
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["month-plans", id] })

      // Snapshot the previous value
      const previousMonthPlan = queryClient.getQueryData(["month-plans", id, "stats"])

      // Optimistically update the cache
      if (previousMonthPlan) {
        queryClient.setQueryData(["month-plans", id, "stats"], (old: any) => ({
          ...old,
          ...data,
        }))
      }

      return { previousMonthPlan }
    },
    onSuccess: (data, variables) => {
      // Update the specific month plan in cache
      queryClient.setQueryData(["month-plans", variables.id, "stats"], data.month_plan)

      // Invalidate month plans list to refetch
      queryClient.invalidateQueries({ queryKey: ["month-plans"] })

      toast.success("Month plan updated successfully")
    },
    onError: (error: Error, variables, context) => {
      // Rollback optimistic update on error
      if (context?.previousMonthPlan) {
        queryClient.setQueryData(
          ["month-plans", variables.id, "stats"],
          context.previousMonthPlan
        )
      }

      console.error("Failed to update month plan:", error)
      toast.error(error.message || "Failed to update month plan")
    },
    onSettled: (data, error, variables) => {
      // Always invalidate after error or success to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["month-plans", variables.id] })
    },
  })
}

/**
 * Generate expected transactions from templates for a month plan
 */
export function useGenerateExpectedTransactions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      monthPlanId,
      options,
    }: {
      monthPlanId: string
      options?: GenerateExpectedOptions
    }) => {
      const response = await fetch(`/api/month-plans/${monthPlanId}/generate-expected`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(options || {}),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to generate expected transactions")
      }

      return response.json()
    },
    onSuccess: (data: GenerateExpectedResult, variables) => {
      // Invalidate month plan to refetch stats
      queryClient.invalidateQueries({ queryKey: ["month-plans", variables.monthPlanId] })

      // Invalidate expected transactions for this month plan
      queryClient.invalidateQueries({ queryKey: ["expected-transactions", variables.monthPlanId] })

      toast.success(data.message || `Generated ${data.generated_count} expected transactions`)
    },
    onError: (error: Error) => {
      console.error("Failed to generate expected transactions:", error)
      toast.error(error.message || "Failed to generate expected transactions")
    },
  })
}

/**
 * Auto-match transactions for a month plan
 */
export function useAutoMatch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      monthPlanId,
      options,
    }: {
      monthPlanId: string
      options?: AutoMatchOptions
    }) => {
      const response = await fetch(`/api/month-plans/${monthPlanId}/auto-match`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(options || {}),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to auto-match transactions")
      }

      return response.json()
    },
    onSuccess: (data: AutoMatchResult, variables) => {
      // Invalidate month plan to refetch stats
      queryClient.invalidateQueries({ queryKey: ["month-plans", variables.monthPlanId] })

      // Invalidate expected transactions for this month plan
      queryClient.invalidateQueries({ queryKey: ["expected-transactions", variables.monthPlanId] })

      // Invalidate match suggestions since matches were made
      queryClient.invalidateQueries({
        queryKey: ["month-plans", variables.monthPlanId, "match-suggestions"],
      })

      if (data.matched_count > 0) {
        toast.success(data.message || `Auto-matched ${data.matched_count} transactions`)
      } else {
        toast.info(data.message || "No automatic matches found")
      }
    },
    onError: (error: Error) => {
      console.error("Failed to auto-match transactions:", error)
      toast.error(error.message || "Failed to auto-match transactions")
    },
  })
}
