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
import { MatchCardPanels, ProposalConfidenceBar } from "./match-card-panels"
import { MatchCardReasons } from "./match-card-reasons"
import { MatchCardActions } from "./match-card-actions"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus } from "lucide-react"

/**
 * Derive variant from data when not explicitly provided
 */
export function getVariant(data: { isNew: boolean; confidence: number; source?: string }): MatchCardVariant {
  if (data.isNew) return "new-transaction"
  if (data.source === "merged") return "merged-match"
  if (data.confidence >= 90) return "high-confidence"
  if (data.confidence >= 55) return "review-needed"
  return "low-confidence"
}

const VARIANT_CONFIG: Record<MatchCardVariant, VariantConfig> = {
  "high-confidence": {
    borderColor: "border-green-400 dark:border-green-500/60",
    bgColor: "bg-green-50 dark:bg-green-950/20",
    label: "High Confidence Match",
    labelColor: "text-green-700 dark:text-green-300",
    dotColor: "bg-green-500",
  },
  "review-needed": {
    borderColor: "border-amber-400 dark:border-amber-500/60",
    bgColor: "bg-amber-50 dark:bg-amber-950/20",
    label: "Possible Match",
    labelColor: "text-amber-700 dark:text-amber-300",
    dotColor: "bg-amber-500 dark:bg-amber-400 dark:bg-amber-500",
  },
  "low-confidence": {
    borderColor: "border-orange-400 dark:border-orange-500/60",
    bgColor: "bg-orange-50 dark:bg-orange-950/20",
    label: "Low Confidence",
    labelColor: "text-orange-700 dark:text-orange-300",
    dotColor: "bg-orange-500",
  },
  "new-transaction": {
    borderColor: "border-purple-400 dark:border-purple-500/60",
    bgColor: "bg-purple-50 dark:bg-purple-950/20",
    label: "New Transaction",
    labelColor: "text-purple-700 dark:text-purple-300",
    dotColor: "bg-purple-500",
  },
  "merged-match": {
    borderColor: "border-blue-400 dark:border-blue-500/60",
    bgColor: "bg-blue-50 dark:bg-blue-950/20",
    label: "Cross-Source Match",
    labelColor: "text-blue-700 dark:text-blue-300",
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
  onRejectSource,
  onLinkManually,
  onImport,
  onCreateAsNew,
  onQuickCreate,
  onRefreshProposal,
  onSelectionChange,
  onAttachSource,
  className,
}: MatchCardProps) {
  const variant = providedVariant || getVariant(data)
  const config = VARIANT_CONFIG[variant]

  const isApproved = data.status === "approved" || data.status === "imported"
  const isRejected = data.status === "rejected"

  const callbacks: MatchCardCallbacks = {
    onApprove,
    onReject,
    onRejectSource,
    onLinkManually,
    onImport,
    onCreateAsNew,
    onQuickCreate,
    onRefreshProposal,
    onSelectionChange,
  }

  return (
    <Card
      className={cn(
        "transition-all duration-200 border-2 overflow-hidden",
        config.borderColor,
        selected && "ring-2 ring-primary ring-offset-2",
        (isApproved || isRejected) && "hidden",
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
        <MatchCardPanels data={data} onRejectSource={onRejectSource} />
        {data.isNew && data.proposal && (
          <ProposalConfidenceBar score={data.proposal.overallConfidence} />
        )}
        <MatchCardReasons reasons={data.reasons} isNew={data.isNew} />
        {onAttachSource && data.isNew && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onAttachSource(data.id)}
              className="h-7 gap-1.5 text-xs text-muted-foreground"
            >
              <Plus className="size-3" />
              Attach a source
            </Button>
            {(data.extraEmailIds?.length ?? 0) > 0 && (
              <Badge className="bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200 border-0 text-[11px]">
                +{data.extraEmailIds!.length} email{data.extraEmailIds!.length === 1 ? '' : 's'}
              </Badge>
            )}
            {(data.extraSlipIds?.length ?? 0) > 0 && (
              <Badge className="bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200 border-0 text-[11px]">
                +{data.extraSlipIds!.length} slip{data.extraSlipIds!.length === 1 ? '' : 's'}
              </Badge>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-2 gap-2 flex-wrap [&>button]:min-h-[44px] [&>button]:sm:min-h-0">
        <MatchCardActions
          id={data.id}
          variant={variant}
          status={data.status}
          loading={loading}
          callbacks={callbacks}
          hasMatchedTransaction={!!data.matchedTransaction && !data.isNew}
          proposal={data.proposal}
          proposalModified={data.proposalModified}
        />
      </CardFooter>
    </Card>
  )
}
