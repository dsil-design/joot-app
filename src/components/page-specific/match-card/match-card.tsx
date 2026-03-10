"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { CheckCircle2 } from "lucide-react"
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
import { MatchCardFeedback, type NextStatus } from "./match-card-feedback"

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

const UNDO_DURATION_SECONDS = 20

/**
 * MatchCard Component
 *
 * Two-panel comparison layout with confidence-tiered styling
 * and variant-specific action buttons.
 *
 * When rejected, the card flips to show an inline feedback form.
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
  onQuickCreate,
  onRefreshProposal,
  onSelectionChange,
  onRejectFeedback,
  onRejectUndo,
  onRejectTimeout,
  className,
}: MatchCardProps) {
  const variant = providedVariant || getVariant(data)
  const config = VARIANT_CONFIG[variant]

  const isApproved = data.status === "approved" || data.status === "imported"
  const isRejected = data.status === "rejected"

  // Inline rejection feedback state
  const [showFeedback, setShowFeedback] = React.useState(false)
  const [feedbackSubmitted, setFeedbackSubmitted] = React.useState(false)
  const [secondsLeft, setSecondsLeft] = React.useState(UNDO_DURATION_SECONDS)
  const timerRef = React.useRef<NodeJS.Timeout | null>(null)
  const countdownRef = React.useRef<NodeJS.Timeout | null>(null)

  // When the card enters "rejected" status, flip to feedback
  React.useEffect(() => {
    if (isRejected && !showFeedback && !feedbackSubmitted) {
      setShowFeedback(true)
      setSecondsLeft(UNDO_DURATION_SECONDS)

      // Start countdown
      countdownRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(countdownRef.current!)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      // Auto-revert on timeout (no feedback given → stays in pipeline)
      timerRef.current = setTimeout(() => {
        setShowFeedback(false)
        onRejectTimeout?.(data.id)
      }, UNDO_DURATION_SECONDS * 1000)
    }

    return () => {
      if (!isRejected) {
        // Card was undone or status changed — clean up
        clearTimeout(timerRef.current!)
        clearInterval(countdownRef.current!)
        setShowFeedback(false)
        setFeedbackSubmitted(false)
      }
    }
  }, [isRejected]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleUndo = () => {
    clearTimeout(timerRef.current!)
    clearInterval(countdownRef.current!)
    setShowFeedback(false)
    setFeedbackSubmitted(false)
    onRejectUndo?.(data.id)
  }

  const handleFeedbackSubmit = (reason: string, nextStatus: NextStatus) => {
    clearTimeout(timerRef.current!)
    clearInterval(countdownRef.current!)
    setShowFeedback(false)
    setFeedbackSubmitted(true)
    onRejectFeedback?.(data.id, reason, nextStatus)
  }

  const callbacks: MatchCardCallbacks = {
    onApprove,
    onReject,
    onLinkManually,
    onImport,
    onCreateAsNew,
    onQuickCreate,
    onRefreshProposal,
    onSelectionChange,
  }

  // ── Submitted confirmation (shrinks then fades) ──
  if (feedbackSubmitted) {
    return (
      <Card
        className={cn(
          "transition-all duration-500 border-2 overflow-hidden border-gray-200 bg-gray-50/50",
          "animate-in fade-in-0 slide-in-from-top-2",
          className
        )}
      >
        <div className="flex items-center gap-2 px-4 py-3">
          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
          <p className="text-sm text-muted-foreground">
            Feedback submitted
          </p>
        </div>
      </Card>
    )
  }

  // ── Flipped state: show feedback form ──
  if (showFeedback && isRejected) {
    return (
      <Card
        className={cn(
          "transition-all duration-300 border-2 overflow-hidden",
          "border-gray-300 bg-card",
          "animate-in fade-in-0",
          className
        )}
        style={{
          animation: "card-flip-in 0.4s ease-out",
        }}
      >
        <MatchCardFeedback
          compositeId={data.id}
          secondsLeft={secondsLeft}
          onSubmitFeedback={handleFeedbackSubmit}
          onUndo={handleUndo}
        />
      </Card>
    )
  }

  // ── Normal state: front of card ──
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
        {data.isNew && data.proposal && (
          <ProposalConfidenceBar score={data.proposal.overallConfidence} />
        )}
        <MatchCardReasons reasons={data.reasons} isNew={data.isNew} />
      </CardContent>

      <CardFooter className="pt-2 gap-2 flex-wrap">
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
