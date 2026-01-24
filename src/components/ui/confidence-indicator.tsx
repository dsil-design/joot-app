"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Confidence level type
 */
export type ConfidenceLevel = "high" | "medium" | "low"

/**
 * Get confidence level from score
 * - High: >= 90
 * - Medium: >= 55
 * - Low: < 55
 */
export function getConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= 90) return "high"
  if (score >= 55) return "medium"
  return "low"
}

/**
 * ConfidenceIndicator props
 */
export interface ConfidenceIndicatorProps {
  /**
   * Confidence score (0-100)
   */
  score: number

  /**
   * Whether to show the percentage value
   * @default true
   */
  showPercentage?: boolean

  /**
   * Whether to show the confidence level badge
   * @default true
   */
  showBadge?: boolean

  /**
   * Whether to show the progress bar
   * @default true
   */
  showProgressBar?: boolean

  /**
   * Size variant
   * - sm: Compact for inline use
   * - md: Default size
   * - lg: Large for emphasis
   * @default "md"
   */
  size?: "sm" | "md" | "lg"

  /**
   * Layout direction
   * @default "horizontal"
   */
  layout?: "horizontal" | "vertical"

  /**
   * Additional class name
   */
  className?: string
}

/**
 * ConfidenceIndicator Component
 *
 * A visual indicator showing match confidence with:
 * - Progress bar (colored by confidence level)
 * - Percentage display
 * - Confidence level badge (HIGH/MEDIUM/LOW)
 *
 * Colors:
 * - High (>= 90%): Green
 * - Medium (55-89%): Amber/Yellow
 * - Low (< 55%): Red
 */
export function ConfidenceIndicator({
  score,
  showPercentage = true,
  showBadge = true,
  showProgressBar = true,
  size = "md",
  layout = "horizontal",
  className,
}: ConfidenceIndicatorProps) {
  const level = getConfidenceLevel(score)
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)))

  // Color configurations by level
  const levelConfig = {
    high: {
      barColor: "bg-green-500",
      barBgColor: "bg-green-100",
      badgeColor: "bg-green-100 text-green-800 border-green-200",
      label: "HIGH",
    },
    medium: {
      barColor: "bg-amber-500",
      barBgColor: "bg-amber-100",
      badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
      label: "MEDIUM",
    },
    low: {
      barColor: "bg-red-500",
      barBgColor: "bg-red-100",
      badgeColor: "bg-red-100 text-red-800 border-red-200",
      label: "LOW",
    },
  }

  const config = levelConfig[level]

  // Size configurations
  const sizeConfig = {
    sm: {
      container: "gap-1.5",
      bar: "h-1.5 rounded-full",
      barWidth: "w-16",
      percentage: "text-xs font-medium",
      badge: "text-[10px] px-1.5 py-0.5 rounded",
    },
    md: {
      container: "gap-2",
      bar: "h-2 rounded-full",
      barWidth: "w-24",
      percentage: "text-sm font-medium",
      badge: "text-xs px-2 py-0.5 rounded-md",
    },
    lg: {
      container: "gap-3",
      bar: "h-3 rounded-full",
      barWidth: "w-32",
      percentage: "text-base font-semibold",
      badge: "text-sm px-2.5 py-1 rounded-md",
    },
  }

  const sizes = sizeConfig[size]

  const isVertical = layout === "vertical"

  return (
    <div
      className={cn(
        "flex items-center",
        isVertical ? "flex-col items-start" : "flex-row",
        sizes.container,
        className
      )}
      role="meter"
      aria-label={`Confidence: ${clampedScore}%`}
      aria-valuenow={clampedScore}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {/* Progress Bar */}
      {showProgressBar && (
        <div
          className={cn(
            "relative overflow-hidden",
            config.barBgColor,
            sizes.bar,
            sizes.barWidth
          )}
        >
          <div
            className={cn("h-full transition-all duration-300", config.barColor)}
            style={{ width: `${clampedScore}%` }}
          />
        </div>
      )}

      {/* Percentage */}
      {showPercentage && (
        <span
          className={cn(
            sizes.percentage,
            level === "high" && "text-green-700",
            level === "medium" && "text-amber-700",
            level === "low" && "text-red-700"
          )}
        >
          {clampedScore}%
        </span>
      )}

      {/* Badge */}
      {showBadge && (
        <span
          className={cn(
            "inline-flex items-center font-medium border",
            config.badgeColor,
            sizes.badge
          )}
        >
          {config.label}
        </span>
      )}
    </div>
  )
}

/**
 * ConfidenceIndicatorCompact
 *
 * A minimal version showing just the progress bar with color-coded level
 */
export function ConfidenceIndicatorCompact({
  score,
  className,
}: {
  score: number
  className?: string
}) {
  return (
    <ConfidenceIndicator
      score={score}
      showPercentage={false}
      showBadge={false}
      showProgressBar={true}
      size="sm"
      className={className}
    />
  )
}

/**
 * ConfidenceIndicatorBadgeOnly
 *
 * Just the confidence badge without the progress bar
 */
export function ConfidenceIndicatorBadgeOnly({
  score,
  showPercentage = true,
  size = "md",
  className,
}: {
  score: number
  showPercentage?: boolean
  size?: "sm" | "md" | "lg"
  className?: string
}) {
  return (
    <ConfidenceIndicator
      score={score}
      showPercentage={showPercentage}
      showBadge={true}
      showProgressBar={false}
      size={size}
      className={className}
    />
  )
}
