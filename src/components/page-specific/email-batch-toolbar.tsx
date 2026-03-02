"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { SkipForward, Clock, X } from "lucide-react"

interface EmailBatchToolbarProps {
  selectedCount: number
  onSkipSelected: () => void
  onMarkPending: () => void
  onClearSelection: () => void
  isProcessing: boolean
}

export function EmailBatchToolbar({
  selectedCount,
  onSkipSelected,
  onMarkPending,
  onClearSelection,
  isProcessing,
}: EmailBatchToolbarProps) {
  const [confirmOpen, setConfirmOpen] = React.useState(false)

  const handleSkip = () => {
    if (selectedCount > 5) {
      setConfirmOpen(true)
    } else {
      onSkipSelected()
    }
  }

  return (
    <>
      {/* Desktop: inline bar */}
      <div className="hidden md:flex items-center gap-3 bg-card border rounded-lg px-4 py-3">
        <span className="text-sm font-medium">
          {selectedCount} selected
        </span>

        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSkip}
            disabled={isProcessing}
          >
            <SkipForward className="h-4 w-4 mr-1" />
            Skip Selected
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onMarkPending}
            disabled={isProcessing}
          >
            <Clock className="h-4 w-4 mr-1" />
            Mark Pending
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </div>
      </div>

      {/* Mobile: fixed bottom bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] z-50">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium shrink-0">
            {selectedCount} selected
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSkip}
              disabled={isProcessing}
            >
              <SkipForward className="h-4 w-4 mr-1" />
              Skip
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Confirmation dialog for large batch skips */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Skip {selectedCount} emails?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark {selectedCount} email transactions as skipped.
              They won&apos;t be imported as transactions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false)
                onSkipSelected()
              }}
            >
              Skip All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
