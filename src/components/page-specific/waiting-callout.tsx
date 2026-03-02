"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Clock, X, ArrowRight } from "lucide-react"
import type { EmailHubStats } from "@/hooks/use-email-hub-stats"

interface WaitingCalloutProps {
  stats: EmailHubStats | null
  onViewWaiting: () => void
}

const DISMISS_KEY = "email-hub-waiting-callout-dismissed"

export function WaitingCallout({ stats, onViewWaiting }: WaitingCalloutProps) {
  const [dismissed, setDismissed] = React.useState(false)

  // Check session storage on mount
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === "true")
    }
  }, [])

  const waitingCount = stats?.waiting_summary?.count || 0
  const totalAmount = stats?.waiting_summary?.total_amount || 0
  const currency = stats?.waiting_summary?.primary_currency

  if (waitingCount === 0 || dismissed) return null

  const handleDismiss = () => {
    setDismissed(true)
    if (typeof window !== "undefined") {
      sessionStorage.setItem(DISMISS_KEY, "true")
    }
  }

  const formattedAmount = currency
    ? `${currency === "THB" ? "฿" : "$"}${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : null

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center gap-3">
      <Clock className="h-5 w-5 text-blue-600 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-blue-900">
          {waitingCount} email{waitingCount !== 1 ? "s" : ""} waiting for statement
        </p>
        {formattedAmount && (
          <p className="text-xs text-blue-700">
            ~{formattedAmount} in {currency} transactions
          </p>
        )}
      </div>
      <Button
        variant="outline"
        size="sm"
        className="shrink-0 border-blue-300 text-blue-700 hover:bg-blue-100"
        onClick={onViewWaiting}
      >
        View Waiting
        <ArrowRight className="h-3.5 w-3.5 ml-1" />
      </Button>
      <button
        onClick={handleDismiss}
        className="text-blue-400 hover:text-blue-600 shrink-0"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
