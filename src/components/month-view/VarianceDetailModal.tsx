"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { getCurrencySymbolSync } from "@/lib/utils/currency-symbols"
import { TrendingUp, TrendingDown, Download } from "lucide-react"
import type { VarianceReport } from "@/lib/types/recurring-transactions"
import type { CurrencyType } from "@/lib/supabase/types"

export interface VarianceDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  varianceReport: VarianceReport | null
  loading?: boolean
}

/**
 * Modal showing detailed variance breakdown
 * Organized by category (tags), vendor, and largest variances
 */
export function VarianceDetailModal({
  open,
  onOpenChange,
  varianceReport,
  loading = false,
}: VarianceDetailModalProps) {
  if (!varianceReport && !loading) return null

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log("Export variance report")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Variance Report</DialogTitle>
              <DialogDescription>
                {varianceReport
                  ? `Detailed breakdown for ${varianceReport.month_year}`
                  : "Loading..."}
              </DialogDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="size-4 mr-2" />
              Export
            </Button>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-sm text-zinc-500">
            Loading variance report...
          </div>
        ) : varianceReport ? (
          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="category">By Category</TabsTrigger>
              <TabsTrigger value="vendor">By Vendor</TabsTrigger>
              <TabsTrigger value="largest">Largest</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="mt-4">
              <SummaryTab summary={varianceReport.summary} />
            </TabsContent>

            <TabsContent value="category" className="mt-4">
              <CategoryTab categories={varianceReport.by_category} />
            </TabsContent>

            <TabsContent value="vendor" className="mt-4">
              <VendorTab vendors={varianceReport.by_vendor} />
            </TabsContent>

            <TabsContent value="largest" className="mt-4">
              <LargestVariancesTab variances={varianceReport.largest_variances} />
            </TabsContent>
          </Tabs>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function SummaryTab({ summary }: { summary: VarianceReport["summary"] }) {
  const currencies = new Set([
    ...Object.keys(summary.total_expected_expenses),
    ...Object.keys(summary.total_actual_expenses),
  ]) as Set<CurrencyType>

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-4 pr-4">
        {Array.from(currencies).map((currency) => {
          const expectedExpenses = summary.total_expected_expenses[currency] || 0
          const actualExpenses = summary.total_actual_expenses[currency] || 0
          const expectedIncome = summary.total_expected_income[currency] || 0
          const actualIncome = summary.total_actual_income[currency] || 0
          const variance = summary.total_variance[currency] || 0
          const variancePercentage = summary.variance_percentage[currency] || 0

          return (
            <div key={currency} className="border rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-sm text-zinc-900 flex items-center gap-2">
                {currency}
                <Badge variant={variancePercentage > 0 ? "destructive" : "default"}>
                  {variancePercentage > 0 ? "+" : ""}
                  {variancePercentage.toFixed(1)}%
                </Badge>
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <VarianceMetric
                  label="Expected Expenses"
                  expected={expectedExpenses}
                  actual={actualExpenses}
                  currency={currency}
                  type="expense"
                />
                <VarianceMetric
                  label="Expected Income"
                  expected={expectedIncome}
                  actual={actualIncome}
                  currency={currency}
                  type="income"
                />
              </div>

              <div className="border-t pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-zinc-700">Total Variance</span>
                  <span
                    className={cn(
                      "text-lg font-semibold",
                      variance > 0 ? "text-red-600" : "text-green-600"
                    )}
                  >
                    {variance > 0 ? "+" : ""}
                    {getCurrencySymbolSync(currency)}
                    {Math.abs(variance).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </ScrollArea>
  )
}

function CategoryTab({ categories }: { categories: VarianceReport["by_category"] }) {
  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-2 pr-4">
        {categories.length === 0 ? (
          <div className="text-center py-8 text-sm text-zinc-500">
            No category data available
          </div>
        ) : (
          categories.map((category) => {
            const primaryCurrency = Object.keys(category.expected)[0] as CurrencyType
            const expected = category.expected[primaryCurrency] || 0
            const actual = category.actual[primaryCurrency] || 0
            const variance = category.variance[primaryCurrency] || 0

            return (
              <div key={category.tag.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="size-3 rounded-full"
                      style={{ backgroundColor: category.tag.color }}
                    />
                    <span className="font-medium text-sm">{category.tag.name}</span>
                  </div>
                  <Badge
                    variant={category.variance_percentage > 0 ? "destructive" : "default"}
                    className="text-xs"
                  >
                    {category.variance_percentage > 0 ? "+" : ""}
                    {category.variance_percentage.toFixed(0)}%
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-zinc-500">Expected</div>
                    <div className="font-semibold">
                      {getCurrencySymbolSync(primaryCurrency)}
                      {expected.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                  <div>
                    <div className="text-zinc-500">Actual</div>
                    <div className="font-semibold">
                      {getCurrencySymbolSync(primaryCurrency)}
                      {actual.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                  <div>
                    <div className="text-zinc-500">Variance</div>
                    <div
                      className={cn(
                        "font-semibold",
                        variance > 0 ? "text-red-600" : "text-green-600"
                      )}
                    >
                      {variance > 0 ? "+" : ""}
                      {getCurrencySymbolSync(primaryCurrency)}
                      {Math.abs(variance).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </ScrollArea>
  )
}

function VendorTab({ vendors }: { vendors: VarianceReport["by_vendor"] }) {
  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-2 pr-4">
        {vendors.length === 0 ? (
          <div className="text-center py-8 text-sm text-zinc-500">
            No vendor data available
          </div>
        ) : (
          vendors.map((vendor) => {
            const primaryCurrency = Object.keys(vendor.expected)[0] as CurrencyType
            const expected = vendor.expected[primaryCurrency] || 0
            const actual = vendor.actual[primaryCurrency] || 0
            const variance = vendor.variance[primaryCurrency] || 0

            return (
              <div key={vendor.vendor.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{vendor.vendor.name}</span>
                  <Badge
                    variant={vendor.variance_percentage > 0 ? "destructive" : "default"}
                    className="text-xs"
                  >
                    {vendor.variance_percentage > 0 ? "+" : ""}
                    {vendor.variance_percentage.toFixed(0)}%
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-zinc-500">Expected</div>
                    <div className="font-semibold">
                      {getCurrencySymbolSync(primaryCurrency)}
                      {expected.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                  <div>
                    <div className="text-zinc-500">Actual</div>
                    <div className="font-semibold">
                      {getCurrencySymbolSync(primaryCurrency)}
                      {actual.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                  <div>
                    <div className="text-zinc-500">Variance</div>
                    <div
                      className={cn(
                        "font-semibold",
                        variance > 0 ? "text-red-600" : "text-green-600"
                      )}
                    >
                      {variance > 0 ? "+" : ""}
                      {getCurrencySymbolSync(primaryCurrency)}
                      {Math.abs(variance).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </ScrollArea>
  )
}

function LargestVariancesTab({ variances }: { variances: VarianceReport["largest_variances"] }) {
  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-2 pr-4">
        {variances.length === 0 ? (
          <div className="text-center py-8 text-sm text-zinc-500">
            No variances to display
          </div>
        ) : (
          variances.map((item, index) => {
            const { expected_transaction, variance_amount, variance_percentage } = item
            const currency = expected_transaction.original_currency

            return (
              <div key={expected_transaction.id} className="border rounded-lg p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-zinc-400">#{index + 1}</span>
                      <span className="font-medium text-sm truncate">
                        {expected_transaction.vendor?.name || expected_transaction.description}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2 text-xs">
                      <span className="text-zinc-500">Expected:</span>
                      <span className="font-semibold">
                        {getCurrencySymbolSync(currency)}
                        {expected_transaction.expected_amount.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={cn(
                        "text-sm font-semibold mb-1",
                        variance_amount > 0 ? "text-red-600" : "text-green-600"
                      )}
                    >
                      {variance_amount > 0 ? (
                        <TrendingUp className="size-3 inline mr-1" />
                      ) : (
                        <TrendingDown className="size-3 inline mr-1" />
                      )}
                      {variance_amount > 0 ? "+" : ""}
                      {getCurrencySymbolSync(currency)}
                      {Math.abs(variance_amount).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                    <Badge
                      variant={variance_percentage > 0 ? "destructive" : "default"}
                      className="text-xs"
                    >
                      {variance_percentage > 0 ? "+" : ""}
                      {variance_percentage.toFixed(0)}%
                    </Badge>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </ScrollArea>
  )
}

function VarianceMetric({
  label,
  expected,
  actual,
  currency,
  type,
}: {
  label: string
  expected: number
  actual: number
  currency: CurrencyType
  type: "expense" | "income"
}) {
  const variance = actual - expected
  const variancePercentage = expected !== 0 ? (variance / expected) * 100 : 0

  return (
    <div>
      <div className="text-xs text-zinc-500 mb-1">{label}</div>
      <div className="space-y-1">
        <div className="text-sm">
          <span className="text-zinc-600">Expected: </span>
          <span className="font-semibold">
            {getCurrencySymbolSync(currency)}
            {expected.toLocaleString("en-US", { maximumFractionDigits: 0 })}
          </span>
        </div>
        <div className="text-sm">
          <span className="text-zinc-600">Actual: </span>
          <span className="font-semibold">
            {getCurrencySymbolSync(currency)}
            {actual.toLocaleString("en-US", { maximumFractionDigits: 0 })}
          </span>
        </div>
        {variance !== 0 && (
          <div
            className={cn(
              "text-xs font-medium",
              variance > 0 && type === "expense" && "text-red-600",
              variance < 0 && type === "expense" && "text-green-600",
              variance > 0 && type === "income" && "text-green-600",
              variance < 0 && type === "income" && "text-red-600"
            )}
          >
            {variance > 0 ? "+" : ""}
            {getCurrencySymbolSync(currency)}
            {Math.abs(variance).toLocaleString("en-US", { maximumFractionDigits: 0 })} (
            {variancePercentage > 0 ? "+" : ""}
            {variancePercentage.toFixed(0)}%)
          </div>
        )}
      </div>
    </div>
  )
}
