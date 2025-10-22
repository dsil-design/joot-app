"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, RefreshCw, ChevronDown, ChevronUp } from "lucide-react"
import {
  DuplicateSuggestionCard,
  DuplicateSuggestionData,
} from "./duplicate-suggestion-card"
import { DuplicateReviewModal } from "./duplicate-review-modal"
import { toast } from "sonner"

interface VendorDuplicatesWorkspaceProps {
  onVendorsChanged?: () => void
}

export function VendorDuplicatesWorkspace({
  onVendorsChanged,
}: VendorDuplicatesWorkspaceProps) {
  const [suggestions, setSuggestions] = useState<DuplicateSuggestionData[]>([])
  const [ignoredSuggestions, setIgnoredSuggestions] = useState<
    DuplicateSuggestionData[]
  >([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [showIgnored, setShowIgnored] = useState(false)
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const [reviewingSuggestion, setReviewingSuggestion] =
    useState<DuplicateSuggestionData | null>(null)
  const [displayCount, setDisplayCount] = useState(10) // Show 10 by default
  const ITEMS_PER_PAGE = 10

  useEffect(() => {
    fetchSuggestions()
  }, [])

  const fetchSuggestions = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/settings/vendors/duplicates")
      if (!response.ok) throw new Error("Failed to fetch suggestions")

      const data = await response.json()
      setSuggestions(data.suggestions || [])
      setIgnoredSuggestions(data.ignored || [])
      setDisplayCount(10) // Reset display count when fetching new suggestions
    } catch (error) {
      console.error("Error fetching suggestions:", error)
      toast.error("Failed to load duplicate suggestions")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegenerate = async () => {
    setIsRegenerating(true)
    try {
      const response = await fetch("/api/settings/vendors/duplicates", {
        method: "POST",
      })
      if (!response.ok) throw new Error("Failed to regenerate suggestions")

      const data = await response.json()
      setSuggestions(data.suggestions || [])
      setIgnoredSuggestions(data.ignored || [])
      toast.success("Duplicate suggestions refreshed")
    } catch (error) {
      console.error("Error regenerating suggestions:", error)
      toast.error("Failed to refresh suggestions")
    } finally {
      setIsRegenerating(false)
    }
  }

  const handleMerge = async (
    suggestionId: string,
    sourceId: string,
    targetId: string
  ) => {
    try {
      // Call the merge endpoint
      const response = await fetch(`/api/settings/vendors/${sourceId}/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to merge vendors")
      }

      // Remove from suggestions
      setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId))
      toast.success("Vendors merged successfully")

      // Notify parent component
      onVendorsChanged?.()
    } catch (error) {
      console.error("Error merging vendors:", error)
      toast.error(
        error instanceof Error ? error.message : "Failed to merge vendors"
      )
    }
  }

  const handleIgnore = async (suggestionId: string) => {
    try {
      const suggestion = suggestions.find((s) => s.id === suggestionId)
      const isCurrentlyIgnored = suggestion?.status === "ignored"

      const response = await fetch(
        `/api/settings/vendors/duplicates/${suggestionId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: isCurrentlyIgnored ? "pending" : "ignored",
          }),
        }
      )

      if (!response.ok) throw new Error("Failed to update suggestion")

      if (isCurrentlyIgnored) {
        // Restore to pending
        const ignoredSuggestion = ignoredSuggestions.find(
          (s) => s.id === suggestionId
        )
        if (ignoredSuggestion) {
          setIgnoredSuggestions((prev) =>
            prev.filter((s) => s.id !== suggestionId)
          )
          setSuggestions((prev) => [
            { ...ignoredSuggestion, status: "pending" },
            ...prev,
          ])
        }
        toast.success("Suggestion restored")
      } else {
        // Move to ignored
        const pendingSuggestion = suggestions.find((s) => s.id === suggestionId)
        if (pendingSuggestion) {
          setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId))
          setIgnoredSuggestions((prev) => [
            { ...pendingSuggestion, status: "ignored" },
            ...prev,
          ])
        }
        toast.success("Suggestion ignored")
      }
    } catch (error) {
      console.error("Error updating suggestion:", error)
      toast.error("Failed to update suggestion")
    }
  }

  const totalDuplicates = suggestions.length + ignoredSuggestions.length
  const visibleSuggestions = suggestions.slice(0, displayCount)
  const hasMore = displayCount < suggestions.length

  const handleLoadMore = () => {
    setDisplayCount((prev) => Math.min(prev + ITEMS_PER_PAGE, suggestions.length))
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Duplicate Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            Analyzing vendors for duplicates...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (totalDuplicates === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Duplicate Suggestions
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerate}
              disabled={isRegenerating}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isRegenerating ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            No duplicate vendors found. Your vendor list looks clean!
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Duplicate Suggestions
                </CardTitle>
                {suggestions.length > 0 && (
                  <Badge variant="secondary" className="font-semibold">
                    {suggestions.length} potential duplicate{suggestions.length !== 1 ? 's' : ''} found
                  </Badge>
                )}
              </div>
              {suggestions.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  Showing {Math.min(displayCount, suggestions.length)} of {suggestions.length}
                  {ignoredSuggestions.length > 0 && ` • ${ignoredSuggestions.length} ignored`}
                </p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerate}
              disabled={isRegenerating}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isRegenerating ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Pending Suggestions */}
          {suggestions.length > 0 ? (
            <>
              <div className="space-y-3">
                {visibleSuggestions.map((suggestion) => (
                  <DuplicateSuggestionCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    onMerge={handleMerge}
                    onIgnore={handleIgnore}
                    onReview={setReviewingSuggestion}
                    isExpanded={expandedCard === suggestion.id}
                    onToggleExpand={() =>
                      setExpandedCard((prev) =>
                        prev === suggestion.id ? null : suggestion.id
                      )
                    }
                  />
                ))}
              </div>

              {/* Load More Button */}
              {hasMore && (
                <div className="flex justify-center pt-3">
                  <Button
                    variant="outline"
                    onClick={handleLoadMore}
                    className="w-full"
                  >
                    Load More ({suggestions.length - displayCount} remaining)
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-4">
              No pending suggestions. Great work!
            </div>
          )}

          {/* Ignored Suggestions Toggle */}
          {ignoredSuggestions.length > 0 && (
            <div className="pt-3 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowIgnored(!showIgnored)}
                className="w-full justify-between"
              >
                <span className="flex items-center gap-2">
                  {showIgnored ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  {showIgnored ? "Hide" : "Show"} {ignoredSuggestions.length}{" "}
                  ignored suggestion
                  {ignoredSuggestions.length !== 1 ? "s" : ""}
                </span>
              </Button>

              {showIgnored && (
                <div className="space-y-3 mt-3">
                  {ignoredSuggestions.map((suggestion) => (
                    <DuplicateSuggestionCard
                      key={suggestion.id}
                      suggestion={suggestion}
                      onMerge={handleMerge}
                      onIgnore={handleIgnore}
                      onReview={setReviewingSuggestion}
                      isExpanded={expandedCard === suggestion.id}
                      onToggleExpand={() =>
                        setExpandedCard((prev) =>
                          prev === suggestion.id ? null : suggestion.id
                        )
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Modal */}
      <DuplicateReviewModal
        suggestion={reviewingSuggestion}
        open={!!reviewingSuggestion}
        onClose={() => setReviewingSuggestion(null)}
        onMerge={handleMerge}
        onIgnore={handleIgnore}
      />
    </>
  )
}
