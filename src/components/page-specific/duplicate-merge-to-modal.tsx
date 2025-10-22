"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { DuplicateSuggestionData } from "./duplicate-suggestion-card"

interface Vendor {
  id: string
  name: string
  transactionCount: number
}

interface DuplicateMergeToModalProps {
  suggestion: DuplicateSuggestionData | null
  open: boolean
  onClose: () => void
  onMerge: (suggestionId: string, sourceId: string, targetId: string) => void
}

export function DuplicateMergeToModal({
  suggestion,
  open,
  onClose,
  onMerge,
}: DuplicateMergeToModalProps) {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [selectedSourceId, setSelectedSourceId] = useState<string>("")
  const [selectedTargetId, setSelectedTargetId] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [isMerging, setIsMerging] = useState(false)

  useEffect(() => {
    if (open && suggestion) {
      // Reset state when opening
      setSelectedSourceId(suggestion.sourceVendor.id)
      setSelectedTargetId("")
      fetchVendors()
    }
  }, [open, suggestion])

  const fetchVendors = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/settings/vendors")
      if (!response.ok) throw new Error("Failed to fetch vendors")

      const data = await response.json()
      setVendors(data)

      // Pre-select the target vendor after vendors are loaded
      if (suggestion) {
        setSelectedTargetId(suggestion.targetVendor.id)
      }
    } catch (error) {
      console.error("Error fetching vendors:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleMerge = async () => {
    if (!suggestion || !selectedSourceId || !selectedTargetId) return

    setIsMerging(true)
    try {
      await onMerge(suggestion.id, selectedSourceId, selectedTargetId)
      onClose()
    } finally {
      setIsMerging(false)
    }
  }

  if (!suggestion) return null

  const sourceOptions = [
    {
      id: suggestion.sourceVendor.id,
      name: suggestion.sourceVendor.name,
      transactionCount: suggestion.sourceVendor.transactionCount,
    },
    {
      id: suggestion.targetVendor.id,
      name: suggestion.targetVendor.name,
      transactionCount: suggestion.targetVendor.transactionCount,
    },
  ]

  const availableTargets = vendors.filter(
    (v) => v.id !== selectedSourceId
  )

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Merge to Custom Vendor</DialogTitle>
          <DialogDescription>
            Select which vendor to merge from, and which vendor to merge into.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="source">Merge from</Label>
            <Select value={selectedSourceId} onValueChange={setSelectedSourceId}>
              <SelectTrigger id="source">
                <SelectValue placeholder="Select vendor to merge from" />
              </SelectTrigger>
              <SelectContent>
                {sourceOptions.map((vendor) => (
                  <SelectItem key={vendor.id} value={vendor.id}>
                    {vendor.name}{" "}
                    <span className="text-muted-foreground">
                      ({vendor.transactionCount})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="target">Merge into</Label>
            <Select
              value={selectedTargetId}
              onValueChange={setSelectedTargetId}
              disabled={!selectedSourceId || isLoading}
            >
              <SelectTrigger id="target">
                <SelectValue placeholder="Select target vendor" />
              </SelectTrigger>
              <SelectContent>
                {isLoading ? (
                  <SelectItem value="loading" disabled>
                    Loading vendors...
                  </SelectItem>
                ) : (
                  availableTargets.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.name}{" "}
                      <span className="text-muted-foreground">
                        ({vendor.transactionCount})
                      </span>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isMerging}
          >
            Cancel
          </Button>
          <Button
            onClick={handleMerge}
            disabled={isMerging || !selectedSourceId || !selectedTargetId}
          >
            {isMerging ? "Merging..." : "Merge"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
