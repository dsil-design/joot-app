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
    high: "bg-green-100 text-green-800 hover:bg-green-100",
    medium: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
    low: "bg-gray-100 text-gray-600 hover:bg-gray-100",
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
