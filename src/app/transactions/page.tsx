/**
 * FIGMA DESIGN IMPLEMENTATION
 * Design URL: https://www.figma.com/design/sGttHlfcLJEy1pNBgqpEr6/%F0%9F%9A%A7-Transactions?node-id=40000014-844 | Node: 40000014:844
 * Fidelity: 100% - No unauthorized additions
 */
"use client"

import * as React from "react"
import { LayoutGrid, Table as TableIcon, Plus, Edit2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { useTransactions } from "@/hooks/use-transactions"
import type { TransactionWithVendorAndPayment } from "@/lib/supabase/types"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { TransactionGroup } from "@/components/page-specific/transactions-list"
import { AddTransactionFooter } from "@/components/page-specific/add-transaction-footer"
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns"
import { getExchangeRateWithMetadata } from "@/lib/utils/exchange-rate-utils"
import { getBatchExchangeRates, getCacheKey } from "@/lib/utils/exchange-rate-batch"
import { formatCurrency } from "@/lib/utils"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import type { DateRange } from "react-day-picker"
import { Input } from "@/components/ui/input"
import { MultiSelectComboBox } from "@/components/ui/multi-select-combobox"
import { X } from "lucide-react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { TransactionForm, type TransactionFormData } from "@/components/forms/transaction-form"
import { DeleteConfirmationDialog } from "@/components/page-specific/delete-confirmation-dialog"
import { BulkEditToolbar } from "@/components/page-specific/bulk-edit-toolbar"
import {
  BulkEditVendorModal,
  BulkEditDateModal,
  BulkEditPaymentMethodModal,
  BulkEditDescriptionModal,
} from "@/components/page-specific/bulk-edit-modals"
import { toast } from "sonner"
import { MainNavigation } from "@/components/page-specific/main-navigation"
import { SidebarNavigation } from "@/components/page-specific/sidebar-navigation"
import { useAuth } from "@/components/providers/AuthProvider"
import { createClient } from "@/lib/supabase/client"
import { QuickFilterBar } from "@/components/page-specific/quick-filter-bar"
import { ActiveFilterChips } from "@/components/page-specific/active-filter-chips"
import { AdvancedFiltersPanel } from "@/components/page-specific/advanced-filters-panel"
import { getPresetRange, type DatePresetKey } from "@/lib/utils/date-filters"

type ViewMode = "recorded" | "all-usd" | "all-thb"
type LayoutMode = "cards" | "table"
type TotalsCurrency = "USD" | "THB"
type TransactionType = "all" | "expense" | "income"
type ConversionCurrency = "USD" | "THB"

interface TransactionFilters {
  dateRange?: DateRange
  datePreset?: DatePresetKey
  searchKeyword: string
  vendorIds: string[]
  paymentMethodIds: string[]
  transactionType: TransactionType
}

interface TransactionTotals {
  totalExpenses: number
  totalIncome: number
  currency: TotalsCurrency
}

interface ViewControllerProps {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
}

interface ViewLayoutToggleProps {
  layoutMode: LayoutMode
  onLayoutModeChange: (mode: LayoutMode) => void
}

interface TransactionFiltersProps {
  filters: TransactionFilters
  onFiltersChange: (filters: TransactionFilters) => void
  vendors: Array<{ id: string; name: string }>
  paymentMethods: Array<{ id: string; name: string }>
}

interface TotalsFooterProps {
  transactions: TransactionWithVendorAndPayment[]
  totalsCurrency: TotalsCurrency
  onTotalsCurrencyChange: (currency: TotalsCurrency) => void
}

function ViewController({ viewMode, onViewModeChange }: ViewControllerProps) {
  const getDisplayText = (mode: ViewMode) => {
    switch (mode) {
      case "recorded":
        return "Recorded cost"
      case "all-usd":
        return "All USD"
      case "all-thb":
        return "All THB"
      default:
        return "Recorded cost"
    }
  }

  return (
    <div className="content-stretch flex flex-col items-start justify-start relative shrink-0 w-[161px]">
      <Select value={viewMode} onValueChange={(value: ViewMode) => onViewModeChange(value)}>
        <SelectTrigger className="bg-white box-border content-stretch flex h-10 items-center justify-between px-3 py-2 relative rounded-[6px] shrink-0 w-full border border-zinc-200 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
          <SelectValue>
            <div className="font-normal text-[14px] text-zinc-950">
              <p className="leading-[20px]">{getDisplayText(viewMode)}</p>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-white border border-zinc-200 rounded-[6px] shadow-[0px_4px_8px_0px_rgba(0,0,0,0.1)]">
          <SelectItem value="recorded" className="font-normal text-[14px] text-zinc-950">
            Recorded cost
          </SelectItem>
          <SelectItem value="all-usd" className="font-normal text-[14px] text-zinc-950">
            All USD
          </SelectItem>
          <SelectItem value="all-thb" className="font-normal text-[14px] text-zinc-950">
            All THB
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

function ViewLayoutToggle({ layoutMode, onLayoutModeChange }: ViewLayoutToggleProps) {
  return (
    <div className="hidden md:flex">
      <ToggleGroup
        type="single"
        value={layoutMode}
        onValueChange={(value: LayoutMode) => {
          if (value) onLayoutModeChange(value)
        }}
        variant="outline"
        className="gap-0"
      >
        <ToggleGroupItem
          value="table"
          aria-label="Table view"
          className="h-10 px-3"
        >
          <TableIcon className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem
          value="cards"
          aria-label="Card view"
          className="h-10 px-3"
        >
          <LayoutGrid className="h-4 w-4" />
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  )
}

interface TransactionsTableProps {
  transactions: TransactionWithVendorAndPayment[]
  viewMode: ViewMode
  showExchangeRates: boolean
  conversionCurrency: ConversionCurrency
  isMobile: boolean
  selectedIds: Set<string>
  onToggleSelection: (id: string, shiftKey: boolean, ctrlKey: boolean) => void
  onToggleAll: () => void
  onEditTransaction: (transaction: TransactionWithVendorAndPayment) => void
  onDeleteTransaction: (id: string) => void
}

function TransactionsTable({
  transactions,
  viewMode,
  showExchangeRates,
  conversionCurrency,
  isMobile,
  selectedIds,
  onToggleSelection,
  onToggleAll,
  onEditTransaction,
  onDeleteTransaction
}: TransactionsTableProps) {
  const [exchangeRates, setExchangeRates] = React.useState<Record<string, number | null>>({})
  const [conversionRates, setConversionRates] = React.useState<Record<string, number | null>>({})

  // Fetch exchange rates for all transactions using batch optimization
  React.useEffect(() => {
    const fetchRates = async () => {
      if (transactions.length === 0) return

      // Build batch request for all needed exchange rates
      const batchRequests = transactions.flatMap(transaction => {
        const requests = []

        // Always need USD/THB rate for display
        const fromCurrency = transaction.original_currency === "USD" ? "USD" : "THB"
        const toCurrency = transaction.original_currency === "USD" ? "THB" : "USD"
        requests.push({
          transactionDate: transaction.transaction_date,
          fromCurrency,
          toCurrency
        })

        // Need conversion rate if different from original
        if (transaction.original_currency !== conversionCurrency) {
          requests.push({
            transactionDate: transaction.transaction_date,
            fromCurrency: transaction.original_currency,
            toCurrency: conversionCurrency
          })
        }

        return requests
      })

      // Fetch all rates in batch (much faster than N queries)
      const rateCache = await getBatchExchangeRates(batchRequests)

      // Map rates back to transactions
      const rates: Record<string, number | null> = {}
      const convRates: Record<string, number | null> = {}

      transactions.forEach(transaction => {
        const fromCurrency = transaction.original_currency === "USD" ? "USD" : "THB"
        const toCurrency = transaction.original_currency === "USD" ? "THB" : "USD"
        const displayKey = getCacheKey(transaction.transaction_date, fromCurrency, toCurrency)
        rates[transaction.id] = rateCache[displayKey] ?? null

        if (transaction.original_currency !== conversionCurrency) {
          const convKey = getCacheKey(
            transaction.transaction_date,
            transaction.original_currency,
            conversionCurrency
          )
          convRates[transaction.id] = rateCache[convKey] ?? null
        } else {
          convRates[transaction.id] = 1
        }
      })

      setExchangeRates(rates)
      setConversionRates(convRates)
    }

    if (transactions.length > 0 && showExchangeRates) {
      fetchRates()
    }
  }, [transactions, showExchangeRates, conversionCurrency])

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "MMM d, yyyy")
    } catch {
      return dateString
    }
  }

  const formatAmount = (transaction: TransactionWithVendorAndPayment) => {
    return `${formatCurrency(transaction.amount, transaction.original_currency)} ${transaction.original_currency}`
  }

  const formatExchangeRate = (transaction: TransactionWithVendorAndPayment) => {
    const rate = exchangeRates[transaction.id]

    if (rate === null || rate === undefined) {
      return "Loading..."
    }

    // Always format as: 1 USD = [x] THB
    if (transaction.original_currency === "USD") {
      const formattedRate = formatCurrency(rate, 'THB').replace('฿', '')
      return `1 USD = ${formattedRate} THB`
    } else {
      const usdToThb = 1 / rate
      const formattedRate = formatCurrency(usdToThb, 'THB').replace('฿', '')
      return `1 USD = ${formattedRate} THB`
    }
  }

  const formatConvertedAmount = (transaction: TransactionWithVendorAndPayment) => {
    const rate = conversionRates[transaction.id]

    if (rate === null || rate === undefined) {
      return "Loading..."
    }

    const convertedAmount = transaction.amount * rate
    return `${formatCurrency(convertedAmount, conversionCurrency)} ${conversionCurrency}`
  }

  const handleRowClick = (
    transaction: TransactionWithVendorAndPayment,
    event: React.MouseEvent<HTMLTableRowElement>
  ) => {
    // Don't navigate/edit if clicking on checkbox or action buttons
    const target = event.target as HTMLElement
    if (
      target.closest('input[type="checkbox"]') ||
      target.closest('button') ||
      target.closest('[role="checkbox"]')
    ) {
      return
    }

    // Handle selection with modifiers
    const shiftKey = event.shiftKey
    const ctrlKey = event.ctrlKey || event.metaKey
    onToggleSelection(transaction.id, shiftKey, ctrlKey)
  }

  const allSelected = transactions.length > 0 && transactions.every(t => selectedIds.has(t.id))
  const someSelected = transactions.some(t => selectedIds.has(t.id)) && !allSelected

  // Calculate colspan based on visible columns
  const totalColumns = 8 + (showExchangeRates ? 2 : 0) // Checkbox + 6 base columns + actions + optional exchange rate columns

  return (
    <div className="w-full overflow-x-auto rounded-lg border border-zinc-200">
      <Table>
        <TableHeader>
          <TableRow className="bg-zinc-50">
            <TableHead className="w-[40px]">
              <Checkbox
                checked={allSelected}
                onCheckedChange={onToggleAll}
                aria-label="Select all"
                className={someSelected ? "data-[state=checked]:bg-blue-600" : ""}
              />
            </TableHead>
            <TableHead className="font-medium text-zinc-950">Type</TableHead>
            <TableHead className="font-medium text-zinc-950">Date</TableHead>
            <TableHead className="font-medium text-zinc-950">Description</TableHead>
            <TableHead className="font-medium text-zinc-950">Vendor</TableHead>
            <TableHead className="font-medium text-zinc-950">Payment Method</TableHead>
            <TableHead className="font-medium text-zinc-950">Amount</TableHead>
            {showExchangeRates && (
              <>
                <TableHead className="font-medium text-zinc-950">Exchange Rate</TableHead>
                <TableHead className="font-medium text-zinc-950">Converted Amount</TableHead>
              </>
            )}
            <TableHead className="font-medium text-zinc-950">Tags</TableHead>
            <TableHead className="font-medium text-zinc-950 w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={totalColumns + 1} className="text-center text-zinc-500 py-8">
                No transactions found matching the filters.
              </TableCell>
            </TableRow>
          ) : (
            transactions.map((transaction) => {
              const isSelected = selectedIds.has(transaction.id)
              return (
                <TableRow
                  key={transaction.id}
                  className={`cursor-pointer hover:bg-zinc-50 ${
                    isSelected ? "bg-blue-50 hover:bg-blue-100" : ""
                  }`}
                  onClick={(e) => handleRowClick(transaction, e)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onToggleSelection(transaction.id, false, false)}
                      aria-label={`Select transaction ${transaction.id}`}
                    />
                  </TableCell>
                  <TableCell className="capitalize">
                    {transaction.transaction_type}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatDate(transaction.transaction_date)}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {transaction.description || "No description"}
                  </TableCell>
                  <TableCell className="max-w-[150px] truncate">
                    {transaction.vendors?.name || "Unknown"}
                  </TableCell>
                  <TableCell className="max-w-[150px] truncate">
                    {transaction.payment_methods?.name || "Unknown"}
                  </TableCell>
                  <TableCell className="font-medium whitespace-nowrap">
                    {formatAmount(transaction)}
                  </TableCell>
                  {showExchangeRates && (
                    <>
                      <TableCell className="text-sm text-zinc-600 whitespace-nowrap">
                        {formatExchangeRate(transaction)}
                      </TableCell>
                      <TableCell className="font-medium text-sm text-zinc-900 whitespace-nowrap">
                        {formatConvertedAmount(transaction)}
                      </TableCell>
                    </>
                  )}
                  <TableCell>
                    {transaction.tags && transaction.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {transaction.tags.map((tag) => (
                          <Badge
                            key={tag.id}
                            variant="secondary"
                            style={{
                              backgroundColor: tag.color,
                              color: '#18181b',
                            }}
                            className="text-xs"
                          >
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-zinc-400 text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onEditTransaction(transaction)}
                        aria-label="Edit transaction"
                      >
                        <Edit2 className="h-4 w-4 text-zinc-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onDeleteTransaction(transaction.id)}
                        aria-label="Delete transaction"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}

function TransactionFiltersComponent({ filters, onFiltersChange, vendors, paymentMethods }: TransactionFiltersProps) {
  const hasActiveFilters = filters.dateRange || filters.searchKeyword ||
    filters.vendorIds.length > 0 || filters.paymentMethodIds.length > 0 || filters.transactionType !== "all"

  const clearAllFilters = () => {
    onFiltersChange({
      dateRange: undefined,
      searchKeyword: "",
      vendorIds: [],
      paymentMethodIds: [],
      transactionType: "all",
    })
  }

  const vendorOptions = vendors.map(v => ({ value: v.id, label: v.name }))
  const paymentMethodOptions = paymentMethods.map(pm => ({ value: pm.id, label: pm.name }))

  return (
    <div className="w-full bg-zinc-50 rounded-lg border border-zinc-200">
      <Accordion type="single" collapsible>
        <AccordionItem value="filters" className="border-b-0">
          <div className="flex items-center justify-between px-4">
            <AccordionTrigger className="hover:no-underline py-4">
              <h3 className="text-sm font-medium text-zinc-950">Filters</h3>
            </AccordionTrigger>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="text-zinc-600 hover:text-zinc-950 h-8"
              >
                <X className="h-4 w-4 mr-1" />
                Clear all
              </Button>
            )}
          </div>
          <AccordionContent>
            <div className="px-4 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Transaction Type Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-700">Transaction Type</label>
          <RadioGroup
            value={filters.transactionType}
            onValueChange={(value: TransactionType) => onFiltersChange({ ...filters, transactionType: value })}
            className="flex flex-row gap-4 pt-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="all" id="type-all" />
              <Label htmlFor="type-all" className="text-sm font-normal cursor-pointer">
                All
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="expense" id="type-expense" />
              <Label htmlFor="type-expense" className="text-sm font-normal cursor-pointer">
                Expense
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="income" id="type-income" />
              <Label htmlFor="type-income" className="text-sm font-normal cursor-pointer">
                Income
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Date Range */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-700">Date Range</label>
          <DateRangePicker
            dateRange={filters.dateRange}
            onDateRangeChange={(range) => onFiltersChange({ ...filters, dateRange: range })}
            placeholder="Type or pick dates (e.g., 1/15/24 - 2/20/24)"
          />
        </div>

        {/* Search Keyword */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-700">Search Description</label>
          <Input
            type="text"
            placeholder="Search transactions..."
            value={filters.searchKeyword}
            onChange={(e) => onFiltersChange({ ...filters, searchKeyword: e.target.value })}
            className="bg-white"
          />
        </div>

        {/* Vendor Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-700">Vendors</label>
          <MultiSelectComboBox
            options={vendorOptions}
            values={filters.vendorIds}
            onValuesChange={(vendorIds) => onFiltersChange({ ...filters, vendorIds })}
            placeholder="Select vendors..."
            searchPlaceholder="Search vendors..."
            emptyMessage="No vendors found."
            allowAdd={false}
            className="bg-white"
          />
        </div>

        {/* Payment Method Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-700">Payment Methods</label>
          <MultiSelectComboBox
            options={paymentMethodOptions}
            values={filters.paymentMethodIds}
            onValuesChange={(paymentMethodIds) => onFiltersChange({ ...filters, paymentMethodIds })}
            placeholder="Select payment methods..."
            searchPlaceholder="Search payment methods..."
            emptyMessage="No payment methods found."
            allowAdd={false}
            className="bg-white"
          />
        </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}

interface ExchangeRatesToggleProps {
  showExchangeRates: boolean
  onToggle: () => void
  conversionCurrency: ConversionCurrency
  onConversionCurrencyChange: (currency: ConversionCurrency) => void
}

function ExchangeRatesToggle({
  showExchangeRates,
  onToggle,
  conversionCurrency,
  onConversionCurrencyChange
}: ExchangeRatesToggleProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Button
          variant="outline"
          onClick={onToggle}
          className="bg-white border-zinc-200 hover:bg-zinc-50 h-10 px-4"
        >
          {showExchangeRates ? "Hide Exchange Rates" : "Show Exchange Rates"}
        </Button>

        {showExchangeRates && (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-zinc-700">Convert to:</span>
            <RadioGroup
              value={conversionCurrency}
              onValueChange={(value: ConversionCurrency) => onConversionCurrencyChange(value)}
              className="flex flex-row gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="USD" id="conv-usd" />
                <Label htmlFor="conv-usd" className="text-sm font-normal cursor-pointer">
                  USD
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="THB" id="conv-thb" />
                <Label htmlFor="conv-thb" className="text-sm font-normal cursor-pointer">
                  THB
                </Label>
              </div>
            </RadioGroup>
          </div>
        )}
      </div>
    </div>
  )
}

function TotalsFooter({ transactions, totalsCurrency, onTotalsCurrencyChange }: TotalsFooterProps) {
  const [totals, setTotals] = React.useState<TransactionTotals>({
    totalExpenses: 0,
    totalIncome: 0,
    currency: totalsCurrency,
  })
  const [isCalculating, setIsCalculating] = React.useState(false)

  // Calculate totals whenever transactions or currency changes (using batch optimization)
  React.useEffect(() => {
    const calculateTotals = async () => {
      if (transactions.length === 0) {
        setTotals({
          totalExpenses: 0,
          totalIncome: 0,
          currency: totalsCurrency,
        })
        setIsCalculating(false)
        return
      }

      setIsCalculating(true)

      // Build batch request for all needed conversions
      const batchRequests = transactions
        .filter(t => t.original_currency !== totalsCurrency)
        .map(transaction => ({
          transactionDate: transaction.transaction_date,
          fromCurrency: transaction.original_currency,
          toCurrency: totalsCurrency
        }))

      // Fetch all conversion rates in batch
      const rateCache = batchRequests.length > 0 ? await getBatchExchangeRates(batchRequests) : {}

      let expenses = 0
      let income = 0

      // Calculate totals using cached rates
      transactions.forEach(transaction => {
        let amount = transaction.amount

        // Convert to target currency if needed
        if (transaction.original_currency !== totalsCurrency) {
          const cacheKey = getCacheKey(
            transaction.transaction_date,
            transaction.original_currency,
            totalsCurrency
          )
          const rate = rateCache[cacheKey]

          if (rate) {
            amount = transaction.amount * rate
          } else {
            // Fallback rates
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
      })

      setTotals({
        totalExpenses: expenses,
        totalIncome: income,
        currency: totalsCurrency,
      })
      setIsCalculating(false)
    }

    calculateTotals()
  }, [transactions, totalsCurrency])

  const formatTotal = (amount: number) => {
    return formatCurrency(amount, totalsCurrency)
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 lg:left-[240px] bg-white border-t border-zinc-200 shadow-[0px_-2px_8px_0px_rgba(0,0,0,0.08)] z-40">
      <div className="w-full max-w-md md:max-w-none mx-auto px-6 md:px-8 py-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Totals Display */}
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex flex-col">
              <span className="text-xs text-zinc-500 font-medium">Total Expenses</span>
              <span className="text-lg font-semibold text-red-600">
                {isCalculating ? "Calculating..." : formatTotal(totals.totalExpenses)}
              </span>
            </div>

            <div className="flex flex-col">
              <span className="text-xs text-zinc-500 font-medium">Total Income</span>
              <span className="text-lg font-semibold text-green-600">
                {isCalculating ? "Calculating..." : formatTotal(totals.totalIncome)}
              </span>
            </div>

            <div className="flex flex-col">
              <span className="text-xs text-zinc-500 font-medium">Net</span>
              <span className={`text-lg font-semibold ${
                totals.totalIncome - totals.totalExpenses >= 0 ? "text-green-600" : "text-red-600"
              }`}>
                {isCalculating ? "Calculating..." : formatTotal(totals.totalIncome - totals.totalExpenses)}
              </span>
            </div>
          </div>

          {/* Currency Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 font-medium">Currency:</span>
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
                className="h-8 px-3 text-xs font-medium"
              >
                USD
              </ToggleGroupItem>
              <ToggleGroupItem
                value="THB"
                aria-label="Show totals in THB"
                className="h-8 px-3 text-xs font-medium"
              >
                THB
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AllTransactionsPage() {
  const { user } = useAuth()
  const {
    transactions,
    loading,
    error,
    createTransaction,
    updateTransaction,
    updateTransactionTags,
    deleteTransaction,
    bulkDeleteTransactions,
    bulkUpdateTransactions,
    bulkUpdateDescriptions,
    refetch
  } = useTransactions()

  // User profile state
  const [userProfile, setUserProfile] = React.useState<{
    fullName: string
    email: string
    initials: string
  } | null>(null)

  const [viewMode, setViewMode] = React.useState<ViewMode>("recorded")
  const [layoutMode, setLayoutMode] = React.useState<LayoutMode>("cards")
  const [desktopLayoutMode, setDesktopLayoutMode] = React.useState<LayoutMode>("table")
  const [isMobile, setIsMobile] = React.useState(false)
  const [totalsCurrency, setTotalsCurrency] = React.useState<TotalsCurrency>("USD")
  const [showExchangeRates, setShowExchangeRates] = React.useState<boolean>(false)
  const [conversionCurrency, setConversionCurrency] = React.useState<ConversionCurrency>("USD")
  const [filters, setFilters] = React.useState<TransactionFilters>({
    dateRange: getPresetRange('this-month'),
    datePreset: 'this-month',
    searchKeyword: "",
    vendorIds: [],
    paymentMethodIds: [],
    transactionType: "all",
  })
  const [showAdvancedFilters, setShowAdvancedFilters] = React.useState(false)
  const [showCustomDateRange, setShowCustomDateRange] = React.useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false)
  const [editingTransaction, setEditingTransaction] = React.useState<TransactionWithVendorAndPayment | null>(null)
  const [saving, setSaving] = React.useState(false)

  // Selection state
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [lastClickedIndex, setLastClickedIndex] = React.useState<number | null>(null)

  // Bulk edit modals state
  const [isBulkVendorModalOpen, setIsBulkVendorModalOpen] = React.useState(false)
  const [isBulkDateModalOpen, setIsBulkDateModalOpen] = React.useState(false)
  const [isBulkPaymentModalOpen, setIsBulkPaymentModalOpen] = React.useState(false)
  const [isBulkDescriptionModalOpen, setIsBulkDescriptionModalOpen] = React.useState(false)

  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false)

  // Fetch user profile data
  React.useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return

      const supabase = createClient()
      const { data } = await supabase
        .from('users')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single()

      const fullName = data?.first_name && data?.last_name
        ? `${data.first_name} ${data.last_name}`
        : data?.first_name || data?.last_name || user.email || "User"

      const getInitials = (firstName?: string | null, lastName?: string | null): string => {
        if (firstName && lastName) {
          return `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`
        }
        if (firstName) return firstName.charAt(0).toUpperCase()
        if (lastName) return lastName.charAt(0).toUpperCase()
        return "U"
      }

      const initials = getInitials(data?.first_name, data?.last_name)

      setUserProfile({
        fullName,
        email: user.email || '',
        initials
      })
    }

    fetchUserProfile()
  }, [user])
  const [deleteTarget, setDeleteTarget] = React.useState<{ type: 'single' | 'bulk', id?: string }>({ type: 'single' })
  const [isDeleting, setIsDeleting] = React.useState(false)

  const handleOpenEditModal = React.useCallback((transaction: TransactionWithVendorAndPayment) => {
    setEditingTransaction(transaction)
    setIsEditModalOpen(true)
  }, [])

  const handleSaveTransaction = async (formData: TransactionFormData) => {
    setSaving(true)

    try {
      const transactionData = {
        description: formData.description.trim() || undefined,
        vendorId: formData.vendor || undefined,
        paymentMethodId: formData.paymentMethod || undefined,
        tagIds: formData.tags || undefined,
        amount: parseFloat(formData.amount),
        originalCurrency: formData.currency,
        transactionType: formData.transactionType,
        transactionDate: format(formData.transactionDate, "yyyy-MM-dd")
      }

      const result = await createTransaction(transactionData)

      if (result) {
        toast.success("Transaction saved successfully!")
        setIsAddModalOpen(false)
      } else {
        toast.error("Failed to save transaction")
      }
    } catch (error) {
      toast.error(`Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveAndAddAnother = async (formData: TransactionFormData): Promise<boolean> => {
    setSaving(true)

    try {
      const transactionData = {
        description: formData.description.trim() || undefined,
        vendorId: formData.vendor || undefined,
        paymentMethodId: formData.paymentMethod || undefined,
        tagIds: formData.tags || undefined,
        amount: parseFloat(formData.amount),
        originalCurrency: formData.currency,
        transactionType: formData.transactionType,
        transactionDate: format(formData.transactionDate, "yyyy-MM-dd")
      }

      const result = await createTransaction(transactionData)

      if (result) {
        toast.success("Transaction saved successfully!")
        return true
      } else {
        toast.error("Failed to save transaction")
        return false
      }
    } catch (error) {
      toast.error(`Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return false
    } finally {
      setSaving(false)
    }
  }

  const handleCancelTransaction = () => {
    toast.info("Transaction discarded")
    setIsAddModalOpen(false)
  }

  const handleUpdateTransaction = async (formData: TransactionFormData) => {
    if (!editingTransaction) return

    setSaving(true)

    try {
      const transactionData = {
        description: formData.description.trim() || null,
        vendor_id: formData.vendor || null,
        payment_method_id: formData.paymentMethod || null,
        amount: parseFloat(formData.amount),
        original_currency: formData.currency,
        transaction_type: formData.transactionType,
        transaction_date: format(formData.transactionDate, "yyyy-MM-dd")
      }

      const success = await updateTransaction(editingTransaction.id, transactionData)

      if (success) {
        // Update tags separately
        if (formData.tags) {
          await updateTransactionTags(editingTransaction.id, formData.tags)
        }

        toast.success("Transaction updated successfully!")
        setIsEditModalOpen(false)
        setEditingTransaction(null)

        // Refetch to get updated data
        await refetch()
      } else {
        toast.error("Failed to update transaction")
      }
    } catch (error) {
      toast.error(`Failed to update: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEditTransaction = () => {
    toast.info("Changes discarded")
    setIsEditModalOpen(false)
    setEditingTransaction(null)
  }

  // Handle responsive layout: force card view on mobile, remember preference on desktop
  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 768px)')

    const handleMediaChange = (e: MediaQueryListEvent | MediaQueryList) => {
      const isDesktop = e.matches
      setIsMobile(!isDesktop)

      if (isDesktop) {
        // Restore desktop preference when switching back to desktop/tablet
        setLayoutMode(desktopLayoutMode)
      } else {
        // Force card view on mobile
        setLayoutMode('cards')
      }
    }

    // Initial check
    handleMediaChange(mediaQuery)

    // Listen for changes
    mediaQuery.addEventListener('change', handleMediaChange)

    return () => mediaQuery.removeEventListener('change', handleMediaChange)
  }, [desktopLayoutMode])

  // Handle layout mode changes - save desktop preference
  const handleLayoutModeChange = (mode: LayoutMode) => {
    setLayoutMode(mode)
    // Only save preference when on desktop/tablet
    if (!isMobile) {
      setDesktopLayoutMode(mode)
    }
  }

  // Quick filter handlers
  const handlePresetChange = (preset: DatePresetKey) => {
    const range = getPresetRange(preset)
    setFilters({
      ...filters,
      dateRange: range,
      datePreset: preset,
    })
  }

  const handleTransactionTypeChange = (type: TransactionType) => {
    setFilters({ ...filters, transactionType: type })
  }

  const handleRemoveDateRange = () => {
    setFilters({
      ...filters,
      dateRange: undefined,
      datePreset: 'all-time',
    })
  }

  const handleRemoveTransactionType = () => {
    setFilters({ ...filters, transactionType: 'all' })
  }

  const handleRemoveSearchKeyword = () => {
    setFilters({ ...filters, searchKeyword: "" })
  }

  const handleRemoveVendor = (vendorId: string) => {
    setFilters({
      ...filters,
      vendorIds: filters.vendorIds.filter(id => id !== vendorId)
    })
  }

  const handleRemovePaymentMethod = (paymentMethodId: string) => {
    setFilters({
      ...filters,
      paymentMethodIds: filters.paymentMethodIds.filter(id => id !== paymentMethodId)
    })
  }

  const handleRemoveAllVendors = () => {
    setFilters({ ...filters, vendorIds: [] })
  }

  const handleRemoveAllPaymentMethods = () => {
    setFilters({ ...filters, paymentMethodIds: [] })
  }

  const handleClearAll = () => {
    setFilters({
      dateRange: undefined,
      datePreset: 'all-time',
      searchKeyword: "",
      vendorIds: [],
      paymentMethodIds: [],
      transactionType: "all",
    })
    setShowAdvancedFilters(false)
  }

  const handleApplyAdvancedFilters = (newFilters: Partial<TransactionFilters>) => {
    setFilters({ ...filters, ...newFilters })
  }

  const handleCustomRangeClick = () => {
    setShowCustomDateRange(true)
  }

  // Check if any filters are active
  const hasActiveFilters = filters.dateRange || filters.searchKeyword ||
    filters.vendorIds.length > 0 || filters.paymentMethodIds.length > 0 || filters.transactionType !== "all"

  // Check if there are transactions without payment methods (for "None" option)
  const [hasNoneTransactions, setHasNoneTransactions] = React.useState(false)

  // Query database for accurate count of transactions without payment methods
  React.useEffect(() => {
    const checkForNoneTransactions = async () => {
      if (!user) return

      const supabase = createClient()
      const { count } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .is('payment_method_id', null)
        .eq('user_id', user.id)

      setHasNoneTransactions((count ?? 0) > 0)
    }

    checkForNoneTransactions()
  }, [user])

  // Extract unique vendors and payment methods
  const { uniqueVendors, uniquePaymentMethods } = React.useMemo(() => {
    const vendorMap = new Map<string, { id: string; name: string }>()
    const paymentMethodMap = new Map<string, { id: string; name: string }>()

    transactions.forEach((transaction) => {
      if (transaction.vendors && !vendorMap.has(transaction.vendors.id)) {
        vendorMap.set(transaction.vendors.id, {
          id: transaction.vendors.id,
          name: transaction.vendors.name,
        })
      }

      if (transaction.payment_methods && !paymentMethodMap.has(transaction.payment_methods.id)) {
        paymentMethodMap.set(transaction.payment_methods.id, {
          id: transaction.payment_methods.id,
          name: transaction.payment_methods.name,
        })
      }
    })

    const paymentMethods = Array.from(paymentMethodMap.values()).sort((a, b) => a.name.localeCompare(b.name))

    // Add "None" option if there are transactions without a payment method in the database
    if (hasNoneTransactions) {
      paymentMethods.unshift({ id: "none", name: "None" })
    }

    return {
      uniqueVendors: Array.from(vendorMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
      uniquePaymentMethods: paymentMethods,
    }
  }, [transactions, hasNoneTransactions])

  // Apply filters to transactions
  const filteredTransactions = React.useMemo(() => {
    return transactions.filter((transaction) => {
      // Transaction type filter
      if (filters.transactionType !== "all") {
        if (transaction.transaction_type !== filters.transactionType) {
          return false
        }
      }

      // Date range filter
      if (filters.dateRange) {
        const transactionDate = parseISO(transaction.transaction_date)
        const { from, to } = filters.dateRange

        if (from && to) {
          // Date range selection
          const isInRange = isWithinInterval(transactionDate, {
            start: startOfDay(from),
            end: endOfDay(to),
          })
          if (!isInRange) return false
        } else if (from) {
          // Single date selection (only 'from' is set)
          const isSameDay = isWithinInterval(transactionDate, {
            start: startOfDay(from),
            end: endOfDay(from),
          })
          if (!isSameDay) return false
        }
      }

      // Search keyword filter
      if (filters.searchKeyword) {
        const keyword = filters.searchKeyword.toLowerCase()
        const description = (transaction.description || "").toLowerCase()
        if (!description.includes(keyword)) return false
      }

      // Vendor filter
      if (filters.vendorIds.length > 0) {
        if (!transaction.vendor_id || !filters.vendorIds.includes(transaction.vendor_id)) {
          return false
        }
      }

      // Payment method filter
      if (filters.paymentMethodIds.length > 0) {
        const hasNoneFilter = filters.paymentMethodIds.includes("none")
        const matchesNone = !transaction.payment_method_id && hasNoneFilter
        const matchesPaymentMethod = transaction.payment_method_id && filters.paymentMethodIds.includes(transaction.payment_method_id)

        if (!matchesNone && !matchesPaymentMethod) {
          return false
        }
      }

      return true
    })
  }, [transactions, filters])

  // Group filtered transactions by date for card view
  const groupedTransactions = React.useMemo(() => {
    const groups: Record<string, TransactionWithVendorAndPayment[]> = {}

    filteredTransactions.forEach((transaction) => {
      const date = transaction.transaction_date
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(transaction)
    })

    // Sort dates in descending order (most recent first)
    const sortedDates = Object.keys(groups).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

    return sortedDates.map(date => ({
      date,
      transactions: groups[date]
    }))
  }, [filteredTransactions])

  // Selection handlers
  const handleToggleSelection = React.useCallback((id: string, shiftKey: boolean, ctrlKey: boolean) => {
    const currentIndex = filteredTransactions.findIndex(t => t.id === id)

    if (shiftKey && lastClickedIndex !== null) {
      // Range selection
      const start = Math.min(lastClickedIndex, currentIndex)
      const end = Math.max(lastClickedIndex, currentIndex)
      const newSelection = new Set(selectedIds)

      for (let i = start; i <= end; i++) {
        newSelection.add(filteredTransactions[i].id)
      }

      setSelectedIds(newSelection)
    } else if (ctrlKey) {
      // Toggle individual with ctrl/cmd
      const newSelection = new Set(selectedIds)
      if (newSelection.has(id)) {
        newSelection.delete(id)
      } else {
        newSelection.add(id)
      }
      setSelectedIds(newSelection)
      setLastClickedIndex(currentIndex)
    } else {
      // Single click - toggle this row
      const newSelection = new Set(selectedIds)
      if (newSelection.has(id)) {
        newSelection.delete(id)
      } else {
        newSelection.add(id)
      }
      setSelectedIds(newSelection)
      setLastClickedIndex(currentIndex)
    }
  }, [filteredTransactions, selectedIds, lastClickedIndex])

  const handleToggleAll = React.useCallback(() => {
    if (selectedIds.size === filteredTransactions.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredTransactions.map(t => t.id)))
    }
  }, [filteredTransactions, selectedIds])

  const handleClearSelection = React.useCallback(() => {
    setSelectedIds(new Set())
    setLastClickedIndex(null)
  }, [])

  // Delete handlers
  const handleDeleteSingle = React.useCallback((id: string) => {
    setDeleteTarget({ type: 'single', id })
    setDeleteConfirmOpen(true)
  }, [])

  const handleDeleteBulk = React.useCallback(() => {
    if (selectedIds.size === 0) {
      toast.error("No transactions selected")
      return
    }
    setDeleteTarget({ type: 'bulk' })
    setDeleteConfirmOpen(true)
  }, [selectedIds])

  const handleConfirmDelete = async () => {
    setIsDeleting(true)

    try {
      if (deleteTarget.type === 'single' && deleteTarget.id) {
        const success = await deleteTransaction(deleteTarget.id)
        if (success) {
          toast.success("Transaction deleted successfully")
          setDeleteConfirmOpen(false)
        } else {
          toast.error("Failed to delete transaction")
        }
      } else if (deleteTarget.type === 'bulk') {
        const ids = Array.from(selectedIds)
        const success = await bulkDeleteTransactions(ids)
        if (success) {
          toast.success(`${ids.length} transaction${ids.length > 1 ? 's' : ''} deleted successfully`)
          setSelectedIds(new Set())
          setDeleteConfirmOpen(false)
        } else {
          toast.error("Failed to delete transactions")
        }
      }
    } finally {
      setIsDeleting(false)
    }
  }

  // Bulk edit handlers
  const handleBulkEditVendor = async (vendorId: string) => {
    setSaving(true)
    try {
      const ids = Array.from(selectedIds)
      const success = await bulkUpdateTransactions(ids, { vendor_id: vendorId })
      if (success) {
        toast.success(`Updated vendor for ${ids.length} transaction${ids.length > 1 ? 's' : ''}`)
        setIsBulkVendorModalOpen(false)
        await refetch()
      } else {
        toast.error("Failed to update vendor")
      }
    } finally {
      setSaving(false)
    }
  }

  const handleBulkEditDate = async (date: Date) => {
    setSaving(true)
    try {
      const ids = Array.from(selectedIds)
      const success = await bulkUpdateTransactions(ids, {
        transaction_date: format(date, "yyyy-MM-dd")
      })
      if (success) {
        toast.success(`Updated date for ${ids.length} transaction${ids.length > 1 ? 's' : ''}`)
        setIsBulkDateModalOpen(false)
        await refetch()
      } else {
        toast.error("Failed to update date")
      }
    } finally {
      setSaving(false)
    }
  }

  const handleBulkEditPaymentMethod = async (paymentMethodId: string) => {
    setSaving(true)
    try {
      const ids = Array.from(selectedIds)
      const success = await bulkUpdateTransactions(ids, { payment_method_id: paymentMethodId })
      if (success) {
        toast.success(`Updated payment method for ${ids.length} transaction${ids.length > 1 ? 's' : ''}`)
        setIsBulkPaymentModalOpen(false)
        await refetch()
      } else {
        toast.error("Failed to update payment method")
      }
    } finally {
      setSaving(false)
    }
  }

  const handleBulkEditDescription = async (mode: "prepend" | "append" | "replace", text: string) => {
    setSaving(true)
    try {
      const ids = Array.from(selectedIds)
      const success = await bulkUpdateDescriptions(ids, mode, text)
      if (success) {
        toast.success(`Updated description for ${ids.length} transaction${ids.length > 1 ? 's' : ''}`)
        setIsBulkDescriptionModalOpen(false)
        await refetch()
      } else {
        toast.error("Failed to update description")
      }
    } finally {
      setSaving(false)
    }
  }

  // Loading, error, and empty states remain simple without affecting design fidelity
  if (loading || error || transactions.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <div className="w-full max-w-md md:max-w-none mx-auto bg-white flex flex-col gap-6 min-h-screen pb-32 pt-6 md:pt-12 px-6 md:px-8">
          {/* Header with Navigation */}
          <div className="flex flex-col gap-4 w-full">
            <div className="flex items-center justify-between w-full">
              <h1 className="text-[36px] font-medium text-foreground leading-[40px]">
                All transactions
              </h1>
              <div className="flex items-center gap-3">
                <ViewLayoutToggle layoutMode={layoutMode} onLayoutModeChange={handleLayoutModeChange} />
                <ViewController viewMode={viewMode} onViewModeChange={setViewMode} />
                <Button
                  onClick={() => setIsAddModalOpen(true)}
                  className="hidden md:flex gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg h-10"
                >
                  <Plus className="size-5" />
                  <span className="text-[14px] font-medium leading-[20px]">
                    Add transaction
                  </span>
                </Button>
              </div>
            </div>
            {/* Navigation Bar - Mobile/Tablet only */}
            <div className="lg:hidden">
              <MainNavigation />
            </div>
          </div>
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-zinc-200 border-t-zinc-950 rounded-full animate-spin"></div>
            </div>
          )}
          {error && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-zinc-500">Failed to load transactions: {error}</p>
            </div>
          )}
          {transactions.length === 0 && !loading && !error && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-zinc-500">No transactions found.</p>
            </div>
          )}
        </div>
        <AddTransactionFooter />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Sidebar Navigation - Desktop only */}
      {userProfile && (
        <SidebarNavigation user={userProfile} />
      )}

      {/* Main Content Area with sidebar offset */}
      <main className="lg:ml-[240px]">
        <div className="w-full max-w-md md:max-w-none mx-auto bg-white flex flex-col gap-6 min-h-screen pb-32 pt-6 md:pt-12 px-6 md:px-8">
          {/* Header with Navigation */}
          <div className="flex flex-col gap-4 w-full">
            <div className="flex items-center justify-between w-full">
              <h1 className="text-[36px] font-medium text-foreground leading-[40px]">
                All transactions
              </h1>
              <div className="flex items-center gap-3">
                <ViewLayoutToggle layoutMode={layoutMode} onLayoutModeChange={handleLayoutModeChange} />
                <ViewController viewMode={viewMode} onViewModeChange={setViewMode} />
                <Button
                  onClick={() => setIsAddModalOpen(true)}
                  className="hidden md:flex gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg h-10"
                >
                  <Plus className="size-5" />
                  <span className="text-[14px] font-medium leading-[20px]">
                    Add transaction
                  </span>
                </Button>
              </div>
            </div>
            {/* Navigation Bar - Mobile/Tablet only */}
            <div className="lg:hidden">
              <MainNavigation />
            </div>
          </div>

        {/* Quick Filter Bar - Always visible */}
        <QuickFilterBar
          activePreset={filters.datePreset || null}
          activeTransactionType={filters.transactionType}
          onPresetChange={handlePresetChange}
          onTransactionTypeChange={handleTransactionTypeChange}
          onMoreFiltersClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          onCustomRangeClick={handleCustomRangeClick}
        />

        {/* Active Filter Chips - Shows when filters are active */}
        <ActiveFilterChips
          dateRange={filters.dateRange}
          transactionType={filters.transactionType}
          searchKeyword={filters.searchKeyword}
          vendorIds={filters.vendorIds}
          paymentMethodIds={filters.paymentMethodIds}
          vendors={uniqueVendors}
          paymentMethods={uniquePaymentMethods}
          onRemoveDateRange={handleRemoveDateRange}
          onRemoveTransactionType={handleRemoveTransactionType}
          onRemoveSearchKeyword={handleRemoveSearchKeyword}
          onRemoveVendor={handleRemoveVendor}
          onRemovePaymentMethod={handleRemovePaymentMethod}
          onRemoveAllVendors={handleRemoveAllVendors}
          onRemoveAllPaymentMethods={handleRemoveAllPaymentMethods}
          onClearAll={handleClearAll}
          resultCount={filteredTransactions.length}
        />

        {/* Advanced Filters Panel - Modal/Bottom Sheet */}
        <AdvancedFiltersPanel
          isOpen={showAdvancedFilters}
          onClose={() => setShowAdvancedFilters(false)}
          filters={filters}
          onApplyFilters={handleApplyAdvancedFilters}
          vendors={uniqueVendors}
          paymentMethods={uniquePaymentMethods}
        />

        {/* Custom Date Range Modal */}
        {showCustomDateRange && (
          <Dialog open={showCustomDateRange} onOpenChange={setShowCustomDateRange}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-xl font-medium text-zinc-950">
                  Select Custom Date Range
                </DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <DateRangePicker
                  dateRange={filters.dateRange}
                  onDateRangeChange={(range) => {
                    setFilters({
                      ...filters,
                      dateRange: range,
                      datePreset: 'custom'
                    })
                    setShowCustomDateRange(false)
                  }}
                  placeholder="Pick a custom date range..."
                />
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Show exchange rates toggle only in table view */}
        {layoutMode === "table" && (
          <ExchangeRatesToggle
            showExchangeRates={showExchangeRates}
            onToggle={() => setShowExchangeRates(!showExchangeRates)}
            conversionCurrency={conversionCurrency}
            onConversionCurrencyChange={setConversionCurrency}
          />
        )}

        {layoutMode === "cards" ? (
          <div className="flex flex-col gap-6 w-full">
            {groupedTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-sm text-zinc-500">No transactions found matching the filters.</p>
              </div>
            ) : (
              groupedTransactions.map(({ date, transactions: dayTransactions }) => (
                <React.Fragment key={date}>
                  <TransactionGroup
                    date={date}
                    transactions={dayTransactions}
                    viewMode={viewMode}
                    isMobile={isMobile}
                    onEditTransaction={handleOpenEditModal}
                  />
                </React.Fragment>
              ))
            )}
          </div>
        ) : (
          <TransactionsTable
            transactions={filteredTransactions}
            viewMode={viewMode}
            showExchangeRates={showExchangeRates}
            conversionCurrency={conversionCurrency}
            isMobile={isMobile}
            selectedIds={selectedIds}
            onToggleSelection={handleToggleSelection}
            onToggleAll={handleToggleAll}
            onEditTransaction={handleOpenEditModal}
            onDeleteTransaction={handleDeleteSingle}
          />
        )}
      </div>

      {/* Bulk Edit Toolbar - shows when items are selected in table view */}
      {layoutMode === "table" && selectedIds.size > 0 && (
        <BulkEditToolbar
          selectedCount={selectedIds.size}
          selectedTransactions={filteredTransactions.filter(t => selectedIds.has(t.id))}
          totalsCurrency={totalsCurrency}
          onTotalsCurrencyChange={setTotalsCurrency}
          onClearSelection={handleClearSelection}
          onEditVendor={() => setIsBulkVendorModalOpen(true)}
          onEditDate={() => setIsBulkDateModalOpen(true)}
          onEditPaymentMethod={() => setIsBulkPaymentModalOpen(true)}
          onEditDescription={() => setIsBulkDescriptionModalOpen(true)}
          onDelete={handleDeleteBulk}
        />
      )}

      {/* Show totals footer when filters are active and no selection, otherwise show add transaction footer */}
      {!selectedIds.size && hasActiveFilters ? (
        <TotalsFooter
          transactions={filteredTransactions}
          totalsCurrency={totalsCurrency}
          onTotalsCurrencyChange={setTotalsCurrency}
        />
      ) : !selectedIds.size ? (
        <AddTransactionFooter />
      ) : null}

      {/* Add Transaction Modal (Desktop only) */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-medium text-zinc-950">
              Add transaction
            </DialogTitle>
          </DialogHeader>
          <TransactionForm
            mode="add"
            onSave={handleSaveTransaction}
            onSaveAndAddAnother={handleSaveAndAddAnother}
            onCancel={handleCancelTransaction}
            saving={saving}
            showDateStepper={true}
            useStandardAmountInput={false}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Transaction Modal (Desktop only) */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-medium text-zinc-950">
              Edit transaction
            </DialogTitle>
          </DialogHeader>
          {editingTransaction && (
            <TransactionForm
              mode="edit"
              initialData={{
                currency: editingTransaction.original_currency,
                transactionType: editingTransaction.transaction_type,
                vendor: editingTransaction.vendor_id || "",
                paymentMethod: editingTransaction.payment_method_id || "",
                tags: editingTransaction.tags?.map(tag => tag.id) || [],
                description: editingTransaction.description || "",
                amount: editingTransaction.amount.toFixed(2),
                transactionDate: parseISO(editingTransaction.transaction_date)
              }}
              onSave={handleUpdateTransaction}
              onCancel={handleCancelEditTransaction}
              saving={saving}
              showDateStepper={true}
              useStandardAmountInput={false}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Edit Modals */}
      <BulkEditVendorModal
        open={isBulkVendorModalOpen}
        onOpenChange={setIsBulkVendorModalOpen}
        onConfirm={handleBulkEditVendor}
        saving={saving}
      />

      <BulkEditDateModal
        open={isBulkDateModalOpen}
        onOpenChange={setIsBulkDateModalOpen}
        onConfirm={handleBulkEditDate}
        saving={saving}
      />

      <BulkEditPaymentMethodModal
        open={isBulkPaymentModalOpen}
        onOpenChange={setIsBulkPaymentModalOpen}
        onConfirm={handleBulkEditPaymentMethod}
        saving={saving}
      />

      <BulkEditDescriptionModal
        open={isBulkDescriptionModalOpen}
        onOpenChange={setIsBulkDescriptionModalOpen}
        onConfirm={handleBulkEditDescription}
        saving={saving}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={handleConfirmDelete}
        title={deleteTarget.type === 'bulk'
          ? `Delete ${selectedIds.size} Transaction${selectedIds.size > 1 ? 's' : ''}?`
          : "Delete Transaction?"
        }
        description={
          deleteTarget.type === 'bulk'
            ? `This action cannot be undone. This will permanently delete ${selectedIds.size} transaction${selectedIds.size > 1 ? 's' : ''} from your records.`
            : "This action cannot be undone. This will permanently delete the transaction from your records."
        }
        isDeleting={isDeleting}
      />
      </main>
    </div>
  )
}