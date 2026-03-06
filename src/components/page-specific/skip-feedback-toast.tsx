"use client"

import * as React from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const SKIP_REASONS = [
  { key: "duplicate", label: "Duplicate email" },
  { key: "not_transaction", label: "Not a transaction" },
  { key: "already_recorded", label: "Already recorded" },
] as const

interface SkipFeedbackToastProps {
  /** The email_transactions IDs to submit feedback for */
  emailTransactionIds: string[]
  /** Number of emails skipped (for display) */
  count: number
  onSubmitFeedback: (ids: string[], reason: string) => void
  onUndo?: () => void
  onDismiss: () => void
}

export function SkipFeedbackToast({
  emailTransactionIds,
  count,
  onSubmitFeedback,
  onUndo,
  onDismiss,
}: SkipFeedbackToastProps) {
  const [showOther, setShowOther] = React.useState(false)
  const [otherText, setOtherText] = React.useState("")
  const [submitted, setSubmitted] = React.useState(false)

  const handleReason = (reason: string) => {
    setSubmitted(true)
    onSubmitFeedback(emailTransactionIds, reason)
    // Auto-dismiss after a short delay to show confirmation
    setTimeout(onDismiss, 1500)
  }

  const handleOtherSubmit = () => {
    if (otherText.trim()) {
      handleReason(otherText.trim())
    }
  }

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
            {count === 1 ? "Email skipped" : `${count} email(s) skipped`}
          </p>
          <p className="text-xs text-muted-foreground">Why did you skip?</p>
        </div>
        <button
          onClick={onDismiss}
          className="text-muted-foreground hover:text-foreground transition-colors p-0.5 -mt-0.5 shrink-0"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Reason pills */}
      <div className="flex flex-wrap gap-1.5">
        {SKIP_REASONS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleReason(label)}
            className={cn(
              "text-xs px-2.5 py-1 rounded-full border transition-colors",
              "bg-muted/50 hover:bg-muted text-foreground",
              "hover:border-primary/30"
            )}
          >
            {label}
          </button>
        ))}
        {!showOther && (
          <button
            onClick={() => setShowOther(true)}
            className={cn(
              "text-xs px-2.5 py-1 rounded-full border transition-colors",
              "bg-muted/50 hover:bg-muted text-muted-foreground",
              "hover:border-primary/30"
            )}
          >
            Other...
          </button>
        )}
      </div>

      {/* Freeform input */}
      {showOther && (
        <div className="flex items-center gap-1.5">
          <Input
            value={otherText}
            onChange={(e) => setOtherText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleOtherSubmit()
              if (e.key === "Escape") {
                setShowOther(false)
                setOtherText("")
              }
            }}
            placeholder="e.g. marketing email, OTP code..."
            className="h-7 text-xs flex-1"
            autoFocus
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleOtherSubmit}
            disabled={!otherText.trim()}
            className="h-7 px-2 text-xs"
          >
            Submit
          </Button>
        </div>
      )}

      {/* Undo */}
      {onUndo && (
        <div className="border-t pt-2">
          <button
            onClick={onUndo}
            className="text-xs text-primary hover:underline"
          >
            Undo skip
          </button>
        </div>
      )}
    </div>
  )
}
