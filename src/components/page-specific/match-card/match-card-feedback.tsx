"use client"

import * as React from "react"
import { RotateCcw, Hourglass, Trash2, Undo2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

const REJECT_REASONS = [
  { key: "wrong_amount", label: "Wrong amount" },
  { key: "needs_statement", label: "Needs statement pairing" },
  { key: "wrong_vendor", label: "Wrong vendor" },
  { key: "wrong_classification", label: "Wrong classification" },
  { key: "parser_error", label: "Parser error" },
  { key: "duplicate", label: "Duplicate" },
  { key: "not_transaction", label: "Not a transaction" },
] as const

export type NextStatus = "pending_review" | "waiting_for_statement" | "skipped"

const NEXT_STATUS_OPTIONS: Array<{
  value: NextStatus
  label: string
  icon: React.ReactNode
}> = [
  {
    value: "pending_review",
    label: "Re-queue",
    icon: <RotateCcw className="h-3.5 w-3.5" />,
  },
  {
    value: "waiting_for_statement",
    label: "Wait for statement",
    icon: <Hourglass className="h-3.5 w-3.5" />,
  },
  {
    value: "skipped",
    label: "Dismiss",
    icon: <Trash2 className="h-3.5 w-3.5" />,
  },
]

interface MatchCardFeedbackProps {
  compositeId: string
  /** Seconds remaining before auto-revert */
  secondsLeft: number
  onSubmitFeedback: (reason: string, nextStatus: NextStatus) => void
  onUndo: () => void
}

export function MatchCardFeedback({
  compositeId,
  secondsLeft,
  onSubmitFeedback,
  onUndo,
}: MatchCardFeedbackProps) {
  const [selectedChip, setSelectedChip] = React.useState<string | null>(null)
  const [notes, setNotes] = React.useState("")
  const [nextStatus, setNextStatus] = React.useState<NextStatus>("pending_review")
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  // Auto-focus the textarea after the flip completes
  React.useEffect(() => {
    const timer = setTimeout(() => textareaRef.current?.focus(), 350)
    return () => clearTimeout(timer)
  }, [])

  // Auto-select next status based on chip
  React.useEffect(() => {
    if (selectedChip === "Needs statement pairing") {
      setNextStatus("waiting_for_statement")
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
    onSubmitFeedback(parts.join(" — "), nextStatus)
  }

  const canSubmit = selectedChip || notes.trim()

  return (
    <div className="p-4 space-y-3">
      {/* Header with undo + timer */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Proposal rejected</p>
          <p className="text-xs text-muted-foreground">What went wrong?</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onUndo}
          className="text-xs gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <Undo2 className="h-3.5 w-3.5" />
          Undo
          <span className="tabular-nums text-muted-foreground/70">
            {secondsLeft}s
          </span>
        </Button>
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
        ref={textareaRef}
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
        <div className="grid grid-cols-3 gap-1.5">
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

      {/* Submit */}
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="h-8 px-4 text-xs"
        >
          Submit Feedback
        </Button>
      </div>
    </div>
  )
}
