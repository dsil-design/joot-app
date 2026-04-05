"use client"

import * as React from "react"
import { X, RotateCcw, Hourglass, Trash2, Mail, Receipt } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

const REJECT_REASONS = [
  { key: "wrong_amount", label: "Wrong amount" },
  { key: "needs_statement", label: "Needs statement pairing" },
  { key: "needs_email_receipt", label: "Needs email receipt" },
  { key: "needs_payment_slip", label: "Needs payment slip" },
  { key: "wrong_vendor", label: "Wrong vendor" },
  { key: "wrong_classification", label: "Wrong classification" },
  { key: "parser_error", label: "Parser error" },
  { key: "duplicate", label: "Duplicate" },
  { key: "not_transaction", label: "Not a transaction" },
] as const

type NextStatus = "pending_review" | "waiting_for_statement" | "waiting_for_email" | "waiting_for_slip" | "skipped"

const NEXT_STATUS_OPTIONS: Array<{
  value: NextStatus
  label: string
  description: string
  icon: React.ReactNode
}> = [
  {
    value: "pending_review",
    label: "Re-queue",
    description: "Try again with feedback",
    icon: <RotateCcw className="h-3.5 w-3.5" />,
  },
  {
    value: "waiting_for_statement",
    label: "Wait for statement",
    description: "Needs statement data",
    icon: <Hourglass className="h-3.5 w-3.5" />,
  },
  {
    value: "waiting_for_email",
    label: "Wait for email",
    description: "Needs email receipt",
    icon: <Mail className="h-3.5 w-3.5" />,
  },
  {
    value: "waiting_for_slip",
    label: "Wait for slip",
    description: "Needs payment slip",
    icon: <Receipt className="h-3.5 w-3.5" />,
  },
  {
    value: "skipped",
    label: "Dismiss",
    description: "Not a transaction",
    icon: <Trash2 className="h-3.5 w-3.5" />,
  },
]

interface RejectFeedbackToastProps {
  /** The composite IDs of rejected items */
  compositeIds: string[]
  /** Number of items rejected (for display) */
  count: number
  /** Callback to submit feedback with next status */
  onSubmitFeedback: (ids: string[], reason: string, nextStatus: NextStatus) => void
  /** Undo callback */
  onUndo?: () => void
  /** Dismiss callback */
  onDismiss: () => void
}

export function RejectFeedbackToast({
  compositeIds,
  count,
  onSubmitFeedback,
  onUndo,
  onDismiss,
}: RejectFeedbackToastProps) {
  const [selectedChip, setSelectedChip] = React.useState<string | null>(null)
  const [notes, setNotes] = React.useState("")
  const [nextStatus, setNextStatus] = React.useState<NextStatus>("skipped")
  const [submitted, setSubmitted] = React.useState(false)

  // Auto-select next status based on chip
  React.useEffect(() => {
    if (selectedChip === "Needs statement pairing") {
      setNextStatus("waiting_for_statement")
    } else if (selectedChip === "Needs email receipt") {
      setNextStatus("waiting_for_email")
    } else if (selectedChip === "Needs payment slip") {
      setNextStatus("waiting_for_slip")
    } else if (selectedChip === "Not a transaction") {
      setNextStatus("skipped")
    }
  }, [selectedChip])

  const handleChipClick = (label: string) => {
    setSelectedChip(selectedChip === label ? null : label)
  }

  const handleSubmit = () => {
    const parts: string[] = []
    if (selectedChip) parts.push(selectedChip)
    if (notes.trim()) parts.push(notes.trim())
    if (parts.length === 0) return

    setSubmitted(true)
    onSubmitFeedback(compositeIds, parts.join(" — "), nextStatus)
    setTimeout(onDismiss, 1500)
  }

  const canSubmit = selectedChip || notes.trim()

  if (submitted) {
    return (
      <div className="w-[380px] bg-card border rounded-lg shadow-lg p-3">
        <p className="text-sm text-muted-foreground">
          {nextStatus === "pending_review"
            ? "Feedback saved — regenerating proposal..."
            : nextStatus === "waiting_for_statement"
              ? "Moved to waiting for statement."
              : nextStatus === "waiting_for_email"
                ? "Moved to waiting for email receipt."
                : nextStatus === "waiting_for_slip"
                  ? "Moved to waiting for payment slip."
                  : "Dismissed."}
        </p>
      </div>
    )
  }

  return (
    <div className="w-[380px] bg-card border rounded-lg shadow-lg p-3 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">
            {count === 1 ? "Proposal rejected" : `${count} proposal(s) rejected`}
          </p>
          <p className="text-xs text-muted-foreground">What went wrong?</p>
        </div>
        <button
          onClick={onDismiss}
          className="text-muted-foreground hover:text-foreground transition-colors p-0.5 -mt-0.5 shrink-0"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Reason chips */}
      <div className="flex flex-wrap gap-1.5">
        {REJECT_REASONS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleChipClick(label)}
            className={cn(
              "text-xs px-2.5 py-1 rounded-full border transition-colors",
              selectedChip === label
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/50 hover:bg-muted text-foreground hover:border-primary/30"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Free-text feedback */}
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit()
        }}
        placeholder="Tell the system what to do differently..."
        className="text-xs min-h-[56px] resize-none"
        rows={2}
      />

      {/* What should happen next */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">Then:</p>
        <div className="flex flex-wrap gap-1.5">
          {NEXT_STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setNextStatus(option.value)}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-md border text-xs transition-colors",
                nextStatus === option.value
                  ? "bg-primary/10 border-primary text-primary"
                  : "bg-muted/30 hover:bg-muted/60 text-muted-foreground hover:text-foreground"
              )}
            >
              {option.icon}
              <span className="font-medium leading-tight">{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Submit + Undo row */}
      <div className="flex items-center justify-between">
        {onUndo ? (
          <button
            onClick={onUndo}
            className="text-xs text-primary hover:underline"
          >
            Undo
          </button>
        ) : (
          <span />
        )}
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="h-7 px-3 text-xs"
        >
          Submit Feedback
        </Button>
      </div>
    </div>
  )
}
