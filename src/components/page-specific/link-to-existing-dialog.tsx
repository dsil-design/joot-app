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
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  Coins,
  FileText,
  Link as LinkIcon,
  Loader2,
  Search,
  Store,
  Mail,
  Tag,
  Calendar as CalendarIcon,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { DatePicker } from "@/components/ui/date-picker"
import { format } from "date-fns"

/**
 * Statement/email transaction info displayed at the top of the dialog
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
  payment_method?: { id: string; name: string } | null
  source_email_transaction_id?: string | null
  source_statement_upload_id?: string | null
  tags?: { id: string; name: string; color?: string }[]
}

/**
 * LinkToExistingDialog props
 */
export interface LinkToExistingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: LinkSourceItem | null
  onConfirm: (transactionIds: string[]) => Promise<void>
}

function formatAmount(amount: number, currency: string): string {
  const sym = currency === "THB" ? "\u0E3F" : currency === "USD" ? "$" : (currency || "")
  return `${sym}${Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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

function SourceBadges({ transaction }: {
  transaction: {
    source_email_transaction_id?: string | null
    source_statement_upload_id?: string | null
  }
}) {
  const hasEmail = !!transaction.source_email_transaction_id
  const hasStatement = !!transaction.source_statement_upload_id
  if (!hasEmail && !hasStatement) return null

  return (
    <>
      {hasEmail && (
        <Badge variant="secondary" className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 text-[10px] px-1.5 py-0">
          <Mail className="h-2.5 w-2.5 mr-0.5" />
          Email
        </Badge>
      )}
      {hasStatement && (
        <Badge variant="secondary" className="bg-muted text-slate-800 border border-slate-200 text-[10px] px-1.5 py-0">
          <FileText className="h-2.5 w-2.5 mr-0.5" />
          Statement
        </Badge>
      )}
    </>
  )
}

/**
 * LinkToExistingDialog
 *
 * Modal for searching and linking an email to one or more existing transactions.
 * Supports text search (description, vendor, amount, ID), date range filtering,
 * and checkbox multi-selection.
 */
export function LinkToExistingDialog({
  open,
  onOpenChange,
  item,
  onConfirm,
}: LinkToExistingDialogProps) {
  const [search, setSearch] = React.useState("")
  const [dateFrom, setDateFrom] = React.useState<Date | undefined>(undefined)
  const [dateTo, setDateTo] = React.useState<Date | undefined>(undefined)
  const [results, setResults] = React.useState<TransactionResult[]>([])
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [isSearching, setIsSearching] = React.useState(false)
  const [isLinking, setIsLinking] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [hasSearched, setHasSearched] = React.useState(false)
  const debounceRef = React.useRef<NodeJS.Timeout | null>(null)

  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (!open) {
      setSearch("")
      setDateFrom(undefined)
      setDateTo(undefined)
      setResults([])
      setSelectedIds(new Set())
      setError(null)
      setIsSearching(false)
      setIsLinking(false)
      setHasSearched(false)
    }
  }, [open])

  // Debounced search
  const executeSearch = React.useCallback(
    async (searchText: string, fromDate: Date | undefined, toDate: Date | undefined) => {
      const hasFilters = searchText.trim() || fromDate || toDate
      if (!hasFilters) {
        setResults([])
        setHasSearched(false)
        return
      }

      setIsSearching(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          pageSize: "20",
          sortField: "date",
          sortDirection: "desc",
          datePreset: "all-time",
        })

        if (searchText.trim()) {
          params.set("searchKeyword", searchText.trim())
        }
        if (fromDate) {
          params.set("datePreset", "custom")
          params.set("dateFrom", format(fromDate, "yyyy-MM-dd"))
        }
        if (toDate) {
          params.set("datePreset", "custom")
          params.set("dateTo", format(toDate, "yyyy-MM-dd"))
        }

        const response = await fetch(`/api/transactions?${params}`)
        if (!response.ok) throw new Error("Failed to search transactions")

        const data = await response.json()
        setResults(data.items || [])
        setHasSearched(true)
      } catch {
        setError("Failed to search transactions")
        setResults([])
      } finally {
        setIsSearching(false)
      }
    },
    []
  )

  React.useEffect(() => {
    if (!open) return

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      executeSearch(search, dateFrom, dateTo)
    }, 300)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [search, dateFrom, dateTo, open, executeSearch])

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleConfirm = async () => {
    if (selectedIds.size === 0) return

    setIsLinking(true)
    setError(null)

    try {
      await onConfirm(Array.from(selectedIds))
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to link transaction(s)")
    } finally {
      setIsLinking(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-blue-500 dark:text-blue-400" />
            Search &amp; Link Transaction
          </DialogTitle>
          <DialogDescription>
            Search your transactions by description, vendor, amount, or ID. Select one or more to link.
          </DialogDescription>
        </DialogHeader>

        {/* Source item info */}
        {item && (
          <div className="bg-muted/50 rounded-lg p-3 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              Linking email:
            </p>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium truncate">
                {item.description}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Coins className="h-3.5 w-3.5" />
                {formatAmount(item.amount, item.currency)}
              </span>
              {item.date && (
                <span className="flex items-center gap-1">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {formatDate(item.date)}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Search fields */}
        <div className="space-y-2">
          {/* Text search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by description, vendor, amount, or transaction ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Date range */}
          <div className="flex gap-2 items-center">
            <div className="flex-1">
              <DatePicker
                date={dateFrom}
                onDateChange={setDateFrom}
                placeholder="From date"
                formatStr="MMM d, yyyy"
              />
            </div>
            <span className="text-xs text-muted-foreground shrink-0">to</span>
            <div className="flex-1">
              <DatePicker
                date={dateTo}
                onDateChange={setDateTo}
                placeholder="To date"
                formatStr="MMM d, yyyy"
              />
            </div>
            {(dateFrom || dateTo) && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => { setDateFrom(undefined); setDateTo(undefined) }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-1 border rounded-md p-1">
          {isSearching && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isSearching && !hasSearched && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Enter a search term or date range to find transactions.
            </p>
          )}

          {!isSearching && hasSearched && results.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No transactions found
            </p>
          )}

          {!isSearching &&
            results.map((tx) => {
              const isSelected = selectedIds.has(tx.id)
              return (
                <div
                  key={tx.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleSelection(tx.id)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleSelection(tx.id) } }}
                  className={cn(
                    "w-full text-left rounded-lg border p-3 transition-colors flex gap-3 items-start cursor-pointer",
                    isSelected
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                      : "border-transparent hover:bg-muted/50"
                  )}
                >
                  {/* Checkbox */}
                  <div className="pt-0.5 shrink-0">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelection(tx.id)}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    {/* Primary: vendor or description */}
                    <div className="flex items-center gap-2">
                      {tx.vendor?.name ? (
                        <>
                          <Store className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-sm font-medium truncate">
                            {tx.vendor.name}
                          </span>
                        </>
                      ) : (
                        <span className="text-sm font-medium truncate">
                          {tx.description || "No description"}
                        </span>
                      )}
                    </div>

                    {/* Description (when vendor is shown) */}
                    {tx.vendor?.name && tx.description && (
                      <p className="text-xs text-muted-foreground truncate">
                        {tx.description}
                      </p>
                    )}

                    {/* Amount, date, badges row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium">
                        {formatAmount(tx.amount, tx.original_currency)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(tx.transaction_date)}
                      </span>
                      <SourceBadges transaction={tx} />
                      {tx.tags && tx.tags.length > 0 && (
                        <>
                          {tx.tags.slice(0, 2).map((tag) => (
                            <Badge
                              key={tag.id}
                              variant="outline"
                              className="text-[10px] px-1.5 py-0"
                              style={tag.color ? { borderColor: tag.color, color: tag.color } : undefined}
                            >
                              <Tag className="h-2.5 w-2.5 mr-0.5" />
                              {tag.name}
                            </Badge>
                          ))}
                          {tx.tags.length > 2 && (
                            <span className="text-[10px] text-muted-foreground">
                              +{tx.tags.length - 2}
                            </span>
                          )}
                        </>
                      )}
                    </div>

                    {/* Transaction ID (truncated) */}
                    <p className="text-[10px] text-muted-foreground/60 font-mono truncate">
                      {tx.id}
                    </p>
                  </div>
                </div>
              )
            })}
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <span className="text-sm text-muted-foreground">
            {selectedIds.size > 0
              ? `${selectedIds.size} transaction${selectedIds.size > 1 ? "s" : ""} selected`
              : ""}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLinking}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={selectedIds.size === 0 || isLinking}
              className="bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 dark:hover:bg-blue-600"
            >
              {isLinking ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Linking...
                </>
              ) : (
                <>
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Link {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
