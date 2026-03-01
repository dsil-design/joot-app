"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import type {
  MatchCardProps,
  MatchCardVariant,
  MatchCardCallbacks,
  VariantConfig,
} from "./types"
import { MatchCardHeader } from "./match-card-header"
import { MatchCardPanels } from "./match-card-panels"
import { MatchCardReasons } from "./match-card-reasons"
import { MatchCardActions } from "./match-card-actions"

/**
 * Derive variant from data when not explicitly provided
 */
export function getVariant(data: { isNew: boolean; confidence: number; source?: string }): MatchCardVariant {
  if (data.source === "merged") return "merged-match"
  if (data.isNew) return "new-transaction"
  if (data.confidence >= 90) return "high-confidence"
  if (data.confidence >= 55) return "review-needed"
  return "low-confidence"
}

const VARIANT_CONFIG: Record<MatchCardVariant, VariantConfig> = {
  "high-confidence": {
    borderColor: "border-green-400",
    bgColor: "bg-green-50",
    label: "High Confidence Match",
    labelColor: "text-green-700",
    dotColor: "bg-green-500",
  },
  "review-needed": {
    borderColor: "border-amber-400",
    bgColor: "bg-amber-50",
    label: "Possible Match",
    labelColor: "text-amber-700",
    dotColor: "bg-amber-500",
  },
  "low-confidence": {
    borderColor: "border-orange-400",
    bgColor: "bg-orange-50",
    label: "Low Confidence",
    labelColor: "text-orange-700",
    dotColor: "bg-orange-500",
  },
  "new-transaction": {
    borderColor: "border-purple-400",
    bgColor: "bg-purple-50",
    label: "New Transaction",
    labelColor: "text-purple-700",
    dotColor: "bg-purple-500",
  },
  "merged-match": {
    borderColor: "border-blue-400",
    bgColor: "bg-blue-50",
    label: "Cross-Source Match",
    labelColor: "text-blue-700",
    dotColor: "bg-blue-500",
  },
}

/**
 * MatchCard Component
 *
 * Two-panel comparison layout with confidence-tiered styling
 * and variant-specific action buttons.
 */
export function MatchCard({
  data,
  variant: providedVariant,
  selected = false,
  loading = false,
  onApprove,
  onReject,
  onLinkManually,
  onImport,
  onCreateAsNew,
  onSelectionChange,
  className,
}: MatchCardProps) {
  const variant = providedVariant || getVariant(data)
  const config = VARIANT_CONFIG[variant]

  const isApproved = data.status === "approved" || data.status === "imported"
  const isRejected = data.status === "rejected"

  const callbacks: MatchCardCallbacks = {
    onApprove,
    onReject,
    onLinkManually,
    onImport,
    onCreateAsNew,
    onSelectionChange,
  }

  return (
    <Card
      className={cn(
        "transition-all duration-200 border-2 overflow-hidden",
        config.borderColor,
        selected && "ring-2 ring-primary ring-offset-2",
        isApproved && "opacity-60 border-green-200 bg-green-50/50",
        isRejected && "opacity-60 border-gray-200 bg-gray-50/50",
        className
      )}
    >
      <CardHeader className="pb-2">
        <MatchCardHeader
          data={data}
          variant={variant}
          config={config}
          selected={selected}
          callbacks={callbacks}
        />
      </CardHeader>

      <CardContent className="py-2 space-y-3">
        <MatchCardPanels data={data} />
        <MatchCardReasons reasons={data.reasons} isNew={data.isNew} />
      </CardContent>

      <CardFooter className="pt-2 gap-2 flex-wrap">
        <MatchCardActions
          id={data.id}
          variant={variant}
          status={data.status}
          loading={loading}
          callbacks={callbacks}
        />
      </CardFooter>
    </Card>
  )
}
