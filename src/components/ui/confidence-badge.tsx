"use client"

import { Badge } from "@/components/ui/badge"
import { getConfidenceLevel } from "@/lib/utils/vendor-duplicate-detection"

interface ConfidenceBadgeProps {
  confidence: number
  showPercentage?: boolean
  className?: string
}

export function ConfidenceBadge({
  confidence,
  showPercentage = false,
  className = "",
}: ConfidenceBadgeProps) {
  const level = getConfidenceLevel(confidence)

  const colorClasses = {
    high: "bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-200 hover:bg-green-100 dark:hover:bg-green-950/40",
    medium: "bg-yellow-100 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-200 hover:bg-yellow-100 dark:hover:bg-yellow-950/40",
    low: "bg-muted text-muted-foreground hover:bg-muted",
  }

  const labels = {
    high: "HIGH CONFIDENCE",
    medium: "MEDIUM CONFIDENCE",
    low: "LOW CONFIDENCE",
  }

  return (
    <Badge className={`${colorClasses[level]} ${className}`}>
      {labels[level]}
      {showPercentage && ` (${Math.round(confidence)}%)`}
    </Badge>
  )
}
