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
import {
  Calendar,
  DollarSign,
  FileText,
  Link as LinkIcon,
  Loader2,
  Search,
  Store,
} from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Statement transaction info displayed at the top of the dialog
 */
export interface LinkSourceItem {
  id: string
  description: string
  amount: number
  currency: string
  date: string
}

/**
 * Transaction search result
 */
interface TransactionResult {
  id: string
  description: string
  amount: number
  original_currency: string
  transaction_date: string
  vendor?: { id: string; name: string } | null
}

/**
 * LinkToExistingDialog props
 */
export interface LinkToExistingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: LinkSourceItem | null
  onConfirm: (transactionId: string) => Promise<void>
}

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount))
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  } catch {
    return dateString
  }
}

/**
 * LinkToExistingDialog
 *
 * Dialog for searching and linking a statement transaction to an existing transaction.
 */
export function LinkToExistingDialog({
  open,
  onOpenChange,
  item,
  onConfirm,
}: LinkToExistingDialogProps) {
  const [search, setSearch] = React.useState("")
  const [results, setResults] = React.useState<TransactionResult[]>([])
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [isSearching, setIsSearching] = React.useState(false)
  const [isLinking, setIsLinking] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const debounceRef = React.useRef<NodeJS.Timeout | null>(null)

  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (!open) {
      setSearch("")
      setResults([])
      setSelectedId(null)
      setError(null)
      setIsSearching(false)
      setIsLinking(false)
    }
  }, [open])

  // Debounced search
  React.useEffect(() => {
    if (!open) return

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (!search.trim()) {
      setResults([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          searchKeyword: search.trim(),
          pageSize: "10",
          sortField: "date",
          sortDirection: "desc",
        })

        const response = await fetch(`/api/transactions?${params}`)
        if (!response.ok) throw new Error("Failed to search transactions")

        const data = await response.json()
        setResults(data.items || [])
      } catch {
        setError("Failed to search transactions")
        setResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [search, open])

  const handleConfirm = async () => {
    if (!selectedId) return

    setIsLinking(true)
    setError(null)

    try {
      await onConfirm(selectedId)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to link transaction")
    } finally {
      setIsLinking(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-blue-500" />
            Link to Existing Transaction
          </DialogTitle>
          <DialogDescription>
            Search for an existing transaction to link this statement entry to.
          </DialogDescription>
        </DialogHeader>

        {/* Source item info */}
        {item && (
          <div className="bg-muted/50 rounded-lg p-3 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              Statement entry:
            </p>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium truncate">
                {item.description}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5" />
                {formatAmount(item.amount, item.currency)}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(item.date)}
              </span>
            </div>
          </div>
        )}

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Results */}
        <div className="max-h-[250px] overflow-y-auto space-y-1">
          {isSearching && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isSearching && search.trim() && results.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              No transactions found
            </p>
          )}

          {!isSearching &&
            results.map((tx) => (
              <button
                key={tx.id}
                type="button"
                onClick={() => setSelectedId(tx.id)}
                className={cn(
                  "w-full text-left rounded-lg border p-3 transition-colors",
                  selectedId === tx.id
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                    : "border-transparent hover:bg-muted/50"
                )}
              >
                <div className="flex items-center gap-2">
                  {tx.vendor?.name ? (
                    <>
                      <Store className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium truncate">
                        {tx.vendor.name}
                      </span>
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium truncate">
                        {tx.description}
                      </span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1 ml-6">
                  <span>
                    {formatAmount(tx.amount, tx.original_currency)}
                  </span>
                  <span>{formatDate(tx.transaction_date)}</span>
                  {tx.vendor?.name && tx.description && (
                    <span className="truncate">{tx.description}</span>
                  )}
                </div>
              </button>
            ))}
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLinking}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedId || isLinking}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLinking ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Linking...
              </>
            ) : (
              <>
                <LinkIcon className="h-4 w-4 mr-2" />
                Link
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
