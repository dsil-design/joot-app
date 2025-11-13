"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { getCurrencySymbolSync } from "@/lib/utils/currency-symbols"
import { TrendingDown, TrendingUp, DollarSign, Wallet } from "lucide-react"
import type { CurrencyType } from "@/lib/supabase/types"
import type { MonthPlanStats } from "@/lib/types/recurring-transactions"

export interface MonthViewSummaryCardsProps {
  stats: MonthPlanStats
  className?: string
}

/**
 * Display summary cards for month view
 * Shows 4 cards: Expected Income, Actual Income, Expected Expenses, Actual Expenses
 * Each card displays amounts by currency with variance indicators
 */
export function MonthViewSummaryCards({
  stats,
  className,
}: MonthViewSummaryCardsProps) {
  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4", className)}>
      <SummaryCard
        title="Expected Income"
        icon={TrendingUp}
        iconColor="text-green-600"
        amounts={stats.total_expected_income}
        variance={calculateVariance(
          stats.total_actual_income,
          stats.total_expected_income
        )}
        type="income"
      />
      <SummaryCard
        title="Actual Income"
        icon={Wallet}
        iconColor="text-green-600"
        amounts={stats.total_actual_income}
        type="income"
      />
      <SummaryCard
        title="Expected Expenses"
        icon={TrendingDown}
        iconColor="text-red-600"
        amounts={stats.total_expected_expenses}
        variance={calculateVariance(
          stats.total_actual_expenses,
          stats.total_expected_expenses
        )}
        type="expense"
      />
      <SummaryCard
        title="Actual Expenses"
        icon={DollarSign}
        iconColor="text-red-600"
        amounts={stats.total_actual_expenses}
        type="expense"
      />
    </div>
  )
}

interface SummaryCardProps {
  title: string
  icon: React.ElementType
  iconColor: string
  amounts: Partial<Record<CurrencyType, number>>
  variance?: VarianceData
  type: "income" | "expense"
}

interface VarianceData {
  amount: Partial<Record<CurrencyType, number>>
  percentage: number
  direction: "over" | "under" | "neutral"
}

function SummaryCard({
  title,
  icon: Icon,
  iconColor,
  amounts,
  variance,
  type,
}: SummaryCardProps) {
  const currencies = Object.keys(amounts) as CurrencyType[]
  const primaryCurrency = currencies[0] || "USD"

  return (
    <Card className="border-zinc-200 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
            {title}
          </CardTitle>
          <Icon className={cn("size-4", iconColor)} />
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        {/* Primary Amount */}
        <div className="space-y-1">
          {currencies.map((currency) => (
            <div key={currency} className="flex items-baseline justify-between">
              <span className={cn(
                "text-2xl font-semibold",
                type === "income" ? "text-green-600" : "text-red-600"
              )}>
                {getCurrencySymbolSync(currency)}
                {formatAmount(amounts[currency] || 0)}
              </span>
              {currencies.length > 1 && (
                <span className="text-xs text-zinc-500 ml-2">{currency}</span>
              )}
            </div>
          ))}
        </div>

        {/* Variance Indicator */}
        {variance && (
          <div className="mt-3 space-y-1">
            <div className={cn(
              "flex items-center gap-1 text-sm font-medium",
              variance.direction === "over" && type === "expense" && "text-amber-600",
              variance.direction === "under" && type === "expense" && "text-green-600",
              variance.direction === "over" && type === "income" && "text-green-600",
              variance.direction === "under" && type === "income" && "text-amber-600",
              variance.direction === "neutral" && "text-zinc-600"
            )}>
              {variance.percentage !== 0 && (
                <>
                  {variance.percentage > 0 ? (
                    <TrendingUp className="size-3" />
                  ) : (
                    <TrendingDown className="size-3" />
                  )}
                  <span>
                    {Math.abs(variance.percentage).toFixed(0)}%{" "}
                    {variance.direction === "over" ? "⚠" : "✓"}
                  </span>
                </>
              )}
            </div>
            {Object.entries(variance.amount).map(([currency, amount]) => (
              <div key={currency} className="text-xs text-zinc-600">
                {amount !== 0 && (
                  <>
                    {amount > 0 ? "+" : ""}
                    {getCurrencySymbolSync(currency as CurrencyType)}
                    {formatAmount(Math.abs(amount))}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Calculate variance between actual and expected amounts
 */
function calculateVariance(
  actual: Partial<Record<CurrencyType, number>>,
  expected: Partial<Record<CurrencyType, number>>
): VarianceData {
  const currencies = new Set([
    ...Object.keys(actual),
    ...Object.keys(expected),
  ]) as Set<CurrencyType>

  const varianceAmount: Partial<Record<CurrencyType, number>> = {}
  let totalVariance = 0
  let totalExpected = 0

  for (const currency of currencies) {
    const actualVal = actual[currency] || 0
    const expectedVal = expected[currency] || 0
    const diff = actualVal - expectedVal

    varianceAmount[currency] = diff
    totalVariance += diff
    totalExpected += expectedVal
  }

  const percentage = totalExpected !== 0 ? (totalVariance / totalExpected) * 100 : 0

  let direction: "over" | "under" | "neutral" = "neutral"
  if (percentage > 2) direction = "over"
  else if (percentage < -2) direction = "under"

  return {
    amount: varianceAmount,
    percentage,
    direction,
  }
}

/**
 * Format amount with appropriate decimal places
 */
function formatAmount(amount: number): string {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}
