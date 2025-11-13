"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type {
  TransactionTemplate,
  CreateTemplateData,
  UpdateTemplateData,
  TemplateFilters,
  TemplatesResponse,
} from "@/lib/types/recurring-transactions"

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Fetch all transaction templates with optional filters
 */
export function useTemplates(filters?: TemplateFilters) {
  return useQuery<TemplatesResponse>({
    queryKey: ["templates", filters],
    queryFn: async () => {
      const params = new URLSearchParams()

      if (filters?.is_active !== undefined) {
        params.set("is_active", filters.is_active.toString())
      }
      if (filters?.frequency) {
        params.set("frequency", filters.frequency)
      }
      if (filters?.transaction_type) {
        params.set("transaction_type", filters.transaction_type)
      }

      const response = await fetch(`/api/templates?${params.toString()}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to fetch templates")
      }

      return response.json()
    },
    staleTime: 30000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Fetch a single transaction template by ID
 */
export function useTemplate(id: string | null) {
  return useQuery<TransactionTemplate>({
    queryKey: ["templates", id],
    queryFn: async () => {
      if (!id) {
        throw new Error("Template ID is required")
      }

      const response = await fetch(`/api/templates/${id}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to fetch template")
      }

      const data = await response.json()
      return data.template
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
 * Create a new transaction template
 */
export function useCreateTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateTemplateData) => {
      const response = await fetch("/api/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create template")
      }

      return response.json()
    },
    onSuccess: (data) => {
      // Invalidate templates list to refetch
      queryClient.invalidateQueries({ queryKey: ["templates"] })

      // Add the new template to the cache
      queryClient.setQueryData(["templates", data.template.id], data.template)

      toast.success("Template created successfully")
    },
    onError: (error: Error) => {
      console.error("Failed to create template:", error)
      toast.error(error.message || "Failed to create template")
    },
  })
}

/**
 * Update an existing transaction template
 */
export function useUpdateTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTemplateData }) => {
      const response = await fetch(`/api/templates/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update template")
      }

      return response.json()
    },
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["templates", id] })

      // Snapshot the previous value
      const previousTemplate = queryClient.getQueryData(["templates", id])

      // Optimistically update the cache
      if (previousTemplate) {
        queryClient.setQueryData(["templates", id], (old: any) => ({
          ...old,
          ...data,
        }))
      }

      return { previousTemplate }
    },
    onSuccess: (data, variables) => {
      // Update the specific template in cache
      queryClient.setQueryData(["templates", variables.id], data.template)

      // Invalidate templates list to refetch
      queryClient.invalidateQueries({ queryKey: ["templates"] })

      toast.success("Template updated successfully")
    },
    onError: (error: Error, variables, context) => {
      // Rollback optimistic update on error
      if (context?.previousTemplate) {
        queryClient.setQueryData(["templates", variables.id], context.previousTemplate)
      }

      console.error("Failed to update template:", error)
      toast.error(error.message || "Failed to update template")
    },
    onSettled: (data, error, variables) => {
      // Always invalidate after error or success to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["templates", variables.id] })
    },
  })
}

/**
 * Delete a transaction template
 */
export function useDeleteTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/templates/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete template")
      }

      return response.json()
    },
    onSuccess: (data, id) => {
      // Remove the template from cache
      queryClient.removeQueries({ queryKey: ["templates", id] })

      // Invalidate templates list to refetch
      queryClient.invalidateQueries({ queryKey: ["templates"] })

      toast.success("Template deleted successfully")
    },
    onError: (error: Error) => {
      console.error("Failed to delete template:", error)
      toast.error(error.message || "Failed to delete template")
    },
  })
}

/**
 * Toggle template active status (convenience hook)
 */
export function useToggleTemplateActive() {
  const updateTemplate = useUpdateTemplate()

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return updateTemplate.mutateAsync({
        id,
        data: { is_active: isActive },
      })
    },
  })
}
