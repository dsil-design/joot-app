"use client"

import * as React from "react"
import { Check, Loader2, Minus, X, Circle } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"

export interface ProgressItem {
  id: string
  /** Primary label, e.g. cleaned description. */
  label: string
  /** Secondary text shown below the label, e.g. formatted date. */
  sublabel?: string
  /** Source badge, e.g. "Email", "Statement", "Slip", "Multi-source". */
  badge?: string
  /** Right-side amount text, e.g. "฿312". */
  amount?: string
}

type ItemStatus = "pending" | "active" | "ready" | "unchanged" | "failed"

export interface ProposalGenerationSummary {
  total: number
  ready: number
  unchanged: number
  failed: number
  cancelled: boolean
}

export interface ProposalGenerationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: ProgressItem[]
  /**
   * Process one item. The passed `signal` aborts when the user cancels or the
   * modal closes; honor it inside `fetch` to actually halt the request.
   * Resolve `'ready'` when a proposal was generated, `'unchanged'` when the
   * call succeeded but produced no change. Throw to mark the item failed.
   */
  processItem: (
    item: ProgressItem,
    signal: AbortSignal,
  ) => Promise<"ready" | "unchanged">
  /** Fired after the user dismisses the completion screen. */
  onComplete?: (summary: ProposalGenerationSummary) => void
  /** Concurrent in-flight requests. Defaults to 5 (matches server batch size). */
  parallelism?: number
}

const COLLAPSE_THRESHOLD = 10

export function ProposalGenerationModal({
  open,
  onOpenChange,
  items,
  processItem,
  onComplete,
  parallelism = 5,
}: ProposalGenerationModalProps) {
  const [statuses, setStatuses] = React.useState<Map<string, ItemStatus>>(
    () => new Map(),
  )
  const [phase, setPhase] = React.useState<"running" | "done">("running")
  const [cancelled, setCancelled] = React.useState(false)
  const abortRef = React.useRef<AbortController | null>(null)
  const processItemRef = React.useRef(processItem)

  React.useEffect(() => {
    processItemRef.current = processItem
  }, [processItem])

  // Snapshot items on the open→true transition so the worker pool runs against
  // a stable list even if the parent re-renders with new items.
  const [snapshot, setSnapshot] = React.useState<ProgressItem[]>([])

  React.useEffect(() => {
    if (!open) return
    setSnapshot(items)
    setCancelled(false)
    setPhase("running")
    const initial = new Map<string, ItemStatus>()
    for (const it of items) initial.set(it.id, "pending")
    setStatuses(initial)

    const controller = new AbortController()
    abortRef.current = controller
    const signal = controller.signal

    const queue = [...items]
    let stopped = false

    const runWorker = async () => {
      while (queue.length > 0) {
        if (stopped || signal.aborted) return
        const item = queue.shift()!
        setStatuses((prev) => {
          const next = new Map(prev)
          next.set(item.id, "active")
          return next
        })
        try {
          const outcome = await processItemRef.current(item, signal)
          if (stopped || signal.aborted) return
          setStatuses((prev) => {
            const next = new Map(prev)
            next.set(item.id, outcome)
            return next
          })
        } catch (err) {
          if (stopped || signal.aborted) return
          if (err instanceof Error && err.name === "AbortError") return
          setStatuses((prev) => {
            const next = new Map(prev)
            next.set(item.id, "failed")
            return next
          })
        }
      }
    }

    const workerCount = Math.max(
      1,
      Math.min(parallelism, items.length || 1),
    )
    const workers = Array.from({ length: workerCount }, runWorker)
    Promise.all(workers).then(() => {
      if (!stopped) setPhase("done")
    })

    return () => {
      stopped = true
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const summary = React.useMemo<ProposalGenerationSummary>(() => {
    let ready = 0
    let unchanged = 0
    let failed = 0
    for (const status of statuses.values()) {
      if (status === "ready") ready++
      else if (status === "unchanged") unchanged++
      else if (status === "failed") failed++
    }
    return {
      total: snapshot.length,
      ready,
      unchanged,
      failed,
      cancelled,
    }
  }, [statuses, snapshot.length, cancelled])

  const completedCount = summary.ready + summary.unchanged + summary.failed
  const progressPercent =
    snapshot.length === 0 ? 0 : (completedCount / snapshot.length) * 100

  const isSingle = snapshot.length === 1
  const showChecklist = snapshot.length <= COLLAPSE_THRESHOLD

  const handleCancel = () => {
    setCancelled(true)
    abortRef.current?.abort()
    onOpenChange(false)
  }

  const handleDone = () => {
    onComplete?.(summary)
    onOpenChange(false)
  }

  // Block close while running (Esc, overlay click, X button).
  const handleOpenChange = (next: boolean) => {
    if (!next && phase === "running") return
    onOpenChange(next)
  }

  const titleRunning = isSingle ? "Generating proposal" : "Generating proposals"
  const titleDone = "Done"

  const allFailed = phase === "done" && summary.failed === snapshot.length && snapshot.length > 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={phase === "done"}
        onEscapeKeyDown={(e) => {
          if (phase === "running") e.preventDefault()
        }}
        onPointerDownOutside={(e) => {
          if (phase === "running") e.preventDefault()
        }}
        onInteractOutside={(e) => {
          if (phase === "running") e.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {phase === "running" ? titleRunning : titleDone}
          </DialogTitle>
          {phase === "running" && (
            <DialogDescription>Do not close this tab</DialogDescription>
          )}
        </DialogHeader>

        {phase === "running" ? (
          <RunningBody
            items={snapshot}
            statuses={statuses}
            isSingle={isSingle}
            showChecklist={showChecklist}
            progressPercent={progressPercent}
            completedCount={completedCount}
            summary={summary}
          />
        ) : (
          <DoneBody
            summary={summary}
            isSingle={isSingle}
            allFailed={allFailed}
          />
        )}

        <DialogFooter>
          {phase === "running" ? (
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
          ) : (
            <Button onClick={handleDone}>
              {isSingle && summary.failed > 0
                ? "Close"
                : isSingle
                  ? "Review"
                  : "Review queue"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RunningBody({
  items,
  statuses,
  isSingle,
  showChecklist,
  progressPercent,
  completedCount,
  summary,
}: {
  items: ProgressItem[]
  statuses: Map<string, ItemStatus>
  isSingle: boolean
  showChecklist: boolean
  progressPercent: number
  completedCount: number
  summary: ProposalGenerationSummary
}) {
  if (isSingle) {
    const item = items[0]
    if (!item) return null
    return (
      <div className="flex items-center gap-3 py-2">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
        <ItemRowContent item={item} />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Progress value={progressPercent} className="flex-1" />
        <span className="text-xs tabular-nums text-muted-foreground shrink-0">
          {completedCount}/{items.length}
        </span>
      </div>

      {showChecklist ? (
        <ul className="max-h-64 overflow-y-auto space-y-2 pr-1">
          {items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              status={statuses.get(item.id) ?? "pending"}
            />
          ))}
        </ul>
      ) : (
        <CollapsedView items={items} statuses={statuses} summary={summary} />
      )}
    </div>
  )
}

function CollapsedView({
  items,
  statuses,
  summary,
}: {
  items: ProgressItem[]
  statuses: Map<string, ItemStatus>
  summary: ProposalGenerationSummary
}) {
  const activeItems = items.filter(
    (item) => statuses.get(item.id) === "active",
  )

  return (
    <div className="space-y-2">
      {activeItems.length > 0 && (
        <ul className="space-y-2 pr-1">
          {activeItems.slice(0, 5).map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              status="active"
            />
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground tabular-nums">
        {summary.ready} ready · {summary.unchanged} unchanged · {summary.failed} failed
      </p>
    </div>
  )
}

function ItemRow({ item, status }: { item: ProgressItem; status: ItemStatus }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 shrink-0">
        <StatusIcon status={status} />
      </span>
      <ItemRowContent item={item} muted={status === "pending"} />
    </li>
  )
}

function ItemRowContent({
  item,
  muted = false,
}: {
  item: ProgressItem
  muted?: boolean
}) {
  return (
    <div className={cn("flex-1 min-w-0", muted && "opacity-50")}>
      <div className="flex items-center gap-2 text-sm">
        <span className="truncate flex-1">{item.label}</span>
        {item.amount && (
          <span className="text-muted-foreground tabular-nums shrink-0">
            {item.amount}
          </span>
        )}
      </div>
      {(item.badge || item.sublabel) && (
        <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
          {item.badge && <span>{item.badge}</span>}
          {item.badge && item.sublabel && <span> · </span>}
          {item.sublabel && <span>{item.sublabel}</span>}
        </div>
      )}
    </div>
  )
}

function StatusIcon({ status }: { status: ItemStatus }) {
  switch (status) {
    case "pending":
      return <Circle className="h-4 w-4 text-muted-foreground/40" />
    case "active":
      return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
    case "ready":
      return <Check className="h-4 w-4 text-green-600" />
    case "unchanged":
      return <Minus className="h-4 w-4 text-muted-foreground" />
    case "failed":
      return <X className="h-4 w-4 text-destructive" />
  }
}

function DoneBody({
  summary,
  isSingle,
  allFailed,
}: {
  summary: ProposalGenerationSummary
  isSingle: boolean
  allFailed: boolean
}) {
  if (isSingle) {
    if (summary.failed > 0) {
      return (
        <div className="flex items-center gap-3 py-2">
          <X className="h-5 w-5 text-destructive shrink-0" />
          <span className="text-sm">Could not generate a proposal</span>
        </div>
      )
    }
    if (summary.unchanged > 0) {
      return (
        <div className="flex items-center gap-3 py-2">
          <Minus className="h-5 w-5 text-muted-foreground shrink-0" />
          <span className="text-sm">No new proposal — nothing changed</span>
        </div>
      )
    }
    return (
      <div className="flex items-center gap-3 py-2">
        <Check className="h-5 w-5 text-green-600 shrink-0" />
        <span className="text-sm">Proposal generated</span>
      </div>
    )
  }

  if (allFailed) {
    return (
      <div className="space-y-2 py-2">
        <p className="text-sm">All proposals failed.</p>
        <p className="text-xs text-muted-foreground">
          Check your connection and try again.
        </p>
      </div>
    )
  }

  return (
    <ul className="space-y-1.5 py-2 text-sm">
      {summary.ready > 0 && (
        <li className="flex items-center gap-2">
          <Check className="h-4 w-4 text-green-600 shrink-0" />
          <span>
            {summary.ready} proposal{summary.ready === 1 ? "" : "s"} ready
          </span>
        </li>
      )}
      {summary.unchanged > 0 && (
        <li className="flex items-center gap-2">
          <Minus className="h-4 w-4 text-muted-foreground shrink-0" />
          <span>
            {summary.unchanged} unchanged
          </span>
        </li>
      )}
      {summary.failed > 0 && (
        <li className="flex items-center gap-2">
          <X className="h-4 w-4 text-destructive shrink-0" />
          <span>
            {summary.failed} failed
          </span>
        </li>
      )}
    </ul>
  )
}
