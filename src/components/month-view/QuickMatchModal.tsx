"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { getCurrencySymbolSync } from "@/lib/utils/currency-symbols"
import { format } from "date-fns"
import { Search, TrendingUp, TrendingDown, Check } from "lucide-react"
import type { ExpectedTransaction, MatchSuggestion } from "@/lib/types/recurring-transactions"

export interface QuickMatchModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  expectedTransaction: ExpectedTransaction | null
  matchSuggestions?: MatchSuggestion[]
  onMatch: (expectedId: string, transactionId: string) => Promise<void>
  loading?: boolean
}

/**
 * Modal for matching expected transaction to actual transaction
 * Shows match suggestions with confidence scores
 */
export function QuickMatchModal({
  open,
  onOpenChange,
  expectedTransaction,
  matchSuggestions = [],
  onMatch,
  loading = false,
}: QuickMatchModalProps) {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedTransactionId, setSelectedTransactionId] = React.useState<string | null>(null)
  const [isMatching, setIsMatching] = React.useState(false)

  // Reset selection when modal opens/closes
  React.useEffect(() => {
    if (!open) {
      setSelectedTransactionId(null)
      setSearchQuery("")
    }
  }, [open])

  if (!expectedTransaction) return null

  const filteredSuggestions = matchSuggestions.filter((suggestion) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      suggestion.actual.description.toLowerCase().includes(query) ||
      suggestion.match_reasons.some((reason) => reason.toLowerCase().includes(query))
    )
  })

  const handleConfirmMatch = async () => {
    if (!selectedTransactionId) return

    setIsMatching(true)
    try {
      await onMatch(expectedTransaction.id, selectedTransactionId)
      onOpenChange(false)
    } finally {
      setIsMatching(false)
    }
  }

  const currencySymbol = getCurrencySymbolSync(expectedTransaction.original_currency)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Match Transaction</DialogTitle>
          <DialogDescription>
            Find and match an actual transaction to this expected transaction
          </DialogDescription>
        </DialogHeader>

        {/* Expected Transaction Info */}
        <div className="border rounded-lg p-4 bg-zinc-50">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm text-zinc-900 mb-1">
                {expectedTransaction.vendor?.name || expectedTransaction.description}
              </h4>
              <p className="text-xs text-zinc-500">
                Expected on {format(new Date(expectedTransaction.expected_date), "MMM d, yyyy")}
              </p>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-zinc-900">
                {currencySymbol}
                {expectedTransaction.expected_amount.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <div className="text-xs text-zinc-500">expected</div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="space-y-2">
          <Label htmlFor="search">Search transactions</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
            <Input
              id="search"
              placeholder="Search by description or match reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Match Suggestions */}
        <div className="space-y-2">
          <Label>
            Suggested matches ({filteredSuggestions.length})
          </Label>
          <ScrollArea className="h-[300px] border rounded-lg">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-sm text-zinc-500">
                Loading suggestions...
              </div>
            ) : filteredSuggestions.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-sm text-zinc-500">
                {searchQuery ? "No matching transactions found" : "No match suggestions available"}
              </div>
            ) : (
              <div className="p-2 space-y-2">
                {filteredSuggestions.map((suggestion) => (
                  <MatchSuggestionCard
                    key={suggestion.transaction_id}
                    suggestion={suggestion}
                    isSelected={selectedTransactionId === suggestion.transaction_id}
                    onSelect={() => setSelectedTransactionId(suggestion.transaction_id)}
                    currencySymbol={currencySymbol}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isMatching}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmMatch}
            disabled={!selectedTransactionId || isMatching}
          >
            {isMatching ? "Matching..." : "Confirm Match"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface MatchSuggestionCardProps {
  suggestion: MatchSuggestion
  isSelected: boolean
  onSelect: () => void
  currencySymbol: string
}

function MatchSuggestionCard({
  suggestion,
  isSelected,
  onSelect,
  currencySymbol,
}: MatchSuggestionCardProps) {
  const { actual, confidence_score, match_reasons } = suggestion
  const variance = actual.amount - suggestion.expected.expected_amount
  const variancePercentage = (variance / suggestion.expected.expected_amount) * 100

  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full text-left p-3 rounded-lg border-2 transition-all hover:bg-zinc-50",
        isSelected
          ? "border-blue-500 bg-blue-50 hover:bg-blue-50"
          : "border-zinc-200 hover:border-zinc-300"
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <h5 className="font-medium text-sm text-zinc-900 truncate mb-1">
            {actual.description}
          </h5>
          <p className="text-xs text-zinc-500">
            {format(new Date(actual.transaction_date), "MMM d, yyyy")}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <ConfidenceBadge confidence={confidence_score} />
          {isSelected && <Check className="size-4 text-blue-600" />}
        </div>
      </div>

      <div className="flex items-baseline justify-between gap-2 mb-2">
        <span className="text-sm font-semibold text-zinc-900">
          {currencySymbol}
          {actual.amount.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>

        {variance !== 0 && (
          <span
            className={cn(
              "text-xs font-medium",
              variance > 0 ? "text-red-600" : "text-green-600"
            )}
          >
            {variance > 0 ? (
              <TrendingUp className="size-3 inline mr-1" />
            ) : (
              <TrendingDown className="size-3 inline mr-1" />
            )}
            {variance > 0 ? "+" : ""}
            {currencySymbol}
            {Math.abs(variance).toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            ({variancePercentage > 0 ? "+" : ""}
            {variancePercentage.toFixed(0)}%)
          </span>
        )}
      </div>

      {match_reasons.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {match_reasons.map((reason, index) => (
            <Badge key={index} variant="outline" className="text-[10px] py-0">
              {reason}
            </Badge>
          ))}
        </div>
      )}
    </button>
  )
}

interface ConfidenceBadgeProps {
  confidence: number
}

function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  let variant: "default" | "secondary" | "outline" = "outline"
  let color = "text-zinc-600"

  if (confidence >= 90) {
    variant = "default"
    color = "text-green-700 bg-green-100 border-green-200"
  } else if (confidence >= 70) {
    variant = "secondary"
    color = "text-amber-700 bg-amber-100 border-amber-200"
  }

  return (
    <Badge variant={variant} className={cn("text-[10px]", color)}>
      {confidence}% match
    </Badge>
  )
}
