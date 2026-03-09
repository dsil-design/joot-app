"use client"

import * as React from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

const REJECT_REASONS = [
  { key: "wrong_match", label: "Wrong match" },
  { key: "duplicate", label: "Duplicate entry" },
  { key: "not_mine", label: "Not my transaction" },
  { key: "already_recorded", label: "Already recorded" },
  { key: "wrong_amount", label: "Wrong amount" },
] as const

interface RejectFeedbackToastProps {
  /** The composite IDs of rejected items */
  compositeIds: string[]
  /** Number of items rejected (for display) */
  count: number
  /** Callback to submit feedback */
  onSubmitFeedback: (ids: string[], reason: string) => void
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
  const [submitted, setSubmitted] = React.useState(false)

  const handleChipClick = (label: string) => {
    if (selectedChip === label) {
      setSelectedChip(null)
    } else {
      setSelectedChip(label)
    }
  }

  const handleSubmit = () => {
    const parts: string[] = []
    if (selectedChip) parts.push(selectedChip)
    if (notes.trim()) parts.push(notes.trim())
    if (parts.length === 0) return

    setSubmitted(true)
    onSubmitFeedback(compositeIds, parts.join(" — "))
    setTimeout(onDismiss, 1500)
  }

  const canSubmit = selectedChip || notes.trim()

  if (submitted) {
    return (
      <div className="w-[356px] bg-card border rounded-lg shadow-lg p-3">
        <p className="text-sm text-muted-foreground">Thanks for the feedback!</p>
      </div>
    )
  }

  return (
    <div className="w-[356px] bg-card border rounded-lg shadow-lg p-3 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">
            {count === 1 ? "Match rejected" : `${count} match(es) rejected`}
          </p>
          <p className="text-xs text-muted-foreground">Why did you reject?</p>
        </div>
        <button
          onClick={onDismiss}
          className="text-muted-foreground hover:text-foreground transition-colors p-0.5 -mt-0.5 shrink-0"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Reason chips — toggle selection */}
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

      {/* Always-visible free-text area */}
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit()
        }}
        placeholder="Add details... (optional if chip selected)"
        className="text-xs min-h-[56px] resize-none"
        rows={2}
      />

      {/* Submit + Undo row */}
      <div className="flex items-center justify-between">
        {onUndo ? (
          <button
            onClick={onUndo}
            className="text-xs text-primary hover:underline"
          >
            Undo rejection
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
          Submit
        </Button>
      </div>
    </div>
  )
}
