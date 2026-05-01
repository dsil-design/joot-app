"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Eye, FileText, Loader2, Mail, Receipt, Search } from "lucide-react"
import { cn, formatCurrency } from "@/lib/utils"
import { format, parseISO } from "date-fns"
import { EmailViewerModal } from "./email-viewer-modal"
import { PaymentSlipViewerModal } from "./payment-slip-viewer-modal"
import { StatementViewerModal } from "./statement-viewer-modal"

export type AttachSourceType = "email" | "payment_slip" | "statement"

export interface SourceSearchResult {
  compositeId: string
  type: AttachSourceType
  sourceId: string
  suggestionIndex?: number
  title: string
  subtitle?: string
  amount: number | null
  currency: string | null
  date: string | null
  isMatched: boolean
  matchedTransactionId: string | null
}

export interface AttachSourceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * Called once the user picks a source. Implementer is responsible for the
   * actual attach API call (different endpoint for proposals vs transactions).
   */
  onAttach: (result: SourceSearchResult) => Promise<void>
  /**
   * Optional list of source types to disable (e.g. transaction already has an
   * email source attached).
   */
  disabledTypes?: AttachSourceType[]
}

const TYPE_META: Record<
  AttachSourceType,
  { label: string; icon: React.ComponentType<{ className?: string }>; description: string }
> = {
  email: {
    label: "Email",
    icon: Mail,
    description: "Receipt or order confirmation from your inbox",
  },
  payment_slip: {
    label: "Payment slip",
    icon: Receipt,
    description: "Bank transfer slip image",
  },
  statement: {
    label: "Statement row",
    icon: FileText,
    description: "Line item from a bank or card statement",
  },
}

function formatDate(d: string | null) {
  if (!d) return ""
  try {
    return format(parseISO(d), "MMM d, yyyy")
  } catch {
    return d
  }
}

export function AttachSourceDialog({
  open,
  onOpenChange,
  onAttach,
  disabledTypes = [],
}: AttachSourceDialogProps) {
  const [step, setStep] = React.useState<"type" | "lookup">("type")
  const [type, setType] = React.useState<AttachSourceType | null>(null)
  const [query, setQuery] = React.useState("")
  const [includeMatched, setIncludeMatched] = React.useState(false)
  const [results, setResults] = React.useState<SourceSearchResult[]>([])
  const [loading, setLoading] = React.useState(false)
  const [attachingId, setAttachingId] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [previewTarget, setPreviewTarget] = React.useState<SourceSearchResult | null>(null)

  // Reset state when dialog closes
  React.useEffect(() => {
    if (!open) {
      setStep("type")
      setType(null)
      setQuery("")
      setIncludeMatched(false)
      setResults([])
      setError(null)
      setAttachingId(null)
    }
  }, [open])

  // Debounced search
  React.useEffect(() => {
    if (step !== "lookup" || !type) return
    let cancelled = false
    const handle = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const url = new URL("/api/sources/search", window.location.origin)
        url.searchParams.set("type", type)
        if (query.trim()) url.searchParams.set("q", query.trim())
        if (includeMatched) url.searchParams.set("includeMatched", "true")
        const res = await fetch(url.toString())
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Search failed")
        if (!cancelled) setResults(data.results || [])
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Search failed")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 200)
    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [step, type, query, includeMatched])

  const handlePickType = (t: AttachSourceType) => {
    setType(t)
    setStep("lookup")
  }

  const handleAttach = async (result: SourceSearchResult) => {
    setAttachingId(result.compositeId)
    setError(null)
    try {
      await onAttach(result)
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to attach source")
    } finally {
      setAttachingId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {step === "lookup" && (
              <Button
                variant="ghost"
                size="icon"
                className="size-7 -ml-2"
                onClick={() => {
                  setStep("type")
                  setResults([])
                }}
                aria-label="Back"
              >
                <ArrowLeft className="size-4" />
              </Button>
            )}
            <DialogTitle>
              {step === "type" ? "Attach a source" : `Find ${type ? TYPE_META[type].label.toLowerCase() : ""}`}
            </DialogTitle>
          </div>
          <DialogDescription>
            {step === "type"
              ? "Pick the type of source to add. You'll be able to search and select one in the next step."
              : "Search by description, sender, filename, or memo."}
          </DialogDescription>
        </DialogHeader>

        {step === "type" && (
          <div className="flex flex-col gap-2 py-2">
            {(["email", "payment_slip", "statement"] as AttachSourceType[]).map((t) => {
              const meta = TYPE_META[t]
              const Icon = meta.icon
              const disabled = disabledTypes.includes(t)
              return (
                <button
                  key={t}
                  type="button"
                  disabled={disabled}
                  onClick={() => handlePickType(t)}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border border-border p-3 text-left transition-colors",
                    disabled
                      ? "cursor-not-allowed opacity-50"
                      : "hover:border-input hover:bg-muted"
                  )}
                >
                  <div className="rounded-md bg-muted p-2">
                    <Icon className="size-4 text-foreground" />
                  </div>
                  <div className="flex flex-col">
                    <div className="text-sm font-medium text-foreground">{meta.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {disabled ? "Already attached — unlink first to replace" : meta.description}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {step === "lookup" && (
          <div className="flex flex-col gap-3 min-h-0 flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                className="pl-9"
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Checkbox
                checked={includeMatched}
                onCheckedChange={(v) => setIncludeMatched(v === true)}
              />
              Include sources already linked to a transaction
            </label>

            <div className="flex-1 overflow-y-auto -mx-1 px-1">
              {loading && (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                </div>
              )}
              {!loading && results.length === 0 && (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  {error || "No sources found"}
                </div>
              )}
              {!loading && results.length > 0 && (
                <ul className="flex flex-col gap-2">
                  {results.map((r) => {
                    const isAttaching = attachingId === r.compositeId
                    return (
                      <li
                        key={r.compositeId}
                        className={cn(
                          "rounded-lg border border-border p-3 transition-colors hover:border-input hover:bg-muted",
                          (isAttaching || !!attachingId) && "opacity-60"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <button
                            type="button"
                            disabled={isAttaching || !!attachingId}
                            onClick={() => handleAttach(r)}
                            className="min-w-0 flex-1 text-left"
                          >
                            <div className="text-sm font-medium text-foreground truncate">
                              {r.title}
                            </div>
                            {r.subtitle && (
                              <div className="text-xs text-muted-foreground truncate">{r.subtitle}</div>
                            )}
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              {r.amount != null && r.currency && (
                                <span>{formatCurrency(r.amount, r.currency)} {r.currency}</span>
                              )}
                              {r.date && <span>· {formatDate(r.date)}</span>}
                            </div>
                          </button>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-7 text-muted-foreground hover:text-foreground"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setPreviewTarget(r)
                                }}
                                aria-label="Preview source"
                              >
                                <Eye className="size-3.5" />
                              </Button>
                            </div>
                            {r.isMatched ? (
                              <Badge className="bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border-0 text-[11px]">
                                Already linked
                              </Badge>
                            ) : (
                              <Badge className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-0 text-[11px]">
                                Unmatched
                              </Badge>
                            )}
                            {isAttaching && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            {error && results.length > 0 && (
              <div className="text-xs text-red-600 dark:text-red-400">{error}</div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>

        {previewTarget?.type === "email" && (
          <EmailViewerModal
            open
            onOpenChange={(o) => {
              if (!o) setPreviewTarget(null)
            }}
            emailId={previewTarget.sourceId}
            subject={previewTarget.title}
            fromName={previewTarget.subtitle ?? null}
            fromAddress={null}
            emailDate={previewTarget.date}
          />
        )}
        {previewTarget?.type === "payment_slip" && (
          <PaymentSlipViewerModal
            open
            onOpenChange={(o) => {
              if (!o) setPreviewTarget(null)
            }}
            slipId={previewTarget.sourceId}
            filename={previewTarget.subtitle ?? previewTarget.title}
          />
        )}
        {previewTarget?.type === "statement" && (
          <StatementViewerModal
            open
            onOpenChange={(o) => {
              if (!o) setPreviewTarget(null)
            }}
            statementId={previewTarget.sourceId}
            filename={previewTarget.subtitle ?? previewTarget.title}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
