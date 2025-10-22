"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { X, Trash2, Calendar, Building2, CreditCard, FileText, ChevronDown, ChevronUp } from "lucide-react"
import type { TransactionWithVendorAndPayment } from "@/lib/supabase/types"
import { getExchangeRateWithMetadata } from "@/lib/utils/exchange-rate-utils"
import { formatCurrency } from "@/lib/utils"

type TotalsCurrency = "USD" | "THB"

interface TransactionTotals {
  totalExpenses: number
  totalIncome: number
  netAmount: number
  currency: TotalsCurrency
}

interface BulkEditToolbarProps {
  selectedCount: number
  selectedTransactions: TransactionWithVendorAndPayment[]
  totalsCurrency: TotalsCurrency
  onTotalsCurrencyChange: (currency: TotalsCurrency) => void
  onClearSelection: () => void
  onEditVendor: () => void
  onEditDate: () => void
  onEditPaymentMethod: () => void
  onEditDescription: () => void
  onDelete: () => void
}

export function BulkEditToolbar({
  selectedCount,
  selectedTransactions,
  totalsCurrency,
  onTotalsCurrencyChange,
  onClearSelection,
  onEditVendor,
  onEditDate,
  onEditPaymentMethod,
  onEditDescription,
  onDelete,
}: BulkEditToolbarProps) {
  const [totals, setTotals] = React.useState<TransactionTotals>({
    totalExpenses: 0,
    totalIncome: 0,
    netAmount: 0,
    currency: totalsCurrency,
  })
  const [isCalculating, setIsCalculating] = React.useState(false)
  const [isExpanded, setIsExpanded] = React.useState(false)

  // Calculate totals for selected transactions
  React.useEffect(() => {
    const calculateTotals = async () => {
      setIsCalculating(true)

      let expenses = 0
      let income = 0

      for (const transaction of selectedTransactions) {
        let amount = transaction.amount

        // Convert to target currency if needed
        if (transaction.original_currency !== totalsCurrency) {
          try {
            const fromCurrency = transaction.original_currency
            const toCurrency = totalsCurrency

            const rateMetadata = await getExchangeRateWithMetadata(
              transaction.transaction_date,
              fromCurrency,
              toCurrency
            )

            if (rateMetadata.rate) {
              amount = transaction.amount * rateMetadata.rate
            }
          } catch {
            // Use fallback rates if conversion fails
            if (totalsCurrency === "USD" && transaction.original_currency === "THB") {
              amount = transaction.amount * 0.028
            } else if (totalsCurrency === "THB" && transaction.original_currency === "USD") {
              amount = transaction.amount * 35
            }
          }
        }

        if (transaction.transaction_type === "expense") {
          expenses += amount
        } else if (transaction.transaction_type === "income") {
          income += amount
        }
      }

      setTotals({
        totalExpenses: expenses,
        totalIncome: income,
        netAmount: income - expenses,
        currency: totalsCurrency,
      })
      setIsCalculating(false)
    }

    if (selectedTransactions.length > 0) {
      calculateTotals()
    }
  }, [selectedTransactions, totalsCurrency])

  const formatTotal = (amount: number) => {
    return formatCurrency(Math.abs(amount), totalsCurrency)
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 lg:left-[240px] bg-blue-50 border-t-2 border-blue-200 shadow-[0px_-2px_8px_0px_rgba(0,0,0,0.08)] z-40">
      <div className="w-full max-w-md md:max-w-none mx-auto px-6 md:px-8 py-4">
        <div className="flex items-start md:items-center justify-between gap-4 flex-col md:flex-row">
          {/* Left: Selection Info & Totals */}
          <div className="flex flex-col gap-2 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium text-blue-900">
                {selectedCount} {selectedCount === 1 ? "transaction" : "transactions"} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearSelection}
                className="h-7 px-2 text-blue-700 hover:text-blue-900 hover:bg-blue-100"
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>

            {/* Totals Section */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-700">Total:</span>
                <span className={`text-base font-semibold ${
                  totals.netAmount >= 0 ? "text-green-600" : "text-red-600"
                }`}>
                  {isCalculating ? "Calculating..." : formatTotal(totals.netAmount)}
                </span>
              </div>

              {/* Currency Toggle */}
              <ToggleGroup
                type="single"
                value={totalsCurrency}
                onValueChange={(value: TotalsCurrency) => {
                  if (value) onTotalsCurrencyChange(value)
                }}
                variant="outline"
                className="gap-0"
              >
                <ToggleGroupItem
                  value="USD"
                  aria-label="Show totals in USD"
                  className="h-7 px-2 text-xs font-medium"
                >
                  USD
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="THB"
                  aria-label="Show totals in THB"
                  className="h-7 px-2 text-xs font-medium"
                >
                  THB
                </ToggleGroupItem>
              </ToggleGroup>

              {/* Expand/Collapse Button (Mobile & Tablet) */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-7 px-2 text-xs text-blue-700 hover:text-blue-900 hover:bg-blue-100 md:hidden"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-3 w-3 mr-1" />
                    Hide details
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1" />
                    Show details
                  </>
                )}
              </Button>
            </div>

            {/* Expanded Breakdown (Always visible on desktop, toggleable on mobile) */}
            {(isExpanded || typeof window !== 'undefined' && window.innerWidth >= 768) && !isCalculating && (
              <div className="flex items-center gap-4 text-xs text-zinc-600 flex-wrap">
                <div className="flex items-center gap-1">
                  <span>Expenses:</span>
                  <span className="font-medium text-red-600">{formatTotal(totals.totalExpenses)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>Income:</span>
                  <span className="font-medium text-green-600">{formatTotal(totals.totalIncome)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Right: Bulk Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={onEditVendor}
              className="h-8 px-3 bg-white border-blue-200 hover:bg-blue-50 text-zinc-950"
            >
              <Building2 className="h-3.5 w-3.5 mr-1.5" />
              <span className="hidden sm:inline">Vendor</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onEditDate}
              className="h-8 px-3 bg-white border-blue-200 hover:bg-blue-50 text-zinc-950"
            >
              <Calendar className="h-3.5 w-3.5 mr-1.5" />
              <span className="hidden sm:inline">Date</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onEditPaymentMethod}
              className="h-8 px-3 bg-white border-blue-200 hover:bg-blue-50 text-zinc-950"
            >
              <CreditCard className="h-3.5 w-3.5 mr-1.5" />
              <span className="hidden sm:inline">Payment</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onEditDescription}
              className="h-8 px-3 bg-white border-blue-200 hover:bg-blue-50 text-zinc-950"
            >
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              <span className="hidden sm:inline">Description</span>
            </Button>
            <div className="hidden sm:block w-px h-6 bg-blue-200" />
            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
              className="h-8 px-3 bg-white border-red-200 hover:bg-red-50 text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
