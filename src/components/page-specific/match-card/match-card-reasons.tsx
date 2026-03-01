"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Parse a reason string to determine its icon type
 */
function getReasonIcon(reason: string): "good" | "partial" | "bad" {
  const scoreMatch = reason.match(/\((\d+)\/(\d+)\)/)
  if (scoreMatch) {
    const score = parseInt(scoreMatch[1])
    const max = parseInt(scoreMatch[2])
    const ratio = max > 0 ? score / max : 0
    if (ratio >= 0.9) return "good"
    if (ratio >= 0.5) return "partial"
    return "bad"
  }
  if (/exact|match|same/i.test(reason)) return "good"
  if (/low|no match|missing/i.test(reason)) return "bad"
  return "partial"
}

const REASON_ICONS = {
  good: { symbol: "\u2713", color: "text-green-600" },
  partial: { symbol: "~", color: "text-amber-600" },
  bad: { symbol: "\u2717", color: "text-red-500" },
}

interface MatchCardReasonsProps {
  reasons: string[]
  isNew: boolean
}

/**
 * Match reasons list with scored icons
 */
export function MatchCardReasons({ reasons, isNew }: MatchCardReasonsProps) {
  if (reasons.length === 0 || isNew) return null

  return (
    <div className="border-t pt-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
        Match Reasons
      </p>
      <ul className="text-xs space-y-0.5">
        {reasons.map((reason, index) => {
          const iconType = getReasonIcon(reason)
          const icon = REASON_ICONS[iconType]
          return (
            <li key={index} className="flex items-start gap-1.5">
              <span className={cn("font-bold shrink-0", icon.color)}>
                {icon.symbol}
              </span>
              <span className="text-muted-foreground">{reason}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
