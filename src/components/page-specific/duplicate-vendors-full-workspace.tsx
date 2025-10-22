"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  RefreshCw,
  Filter,
  Users,
  Target,
  ListFilter,
  X,
  CheckCircle,
  Search,
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DuplicateSuggestionCard,
  DuplicateSuggestionData,
} from "./duplicate-suggestion-card"
import { DuplicateReviewModal } from "./duplicate-review-modal"
import { DuplicateMergeToModal } from "./duplicate-merge-to-modal"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"

interface VendorForFilter {
  id: string
  name: string
}

interface DuplicateVendorsWorkspaceProps {
  allVendors: VendorForFilter[]
}

type ConfidenceFilter = "all" | "high" | "medium" | "low"
type StatusFilter = "all" | "pending" | "ignored"

export function DuplicateVendorsWorkspace({
  allVendors,
}: DuplicateVendorsWorkspaceProps) {
  const router = useRouter()
  const [suggestions, setSuggestions] = useState<DuplicateSuggestionData[]>([])
  const [ignoredSuggestions, setIgnoredSuggestions] = useState<
    DuplicateSuggestionData[]
  >([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const [reviewingSuggestion, setReviewingSuggestion] =
    useState<DuplicateSuggestionData | null>(null)
  const [mergeToSuggestion, setMergeToSuggestion] =
    useState<DuplicateSuggestionData | null>(null)

  // Filter states
  const [vendorFilterOpen, setVendorFilterOpen] = useState(false)
  const [selectedVendors, setSelectedVendors] = useState<string[]>([])
  const [confidenceFilter, setConfidenceFilter] =
    useState<ConfidenceFilter>("all")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")

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
    } catch (error) {
      console.error("Error fetching suggestions:", error)
      toast.error("Failed to load duplicate suggestions")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      const response = await fetch("/api/settings/vendors/duplicates", {
        method: "POST",
      })
      if (!response.ok) throw new Error("Failed to refresh suggestions")

      const data = await response.json()
      setSuggestions(data.suggestions || [])
      setIgnoredSuggestions(data.ignored || [])
      toast.success("Duplicate suggestions refreshed")
    } catch (error) {
      console.error("Error refreshing suggestions:", error)
      toast.error("Failed to refresh suggestions")
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleMerge = async (
    suggestionId: string,
    sourceId: string,
    targetId: string
  ) => {
    try {
      const response = await fetch(`/api/settings/vendors/${sourceId}/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to merge vendors")
      }

      setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId))
      setIgnoredSuggestions((prev) => prev.filter((s) => s.id !== suggestionId))
      toast.success("Vendors merged successfully")
      router.refresh()
    } catch (error) {
      console.error("Error merging vendors:", error)
      toast.error(
        error instanceof Error ? error.message : "Failed to merge vendors"
      )
    }
  }

  const handleIgnore = async (suggestionId: string) => {
    try {
      const allSuggestions = [...suggestions, ...ignoredSuggestions]
      const suggestion = allSuggestions.find((s) => s.id === suggestionId)
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

  // Filter logic
  const toggleVendorFilter = (vendorId: string) => {
    setSelectedVendors((prev) =>
      prev.includes(vendorId)
        ? prev.filter((id) => id !== vendorId)
        : [...prev, vendorId]
    )
  }

  const removeVendorFilter = (vendorId: string) => {
    setSelectedVendors((prev) => prev.filter((id) => id !== vendorId))
  }

  const clearAllFilters = () => {
    setSelectedVendors([])
    setConfidenceFilter("all")
    setStatusFilter("all")
  }

  const hasActiveFilters =
    selectedVendors.length > 0 ||
    confidenceFilter !== "all" ||
    statusFilter !== "all"

  // Get all vendors that appear in suggestions
  const allVendorsInSuggestions = useMemo(() => {
    const vendorMap = new Map<string, { name: string; count: number }>()

    const allSuggs = [...suggestions, ...ignoredSuggestions]
    allSuggs.forEach((sugg) => {
      // Count source vendor
      const sourceId = sugg.sourceVendor.id
      if (!vendorMap.has(sourceId)) {
        vendorMap.set(sourceId, { name: sugg.sourceVendor.name, count: 0 })
      }
      vendorMap.get(sourceId)!.count++

      // Count target vendor
      const targetId = sugg.targetVendor.id
      if (!vendorMap.has(targetId)) {
        vendorMap.set(targetId, { name: sugg.targetVendor.name, count: 0 })
      }
      vendorMap.get(targetId)!.count++
    })

    return Array.from(vendorMap.entries())
      .map(([id, data]) => ({ id, name: data.name, count: data.count }))
      .sort((a, b) => b.count - a.count)
  }, [suggestions, ignoredSuggestions])

  // Apply filters
  const filteredSuggestions = useMemo(() => {
    let allSuggs =
      statusFilter === "pending"
        ? suggestions
        : statusFilter === "ignored"
          ? ignoredSuggestions
          : [...suggestions, ...ignoredSuggestions]

    // Filter by vendors
    if (selectedVendors.length > 0) {
      allSuggs = allSuggs.filter(
        (sugg) =>
          selectedVendors.includes(sugg.sourceVendor.id) ||
          selectedVendors.includes(sugg.targetVendor.id)
      )
    }

    // Filter by confidence
    if (confidenceFilter !== "all") {
      allSuggs = allSuggs.filter((sugg) => {
        if (confidenceFilter === "high") return sugg.confidence >= 80
        if (confidenceFilter === "medium")
          return sugg.confidence >= 55 && sugg.confidence < 80
        if (confidenceFilter === "low")
          return sugg.confidence >= 40 && sugg.confidence < 55
        return true
      })
    }

    return allSuggs
  }, [
    suggestions,
    ignoredSuggestions,
    selectedVendors,
    confidenceFilter,
    statusFilter,
  ])

  const pendingCount = suggestions.length
  const ignoredCount = ignoredSuggestions.length
  const totalSuggestions = pendingCount + ignoredCount
  const filteredCount = filteredSuggestions.length

  const navigateBack = () => {
    router.push("/settings/vendors")
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50">
        {/* Header Skeleton */}
        <header className="sticky top-0 z-10 bg-white border-b border-zinc-200 shadow-sm">
          <div className="max-w-[1400px] mx-auto px-8 py-6">
            <Skeleton className="h-10 w-96 mb-2" />
            <Skeleton className="h-4 w-full max-w-2xl" />
          </div>
        </header>

        {/* Content Skeleton */}
        <div className="max-w-[1400px] mx-auto px-8 py-8">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-5">
                  <div className="space-y-4">
                    <Skeleton className="h-6 w-32" />
                    <div className="grid grid-cols-3 gap-4">
                      <Skeleton className="h-20 w-full" />
                      <Skeleton className="h-20 w-full" />
                      <Skeleton className="h-20 w-full" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (totalSuggestions === 0) {
    return (
      <div className="min-h-screen bg-zinc-50">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-white border-b border-zinc-200 shadow-sm">
          <div className="max-w-[1400px] mx-auto px-8 py-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Button variant="ghost" size="sm" onClick={navigateBack}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <h1 className="text-3xl font-semibold text-zinc-950">
                    Manage Duplicate Vendors
                  </h1>
                </div>
                <p className="text-base text-zinc-500 ml-11">
                  Review potential duplicate vendors detected by our fuzzy
                  matching algorithm. Consolidate duplicates to keep your data
                  clean and accurate.
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Empty State */}
        <div className="max-w-[1400px] mx-auto px-8 py-16">
          <Card className="border-dashed border-2 border-zinc-300">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-green-100 p-4 mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-zinc-950 mb-2">
                No Duplicate Vendors Found
              </h3>
              <p className="text-base text-zinc-600 max-w-md mb-6">
                Your vendor list looks clean! Our analysis didn&apos;t find any
                potential duplicates. You can refresh the analysis anytime to
                check again.
              </p>
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
                />
                Refresh Analysis
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-zinc-50">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-white border-b border-zinc-200 shadow-sm">
          <div className="max-w-[1400px] mx-auto px-8 py-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Button variant="ghost" size="sm" onClick={navigateBack}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <h1 className="text-3xl font-semibold text-zinc-950">
                    Manage Duplicate Vendors
                  </h1>
                </div>
                <p className="text-base text-zinc-500 ml-11">
                  Review potential duplicate vendors detected by our fuzzy
                  matching algorithm. Consolidate duplicates to keep your data
                  clean and accurate.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                >
                  <RefreshCw
                    className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
                  />
                  Refresh Analysis
                </Button>
              </div>
            </div>

            {/* Stats Summary */}
            <div className="flex items-center gap-6 ml-11">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                <span className="text-sm text-zinc-600">
                  <span className="font-semibold text-zinc-950">
                    {pendingCount}
                  </span>{" "}
                  Pending Review
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-zinc-400" />
                <span className="text-sm text-zinc-600">
                  <span className="font-semibold text-zinc-950">
                    {ignoredCount}
                  </span>{" "}
                  Ignored
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm text-zinc-600">
                  <span className="font-semibold text-zinc-950">
                    {totalSuggestions}
                  </span>{" "}
                  Total Suggestions
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Filter Bar */}
        <div className="sticky top-[calc(theme(spacing.6)*2+theme(spacing.16))] z-10 bg-zinc-50 border-b border-zinc-200">
          <div className="max-w-[1400px] mx-auto px-8 py-4">
            <div className="flex items-center gap-3 mb-3">
              <Filter className="h-5 w-5 text-zinc-600" />
              <span className="text-sm font-medium text-zinc-900">Filters</span>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                >
                  Clear All
                </Button>
              )}
            </div>

            {/* Filter Controls Row */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Vendor Name Multi-Select */}
              <Popover
                open={vendorFilterOpen}
                onOpenChange={setVendorFilterOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-9 border-zinc-300 bg-white hover:bg-zinc-50"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Vendor Names
                    {selectedVendors.length > 0 && (
                      <Badge
                        variant="secondary"
                        className="ml-2 h-5 px-1.5 bg-blue-100 text-blue-800"
                      >
                        {selectedVendors.length}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search vendors..." />
                    <CommandEmpty>No vendors found.</CommandEmpty>
                    <CommandGroup className="max-h-64 overflow-auto">
                      {allVendorsInSuggestions.map((vendor) => (
                        <CommandItem
                          key={vendor.id}
                          onSelect={() => toggleVendorFilter(vendor.id)}
                        >
                          <Checkbox
                            checked={selectedVendors.includes(vendor.id)}
                            className="mr-2"
                          />
                          <span className="flex-1">{vendor.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {vendor.count}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>

              {/* Confidence Level Filter */}
              <Select
                value={confidenceFilter}
                onValueChange={(value) =>
                  setConfidenceFilter(value as ConfidenceFilter)
                }
              >
                <SelectTrigger className="h-9 w-[180px] border-zinc-300 bg-white">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    <SelectValue placeholder="All Confidence Levels" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Confidence Levels</SelectItem>
                  <SelectItem value="high">High (80%+)</SelectItem>
                  <SelectItem value="medium">Medium (55-79%)</SelectItem>
                  <SelectItem value="low">Low (40-54%)</SelectItem>
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  setStatusFilter(value as StatusFilter)
                }
              >
                <SelectTrigger className="h-9 w-[160px] border-zinc-300 bg-white">
                  <div className="flex items-center gap-2">
                    <ListFilter className="h-4 w-4" />
                    <SelectValue placeholder="All Statuses" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending Only</SelectItem>
                  <SelectItem value="ignored">Ignored Only</SelectItem>
                </SelectContent>
              </Select>

              {/* Results Count */}
              <div className="ml-auto text-sm text-zinc-600">
                <span className="font-medium text-zinc-950">
                  {filteredCount}
                </span>{" "}
                results
              </div>
            </div>

            {/* Active Filter Chips */}
            {hasActiveFilters && (
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {selectedVendors.map((vendorId) => {
                  const vendor = allVendorsInSuggestions.find(
                    (v) => v.id === vendorId
                  )
                  return (
                    <Badge
                      key={vendorId}
                      variant="secondary"
                      className="h-6 pl-2 pr-1 bg-blue-100 text-blue-800 hover:bg-blue-100"
                    >
                      {vendor?.name}
                      <button
                        onClick={() => removeVendorFilter(vendorId)}
                        className="ml-1 rounded-full hover:bg-blue-200 p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )
                })}
                {confidenceFilter !== "all" && (
                  <Badge
                    variant="secondary"
                    className="h-6 pl-2 pr-1 bg-zinc-200 text-zinc-800"
                  >
                    {confidenceFilter} confidence
                    <button
                      onClick={() => setConfidenceFilter("all")}
                      className="ml-1 rounded-full hover:bg-zinc-300 p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {statusFilter !== "all" && (
                  <Badge
                    variant="secondary"
                    className="h-6 pl-2 pr-1 bg-zinc-200 text-zinc-800"
                  >
                    {statusFilter}
                    <button
                      onClick={() => setStatusFilter("all")}
                      className="ml-1 rounded-full hover:bg-zinc-300 p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-[1400px] mx-auto px-8 py-8">
          {filteredCount === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-zinc-100 p-4 mb-4">
                  <Search className="h-8 w-8 text-zinc-400" />
                </div>
                <h3 className="text-lg font-semibold text-zinc-950 mb-2">
                  No matches found
                </h3>
                <p className="text-sm text-zinc-600 max-w-md mb-4">
                  Try adjusting your filters to see more results.
                </p>
                <Button
                  variant="ghost"
                  onClick={clearAllFilters}
                  className="text-blue-600"
                >
                  Clear all filters
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredSuggestions.map((suggestion) => (
                <DuplicateSuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  onMerge={handleMerge}
                  onIgnore={handleIgnore}
                  onReview={setReviewingSuggestion}
                  onMergeTo={setMergeToSuggestion}
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
      </div>

      {/* Review Modal */}
      <DuplicateReviewModal
        suggestion={reviewingSuggestion}
        open={!!reviewingSuggestion}
        onClose={() => setReviewingSuggestion(null)}
        onMerge={handleMerge}
        onIgnore={handleIgnore}
      />

      {/* Merge To Modal */}
      <DuplicateMergeToModal
        suggestion={mergeToSuggestion}
        open={!!mergeToSuggestion}
        onClose={() => setMergeToSuggestion(null)}
        onMerge={handleMerge}
      />
    </>
  )
}
