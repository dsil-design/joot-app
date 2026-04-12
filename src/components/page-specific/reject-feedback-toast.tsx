"use client"

import * as React from "react"
import { Ban, RotateCcw, Hourglass, Trash2, Mail, Receipt } from "lucide-react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { DateInput } from "@/components/ui/date-picker"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

const REJECT_REASONS = [
  { key: "wrong_amount", label: "Wrong amount" },
  { key: "needs_statement", label: "Needs statement pairing" },
  { key: "needs_email_receipt", label: "Needs email receipt" },
  { key: "needs_payment_slip", label: "Needs payment slip" },
  { key: "wrong_date", label: "Wrong date" },
  { key: "wrong_vendor", label: "Wrong vendor" },
  { key: "wrong_classification", label: "Wrong classification" },
  { key: "parser_error", label: "Parser error" },
  { key: "duplicate", label: "Duplicate" },
  { key: "not_transaction", label: "Not a transaction" },
] as const

type RejectReasonKey = typeof REJECT_REASONS[number]["key"]

/**
 * Reason keys relevant per source context when rejecting a single source
 * within a merged match. Keeps the same underlying component while trimming
 * the list to what makes sense for that source.
 */
const SOURCE_REASON_KEYS: Record<'email' | 'statement' | 'slip', RejectReasonKey[]> = {
  email: ["wrong_amount", "wrong_date", "needs_statement", "needs_payment_slip", "wrong_vendor", "parser_error", "duplicate", "not_transaction"],
  statement: ["wrong_amount", "wrong_date", "needs_email_receipt", "needs_payment_slip", "wrong_vendor", "wrong_classification", "parser_error", "duplicate"],
  slip: ["wrong_amount", "wrong_date", "needs_statement", "needs_email_receipt", "wrong_vendor", "parser_error", "duplicate"],
}

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
  /**
   * When set, scopes the toast to a single source within a merged item.
   * Tailors the reason chip list + header copy accordingly. The overall
   * layout/component is the same.
   */
  sourceContext?: 'email' | 'statement' | 'slip'
  /** Callback to submit feedback with next status */
  onSubmitFeedback: (ids: string[], reason: string, nextStatus: NextStatus, correctedDate?: string) => void
  /** Undo callback */
  onUndo?: () => void
  /** Dismiss callback */
  onDismiss: () => void
}

export function RejectFeedbackToast({
  compositeIds,
  count,
  sourceContext,
  onSubmitFeedback,
  onUndo,
  onDismiss,
}: RejectFeedbackToastProps) {
  const reasons = React.useMemo(() => {
    if (!sourceContext) return REJECT_REASONS
    const allowed = new Set<RejectReasonKey>(SOURCE_REASON_KEYS[sourceContext])
    return REJECT_REASONS.filter((r) => allowed.has(r.key))
  }, [sourceContext])
  const [selectedChip, setSelectedChip] = React.useState<string | null>(null)
  const [notes, setNotes] = React.useState("")
  const [nextStatus, setNextStatus] = React.useState<NextStatus>("skipped")
  const [submitted, setSubmitted] = React.useState(false)
  const [correctedDate, setCorrectedDate] = React.useState<Date | undefined>(undefined)

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
    } else if (selectedChip === "Wrong date") {
      setNextStatus("pending_review")
    }
  }, [selectedChip])

  const handleChipClick = (label: string) => {
    const newChip = selectedChip === label ? null : label
    setSelectedChip(newChip)
    if (newChip !== "Wrong date") setCorrectedDate(undefined)
  }

  const handleSubmit = () => {
    const parts: string[] = []
    if (selectedChip) parts.push(selectedChip)
    if (notes.trim()) parts.push(notes.trim())
    if (parts.length === 0) return

    setSubmitted(true)
    const dateStr = correctedDate ? format(correctedDate, "yyyy-MM-dd") : undefined
    onSubmitFeedback(compositeIds, parts.join(" — "), nextStatus, dateStr)
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
            {sourceContext
              ? `${sourceContext === 'email' ? 'Email' : sourceContext === 'statement' ? 'Statement' : 'Payment slip'} removed from match`
              : count === 1 ? "Proposal rejected" : `${count} proposal(s) rejected`}
          </p>
          <p className="text-xs text-muted-foreground">What went wrong?</p>
        </div>
        <button
          onClick={onDismiss}
          className="text-muted-foreground hover:text-foreground transition-colors p-0.5 -mt-0.5 shrink-0"
        >
          <Ban className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Reason chips */}
      <div className="flex flex-wrap gap-1.5">
        {reasons.map(({ key, label }) => (
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

      {/* Optional date correction (shown when "Wrong date" is selected) */}
      {selectedChip === "Wrong date" && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Correct date (optional):</p>
          <DateInput
            date={correctedDate}
            onDateChange={setCorrectedDate}
            placeholder="e.g. 2025-04-10"
            formatStr="yyyy-MM-dd"
            className="h-8 text-xs"
          />
        </div>
      )}

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
