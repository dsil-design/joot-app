"use client"

import * as React from "react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Undo2, FileText, Loader2 } from "lucide-react"

interface SuggestionShape {
  transaction_date?: string
  description?: string
  amount?: number
  currency?: string
  status?: string
  foreign_transaction?: { originalAmount?: number; originalCurrency?: string }
}

interface RejectedPair {
  pairKey: string
  statementUploadId: string
  suggestionIndex: number
  statementFilename: string | null
  suggestion: SuggestionShape | null
}

interface RejectedPairsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  emailId: string
  /** Called after a successful restore so the parent can refresh the queue. */
  onRestored?: () => void
}

function formatAmount(amount: number | undefined, currency: string | undefined): string {
  if (amount === undefined || amount === null) return "—"
  const cur = currency || ""
  return `${cur} ${Number(amount).toFixed(2)}`.trim()
}

export function RejectedPairsDialog({
  open,
  onOpenChange,
  emailId,
  onRestored,
}: RejectedPairsDialogProps) {
  const [pairs, setPairs] = React.useState<RejectedPair[] | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [restoringKey, setRestoringKey] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    fetch(`/api/imports/unreject-pair?emailId=${encodeURIComponent(emailId)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text())
        return res.json() as Promise<{ pairs: RejectedPair[] }>
      })
      .then((data) => {
        if (!cancelled) setPairs(data.pairs)
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error("Failed to load rejected pairings", {
            description: err instanceof Error ? err.message : String(err),
          })
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, emailId])

  const handleRestore = async (pairKey: string) => {
    setRestoringKey(pairKey)
    try {
      const res = await fetch("/api/imports/unreject-pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailId, pairKey }),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `HTTP ${res.status}`)
      }
      setPairs((prev) => prev?.filter((p) => p.pairKey !== pairKey) ?? null)
      toast.success("Pairing restored", {
        description: "The cross-source pairer will reconsider this match on the next load.",
      })
      onRestored?.()
    } catch (err) {
      toast.error("Failed to restore pairing", {
        description: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setRestoringKey(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Rejected pairings</DialogTitle>
          <DialogDescription>
            Statement entries you previously rejected as a match for this email.
            Restore one to let the cross-source pairer reconsider it.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin mr-2" />
            Loading…
          </div>
        )}

        {!loading && pairs && pairs.length === 0 && (
          <div className="py-6 text-center text-sm text-muted-foreground">
            No rejected pairings remain.
          </div>
        )}

        {!loading && pairs && pairs.length > 0 && (
          <ul className="space-y-2 max-h-[60vh] overflow-y-auto">
            {pairs.map((p) => {
              const s = p.suggestion
              const foreign = s?.foreign_transaction
              return (
                <li
                  key={p.pairKey}
                  className="flex items-start gap-3 rounded-md border bg-card p-3"
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <FileText className="size-3.5 shrink-0" />
                      <span className="truncate">
                        {p.statementFilename ?? p.statementUploadId.slice(0, 8)}
                      </span>
                    </div>
                    <div className="font-medium text-sm truncate">
                      {s?.description ?? "(suggestion no longer available)"}
                    </div>
                    <div className="text-xs text-muted-foreground space-x-3">
                      <span>{s?.transaction_date ?? "—"}</span>
                      <span>{formatAmount(s?.amount, s?.currency)}</span>
                      {foreign?.originalAmount !== undefined && (
                        <span>
                          ({foreign.originalCurrency} {Number(foreign.originalAmount).toFixed(2)})
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={restoringKey === p.pairKey}
                    onClick={() => handleRestore(p.pairKey)}
                    className="shrink-0 gap-1.5"
                  >
                    {restoringKey === p.pairKey ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Undo2 className="size-3.5" />
                    )}
                    Restore
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}
