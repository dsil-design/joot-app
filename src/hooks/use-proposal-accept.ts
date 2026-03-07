"use client"

import * as React from "react"
import type { ProposalMeta } from "@/components/page-specific/create-from-import-dialog"

/**
 * Hook for updating proposal status after user creates a transaction.
 * Wraps the PATCH /api/imports/proposals/[id] call.
 */
export function useProposalAccept() {
  const [isUpdating, setIsUpdating] = React.useState(false)

  const acceptProposal = React.useCallback(
    async (
      meta: ProposalMeta,
      createdTransactionId?: string
    ): Promise<boolean> => {
      if (!meta.proposalId) return true

      setIsUpdating(true)
      try {
        const response = await fetch(`/api/imports/proposals/${meta.proposalId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: meta.proposalFieldsModified ? "modified" : "accepted",
            createdTransactionId,
            userModifications: meta.modifiedFields,
          }),
        })

        if (!response.ok) {
          console.error("Failed to update proposal status")
          return false
        }

        return true
      } catch (error) {
        console.error("Error updating proposal:", error)
        return false
      } finally {
        setIsUpdating(false)
      }
    },
    []
  )

  return { acceptProposal, isUpdating }
}
