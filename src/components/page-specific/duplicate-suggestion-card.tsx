"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ConfidenceBadge } from "@/components/ui/confidence-badge"
import { ArrowRight, ArrowLeftRight, ChevronDown, ChevronUp, Eye, GitMerge } from "lucide-react"

export interface VendorInfo {
  id: string
  name: string
  transactionCount: number
}

export interface DuplicateSuggestionData {
  id: string
  sourceVendor: VendorInfo
  targetVendor: VendorInfo
  confidence: number
  reasons: string[]
  status: "pending" | "ignored"
}

interface DuplicateSuggestionCardProps {
  suggestion: DuplicateSuggestionData
  onMerge: (suggestionId: string, sourceId: string, targetId: string) => void
  onIgnore: (suggestionId: string) => void
  onReview: (suggestion: DuplicateSuggestionData) => void
  onMergeTo?: (suggestion: DuplicateSuggestionData) => void
  isExpanded?: boolean
  onToggleExpand?: () => void
  disabled?: boolean
}

export function DuplicateSuggestionCard({
  suggestion,
  onMerge,
  onIgnore,
  onReview,
  onMergeTo,
  isExpanded = false,
  onToggleExpand,
  disabled = false,
}: DuplicateSuggestionCardProps) {
  const [isProcessing, setIsProcessing] = useState(false)

  const handleMerge = async () => {
    setIsProcessing(true)
    try {
      await onMerge(
        suggestion.id,
        suggestion.sourceVendor.id,
        suggestion.targetVendor.id
      )
    } finally {
      setIsProcessing(false)
    }
  }

  const handleMergeReverse = async () => {
    setIsProcessing(true)
    try {
      await onMerge(
        suggestion.id,
        suggestion.targetVendor.id,
        suggestion.sourceVendor.id
      )
    } finally {
      setIsProcessing(false)
    }
  }

  const handleIgnore = async () => {
    setIsProcessing(true)
    try {
      await onIgnore(suggestion.id)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Card
      className={`transition-all ${
        disabled ? "opacity-60 pointer-events-none" : ""
      }`}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <ConfidenceBadge
                confidence={suggestion.confidence}
                showPercentage
              />
              {suggestion.status === "ignored" && (
                <Badge variant="secondary">Ignored</Badge>
              )}
            </div>
            {onToggleExpand && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleExpand}
                disabled={disabled}
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>

          {/* Vendor Names */}
          <div className="flex items-center gap-3 text-base">
            <div className="flex-1">
              <div className="font-medium">{suggestion.sourceVendor.name}</div>
              <div className="text-sm text-muted-foreground">
                {suggestion.sourceVendor.transactionCount} transaction
                {suggestion.sourceVendor.transactionCount !== 1 ? "s" : ""}
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1">
              <div className="font-medium">{suggestion.targetVendor.name}</div>
              <div className="text-sm text-muted-foreground">
                {suggestion.targetVendor.transactionCount} transaction
                {suggestion.targetVendor.transactionCount !== 1 ? "s" : ""}
              </div>
            </div>
          </div>

          {/* Expanded Content */}
          {isExpanded && (
            <div className="pt-2 border-t space-y-3">
              <div>
                <div className="text-sm font-medium mb-2">
                  Why these might be duplicates:
                </div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {suggestion.reasons.map((reason, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-muted-foreground">•</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="text-sm text-muted-foreground space-y-1">
                <p>
                  <span className="font-medium">Merge:</span> Move all {suggestion.sourceVendor.transactionCount}{" "}
                  transaction{suggestion.sourceVendor.transactionCount !== 1 ? "s" : ""}{" "}
                  from <span className="font-medium">{suggestion.sourceVendor.name}</span>{" "}
                  to <span className="font-medium">{suggestion.targetVendor.name}</span>.
                </p>
                <p>
                  <span className="font-medium">Merge the Other Way:</span> Move all {suggestion.targetVendor.transactionCount}{" "}
                  transaction{suggestion.targetVendor.transactionCount !== 1 ? "s" : ""}{" "}
                  from <span className="font-medium">{suggestion.targetVendor.name}</span>{" "}
                  to <span className="font-medium">{suggestion.sourceVendor.name}</span>.
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onReview(suggestion)}
              disabled={disabled || isProcessing}
            >
              <Eye className="h-4 w-4 mr-2" />
              Review Details
            </Button>
            {suggestion.status === "pending" && onMergeTo && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onMergeTo(suggestion)}
                disabled={disabled || isProcessing}
              >
                <GitMerge className="h-4 w-4 mr-2" />
                Merge to...
              </Button>
            )}
            <div className="flex-1" />
            <Button
              variant="outline"
              size="sm"
              onClick={handleIgnore}
              disabled={disabled || isProcessing}
            >
              {suggestion.status === "ignored" ? "Restore" : "Ignore"}
            </Button>
            {suggestion.status === "pending" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMergeReverse}
                  disabled={disabled || isProcessing}
                >
                  <ArrowLeftRight className="h-4 w-4 mr-2" />
                  Merge the Other Way
                </Button>
                <Button
                  size="sm"
                  onClick={handleMerge}
                  disabled={disabled || isProcessing}
                >
                  Merge
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
