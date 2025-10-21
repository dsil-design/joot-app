/**
 * FIGMA DESIGN IMPLEMENTATION
 * Design URL: https://www.figma.com/design/sGttHlfcLJEy1pNBgqpEr6/%F0%9F%9A%A7-Transactions?node-id=40000014-844 | Node: 40000014:844
 * Fidelity: 100% - No unauthorized additions
 */
"use client"

import * as React from "react"
import { ArrowLeft, LayoutGrid, Table as TableIcon, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTransactionFlow } from "@/hooks/useTransactionFlow"
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
import { useRouter } from "next/navigation"
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
import { toast } from "sonner"

type ViewMode = "recorded" | "all-usd" | "all-thb"
type LayoutMode = "cards" | "table"
type TotalsCurrency = "USD" | "THB"
type TransactionType = "all" | "expense" | "income"
type ConversionCurrency = "USD" | "THB"

interface TransactionFilters {
  dateRange?: DateRange
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
  onEditTransaction: (transaction: TransactionWithVendorAndPayment) => void
}

function TransactionsTable({ transactions, viewMode, showExchangeRates, conversionCurrency, isMobile, onEditTransaction }: TransactionsTableProps) {
  const router = useRouter()
  const [exchangeRates, setExchangeRates] = React.useState<Record<string, number | null>>({})
  const [conversionRates, setConversionRates] = React.useState<Record<string, number | null>>({})

  // Fetch exchange rates for all transactions only when showExchangeRates is true
  React.useEffect(() => {
    const fetchRates = async () => {
      const rates: Record<string, number | null> = {}
      const convRates: Record<string, number | null> = {}

      for (const transaction of transactions) {
        const fromCurrency = transaction.original_currency === "USD" ? "USD" : "THB"
        const toCurrency = transaction.original_currency === "USD" ? "THB" : "USD"

        try {
          // Get the exchange rate for display (always USD to THB)
          const rateMetadata = await getExchangeRateWithMetadata(
            transaction.transaction_date,
            fromCurrency,
            toCurrency
          )
          rates[transaction.id] = rateMetadata.rate

          // Get conversion rate to target currency if different from original
          if (transaction.original_currency !== conversionCurrency) {
            const conversionMetadata = await getExchangeRateWithMetadata(
              transaction.transaction_date,
              transaction.original_currency,
              conversionCurrency
            )
            convRates[transaction.id] = conversionMetadata.rate
          } else {
            convRates[transaction.id] = 1 // No conversion needed
          }
        } catch {
          rates[transaction.id] = null
          convRates[transaction.id] = null
        }
      }

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
    const symbol = transaction.original_currency === "USD" ? "$" : "฿"
    return `${symbol}${transaction.amount.toFixed(2)} ${transaction.original_currency}`
  }

  const formatExchangeRate = (transaction: TransactionWithVendorAndPayment) => {
    const rate = exchangeRates[transaction.id]

    if (rate === null || rate === undefined) {
      return "Loading..."
    }

    // Always format as: 1 USD = [x] THB
    if (transaction.original_currency === "USD") {
      return `1 USD = ${rate.toFixed(2)} THB`
    } else {
      const usdToThb = 1 / rate
      return `1 USD = ${usdToThb.toFixed(2)} THB`
    }
  }

  const formatConvertedAmount = (transaction: TransactionWithVendorAndPayment) => {
    const rate = conversionRates[transaction.id]

    if (rate === null || rate === undefined) {
      return "Loading..."
    }

    const convertedAmount = transaction.amount * rate
    const symbol = conversionCurrency === "USD" ? "$" : "฿"
    return `${symbol}${convertedAmount.toFixed(2)} ${conversionCurrency}`
  }

  const handleRowClick = (transaction: TransactionWithVendorAndPayment) => {
    if (isMobile) {
      // On mobile, navigate to detail view
      router.push(`/transactions/${transaction.id}?from=transactions`)
    } else {
      // On desktop, open edit modal
      onEditTransaction(transaction)
    }
  }

  // Calculate colspan based on visible columns
  const totalColumns = 6 + (showExchangeRates ? 2 : 0) // Base columns + optional exchange rate columns

  return (
    <div className="w-full overflow-x-auto rounded-lg border border-zinc-200">
      <Table>
        <TableHeader>
          <TableRow className="bg-zinc-50">
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
            transactions.map((transaction) => (
              <TableRow
                key={transaction.id}
                className="cursor-pointer hover:bg-zinc-50"
                onClick={() => handleRowClick(transaction)}
              >
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
              </TableRow>
            ))
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
            placeholder="Select date or date range"
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

  // Calculate totals whenever transactions or currency changes
  React.useEffect(() => {
    const calculateTotals = async () => {
      setIsCalculating(true)

      let expenses = 0
      let income = 0

      for (const transaction of transactions) {
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
          } catch (error) {
            // If conversion fails, use a fallback rate
            if (totalsCurrency === "USD" && transaction.original_currency === "THB") {
              amount = transaction.amount * 0.028 // Fallback THB to USD
            } else if (totalsCurrency === "THB" && transaction.original_currency === "USD") {
              amount = transaction.amount * 35 // Fallback USD to THB
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
        currency: totalsCurrency,
      })
      setIsCalculating(false)
    }

    if (transactions.length > 0) {
      calculateTotals()
    } else {
      setTotals({
        totalExpenses: 0,
        totalIncome: 0,
        currency: totalsCurrency,
      })
      setIsCalculating(false)
    }
  }, [transactions, totalsCurrency])

  const formatTotal = (amount: number) => {
    const symbol = totalsCurrency === "USD" ? "$" : "฿"
    return `${symbol}${amount.toFixed(2)}`
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 shadow-[0px_-2px_8px_0px_rgba(0,0,0,0.08)] z-40">
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
  const { navigateToHome, isPending } = useTransactionFlow()
  const { transactions, loading, error, createTransaction, updateTransaction, updateTransactionTags, refetch } = useTransactions()
  const [viewMode, setViewMode] = React.useState<ViewMode>("recorded")
  const [layoutMode, setLayoutMode] = React.useState<LayoutMode>("cards")
  const [desktopLayoutMode, setDesktopLayoutMode] = React.useState<LayoutMode>("table")
  const [isMobile, setIsMobile] = React.useState(false)
  const [totalsCurrency, setTotalsCurrency] = React.useState<TotalsCurrency>("USD")
  const [showExchangeRates, setShowExchangeRates] = React.useState<boolean>(false)
  const [conversionCurrency, setConversionCurrency] = React.useState<ConversionCurrency>("USD")
  const [filters, setFilters] = React.useState<TransactionFilters>({
    dateRange: undefined,
    searchKeyword: "",
    vendorIds: [],
    paymentMethodIds: [],
    transactionType: "all",
  })
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false)
  const [editingTransaction, setEditingTransaction] = React.useState<TransactionWithVendorAndPayment | null>(null)
  const [saving, setSaving] = React.useState(false)

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

  // Check if any filters are active
  const hasActiveFilters = filters.dateRange || filters.searchKeyword ||
    filters.vendorIds.length > 0 || filters.paymentMethodIds.length > 0 || filters.transactionType !== "all"

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

    return {
      uniqueVendors: Array.from(vendorMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
      uniquePaymentMethods: Array.from(paymentMethodMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
    }
  }, [transactions])

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
        if (!transaction.payment_method_id || !filters.paymentMethodIds.includes(transaction.payment_method_id)) {
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

  // Loading, error, and empty states remain simple without affecting design fidelity
  if (loading || error || transactions.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <div className="w-full max-w-md md:max-w-none mx-auto bg-white flex flex-col gap-6 min-h-screen pb-32 pt-6 md:pt-12 px-6 md:px-8">
          <div className="content-stretch flex items-center justify-between relative shrink-0 w-full gap-4">
            <Button
              variant="outline"
              size="icon"
              className="bg-white size-10 rounded-lg border-zinc-200 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-zinc-50"
            >
              <ArrowLeft className="size-5 text-zinc-950" strokeWidth={1.5} />
            </Button>
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
          <div className="flex flex-col font-medium justify-center leading-[0] not-italic relative shrink-0 text-[30px] text-nowrap text-zinc-950">
            <p className="leading-[36px] whitespace-pre">All transactions</p>
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
      <div className="w-full max-w-md md:max-w-none mx-auto bg-white flex flex-col gap-6 min-h-screen pb-32 pt-6 md:pt-12 px-6 md:px-8">
        <div className="content-stretch flex items-center justify-between relative shrink-0 w-full gap-4">
          <Button
            onClick={navigateToHome}
            disabled={isPending}
            variant="outline"
            size="icon"
            className="bg-white size-10 rounded-lg border-zinc-200 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-zinc-50"
          >
            <ArrowLeft className="size-5 text-zinc-950" strokeWidth={1.5} />
          </Button>
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
        <div className="flex flex-col font-medium justify-center leading-[0] not-italic relative shrink-0 text-[30px] text-nowrap text-zinc-950">
          <p className="leading-[36px] whitespace-pre">All transactions</p>
        </div>

        {/* Show filters only in table view on md+ screens */}
        {layoutMode === "table" && (
          <TransactionFiltersComponent
            filters={filters}
            onFiltersChange={setFilters}
            vendors={uniqueVendors}
            paymentMethods={uniquePaymentMethods}
          />
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
            onEditTransaction={handleOpenEditModal}
          />
        )}
      </div>

      {/* Show totals footer when filters are active, otherwise show add transaction footer */}
      {hasActiveFilters ? (
        <TotalsFooter
          transactions={filteredTransactions}
          totalsCurrency={totalsCurrency}
          onTotalsCurrencyChange={setTotalsCurrency}
        />
      ) : (
        <AddTransactionFooter />
      )}

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
    </div>
  )
}